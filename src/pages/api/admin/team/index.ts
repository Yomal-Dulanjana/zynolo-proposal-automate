// src/pages/api/admin/team/index.ts — List sales team members (HOD Executive Only)
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../../lib/adminAuth.js";

export const GET: APIRoute = async ({ request, locals }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return Response.json(
      { success: false, message: "Unauthorized. Executive Admin session required." },
      { status: 401 }
    );
  }

  try {
    const [salesUsers, proposals] = await Promise.all([
      prisma.salesUser.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          mobileNumber: true,
          createdAt: true,
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.proposal.findMany({
        select: {
          id: true,
          salesUserId: true,
          status: true,
          totalAmount: true,
        },
      }),
    ]);

    const reps = salesUsers.map((user) => {
      const userProps = proposals.filter((p) => p.salesUserId === user.id);
      const wonProps = userProps.filter((p) => p.status === "ACCEPTED");
      const pipelineProps = userProps.filter((p) =>
        ["SENT", "VIEWED", "IN_NEGOTIATION"].includes(p.status)
      );

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        createdAt: user.createdAt.toISOString(),
        totalProposals: userProps.length,
        wonProposals: wonProps.length,
        wonAmount: wonProps.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0),
        pipelineProposals: pipelineProps.length,
        pipelineAmount: pipelineProps.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0),
      };
    });

    return Response.json({ success: true, reps });
  } catch (err: any) {
    console.error("[api/admin/team GET]", err);
    return Response.json(
      { success: false, message: err.message || "Failed to fetch sales representatives." },
      { status: 500 }
    );
  }
};
