// src/pages/api/admin/team/[id].ts — Manage individual sales team members (HOD Executive Only)
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../../lib/adminAuth.js";

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return Response.json(
      { success: false, message: "Unauthorized. Executive Admin session required." },
      { status: 401 }
    );
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return Response.json(
      { success: false, message: "Invalid sales representative ID." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    // STRICT BUSINESS RULE: Admin cannot modify email or password!
    // Discard any incoming email or password fields
    const { fullName, mobileNumber } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return Response.json(
        { success: false, message: "Full Name is required." },
        { status: 400 }
      );
    }

    if (!mobileNumber || typeof mobileNumber !== "string" || !mobileNumber.trim()) {
      return Response.json(
        { success: false, message: "Contact phone number is required." },
        { status: 400 }
      );
    }

    const existingRep = await prisma.salesUser.findUnique({
      where: { id },
    });

    if (!existingRep) {
      return Response.json(
        { success: false, message: "Sales representative not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.salesUser.update({
      where: { id },
      data: {
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobileNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Response.json({
      success: true,
      message: `Representative ${updated.fullName} updated successfully.`,
      user: updated,
    });
  } catch (err: any) {
    console.error("[api/admin/team PATCH]", err);
    return Response.json(
      { success: false, message: err.message || "Failed to update sales representative." },
      { status: 500 }
    );
  }
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return Response.json(
      { success: false, message: "Unauthorized. Executive Admin session required." },
      { status: 401 }
    );
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return Response.json(
      { success: false, message: "Invalid sales representative ID." },
      { status: 400 }
    );
  }

  try {
    const existingRep = await prisma.salesUser.findUnique({
      where: { id },
    });

    if (!existingRep) {
      return Response.json(
        { success: false, message: "Sales representative not found." },
        { status: 404 }
      );
    }

    // Gracefully handle historical records:
    // If another sales rep exists, reassign historical proposals and client profiles to them
    const otherRep = await prisma.salesUser.findFirst({
      where: { id: { not: id } },
      orderBy: { id: "asc" },
    });

    if (otherRep) {
      // Reassign proposals
      await prisma.proposal.updateMany({
        where: { salesUserId: id },
        data: { salesUserId: otherRep.id },
      });

      // Reassign client profiles, avoiding duplicates on (salesUserId, companyName)
      const profiles = await prisma.clientProfile.findMany({
        where: { salesUserId: id },
      });

      for (const p of profiles) {
        const existingProfile = await prisma.clientProfile.findUnique({
          where: {
            salesUserId_companyName: {
              salesUserId: otherRep.id,
              companyName: p.companyName,
            },
          },
        });

        if (existingProfile) {
          await prisma.clientProfile.delete({ where: { id: p.id } });
        } else {
          await prisma.clientProfile.update({
            where: { id: p.id },
            data: { salesUserId: otherRep.id },
          });
        }
      }
    }

    // Now delete the sales representative
    await prisma.salesUser.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      message: otherRep
        ? `Sales representative ${existingRep.fullName} removed. Historical proposals reassigned to ${otherRep.fullName}.`
        : `Sales representative ${existingRep.fullName} removed successfully.`,
    });
  } catch (err: any) {
    console.error("[api/admin/team DELETE]", err);
    return Response.json(
      { success: false, message: err.message || "Failed to delete sales representative." },
      { status: 500 }
    );
  }
};
