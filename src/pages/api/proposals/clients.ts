// src/pages/api/proposals/clients.ts — GET saved client profiles (Address Book)
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user && !locals.adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const where = locals.user ? { salesUserId: locals.user.userId } : {};
    const clients = await prisma.clientProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        companyName: true,
        address: true,
        contactPerson: true,
        contactEmail: true,
        contactPhone: true,
        logoUrl: true,
        updatedAt: true,
      },
    });

    return Response.json({ success: true, clients });
  } catch (err) {
    console.error("[proposals/clients GET]", err);
    return Response.json({ success: false, message: "Failed to fetch clients." }, { status: 500 });
  }
};
