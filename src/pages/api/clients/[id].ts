// src/pages/api/clients/[id].ts — Update and Delete Client Profile
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";

// PUT — Update client profile
export const PUT: APIRoute = async ({ params, locals, request }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return Response.json({ success: false, message: "Invalid client ID." }, { status: 400 });
  }

  try {
    const existing = await prisma.clientProfile.findFirst({
      where: { id, salesUserId: locals.user.userId },
    });

    if (!existing) {
      return Response.json({ success: false, message: "Client profile not found." }, { status: 404 });
    }

    const body = await request.json();
    const { companyName, address, contactPerson, contactPhone, contactEmail, logoUrl } = body;

    const updated = await prisma.clientProfile.update({
      where: { id },
      data: {
        companyName: companyName ? companyName.trim() : existing.companyName,
        address: address ? address.trim() : existing.address,
        contactPerson: contactPerson !== undefined ? (contactPerson?.trim() || null) : existing.contactPerson,
        contactEmail: contactEmail ? contactEmail.trim() : existing.contactEmail,
        contactPhone: contactPhone !== undefined ? (contactPhone?.trim() || null) : existing.contactPhone,
        logoUrl: logoUrl !== undefined ? (logoUrl?.trim() || null) : existing.logoUrl,
      },
    });

    return Response.json({ success: true, client: updated, message: "Client profile updated successfully." });
  } catch (err: any) {
    console.error("[clients PUT]", err);
    return Response.json({ success: false, message: err?.message || "Failed to update client profile." }, { status: 500 });
  }
};

// DELETE — Remove client profile
export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return Response.json({ success: false, message: "Invalid client ID." }, { status: 400 });
  }

  try {
    const existing = await prisma.clientProfile.findFirst({
      where: { id, salesUserId: locals.user.userId },
    });

    if (!existing) {
      return Response.json({ success: false, message: "Client profile not found." }, { status: 404 });
    }

    await prisma.clientProfile.delete({ where: { id } });

    return Response.json({ success: true, message: "Client profile removed from address book." });
  } catch (err: any) {
    console.error("[clients DELETE]", err);
    return Response.json({ success: false, message: "Failed to delete client profile." }, { status: 500 });
  }
};
