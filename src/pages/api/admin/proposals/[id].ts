// src/pages/api/admin/proposals/[id].ts — HOD Executive Proposal Deletion & Cascade Clean-Up
import type { APIRoute } from "astro";
import fs from "fs";
import path from "path";
import { prisma } from "../../../../lib/prisma.js";
import { getAdminAuthUser, verifyAdminToken } from "../../../../lib/adminAuth.js";

export const DELETE: APIRoute = async ({ params, request, cookies, locals }) => {
  // 1. Verify HOD / Executive Authentication
  const adminUser =
    locals.adminUser ||
    getAdminAuthUser(request) ||
    (cookies.get("admin_session_token")?.value
      ? verifyAdminToken(cookies.get("admin_session_token")!.value)
      : null) ||
    (cookies.get("admin_session")?.value
      ? verifyAdminToken(cookies.get("admin_session")!.value)
      : null);

  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return new Response(
      JSON.stringify({ error: "Unauthorized. HOD session required." }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const rawId = params.id;
  if (!rawId) {
    return new Response(
      JSON.stringify({ error: "Proposal ID is required." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const numId = Number(rawId);
  const isNumeric = !isNaN(numId) && numId > 0;
  const where = isNumeric ? { id: numId } : { proposalId: rawId };

  try {
    // 2. Locate targeted proposal
    const proposal = await prisma.proposal.findFirst({
      where,
      select: { id: true, proposalId: true, pdfPath: true },
    });

    if (!proposal) {
      return new Response(
        JSON.stringify({ error: "Proposal record not found." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Cascade delete related records across activity, logs and proposal
    await prisma.$transaction([
      prisma.proposalActivity.deleteMany({
        where: { proposalId: proposal.id },
      }),
      prisma.emailLog.deleteMany({
        where: { proposalId: proposal.proposalId },
      }),
      prisma.proposal.delete({
        where: { id: proposal.id },
      }),
    ]);

    // 4. Clean up generated PDF artifact from disk
    if (proposal.pdfPath) {
      try {
        const cwd = process.cwd();
        const candidatePaths = [
          path.resolve(cwd, "./public", proposal.pdfPath.replace(/^\/+/, "")),
          path.resolve(cwd, proposal.pdfPath.replace(/^\/+/, "")),
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            fs.unlinkSync(p);
            break;
          }
        }
      } catch (fileErr) {
        console.warn(`[admin delete proposal] Non-fatal PDF unlink warning:`, fileErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Proposal ${proposal.proposalId} permanently deleted.`,
        deletedId: proposal.id,
        deletedProposalId: proposal.proposalId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to delete proposal:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete proposal record from database." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
