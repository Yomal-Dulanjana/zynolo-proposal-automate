// src/pages/api/admin/settings/cogs.ts — HOD Dynamic Daily COGS Settings API
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../../lib/adminAuth.js";

// GET — Retrieve current active COGS rate (with VAT)
export const GET: APIRoute = async ({ locals, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return Response.json({ success: false, message: "Unauthorized. HOD admin access required." }, { status: 403 });
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: "global_config" },
    });

    const currentCogsWithVat = config?.currentCogsWithVat ?? 80.00;

    return Response.json({
      success: true,
      currentCogsWithVat,
      updatedAt: config?.updatedAt,
      updatedBy: config?.updatedBy,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/settings/cogs]", err);
    return Response.json(
      { success: false, message: "Failed to retrieve COGS settings.", currentCogsWithVat: 80.00 },
      { status: 500 }
    );
  }
};

// PATCH — Update current active COGS rate (with VAT) for future proposals
export const PATCH: APIRoute = async ({ locals, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  if (!adminUser || adminUser.role !== "HOD_ADMIN") {
    return Response.json({ success: false, message: "Unauthorized. HOD admin access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const rate = parseFloat(body.currentCogsWithVat);

    if (isNaN(rate) || rate <= 0) {
      return Response.json(
        { success: false, message: "COGS rate must be a valid positive number." },
        { status: 400 }
      );
    }

    const updated = await prisma.systemConfig.upsert({
      where: { id: "global_config" },
      update: {
        currentCogsWithVat: rate,
        updatedBy: adminUser.email || adminUser.name || "HOD_ADMIN",
      },
      create: {
        id: "global_config",
        currentCogsWithVat: rate,
        updatedBy: adminUser.email || adminUser.name || "HOD_ADMIN",
      },
    });

    return Response.json({
      success: true,
      message: `Active daily COGS updated to LKR ${rate.toFixed(2)} per user (with VAT). Future proposals will lock this rate.`,
      currentCogsWithVat: updated.currentCogsWithVat,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/settings/cogs]", err);
    return Response.json(
      { success: false, message: "Failed to update COGS configuration." },
      { status: 500 }
    );
  }
};
