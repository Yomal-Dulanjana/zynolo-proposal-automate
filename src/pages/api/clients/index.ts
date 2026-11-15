// src/pages/api/clients/index.ts — List and Create Client Profiles
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";

// GET — List all client profiles with proposal statistics
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const clients = await prisma.clientProfile.findMany({
      where: { salesUserId: locals.user.userId },
      orderBy: { updatedAt: "desc" },
    });

    // Fetch proposal counts & totals per client company name for this sales rep
    const proposals = await prisma.proposal.findMany({
      where: { salesUserId: locals.user.userId },
      select: {
        id: true,
        proposalId: true,
        clientName: true,
        employeeCount: true,
        baseAmount: true,
        vatPercentage: true,
        vatAmount: true,
        totalAmount: true,
        status: true,
        proposalDate: true,
        expiryDate: true,
        publicToken: true,
        pdfPath: true,
      },
      orderBy: { proposalDate: "desc" },
    });

    // Aggregate stats per company name
    const enrichedClients = clients.map((client) => {
      const clientProposals = proposals.filter(
        (p) => p.clientName.trim().toLowerCase() === client.companyName.trim().toLowerCase()
      );
      const totalValue = clientProposals.reduce((sum, p) => sum + Number(p.totalAmount), 0);
      const wonValue = clientProposals
        .filter((p) => p.status === "ACCEPTED")
        .reduce((sum, p) => sum + Number(p.totalAmount), 0);

      return {
        ...client,
        proposalCount: clientProposals.length,
        totalValue,
        wonValue,
        proposals: clientProposals,
      };
    });

    return Response.json({ success: true, clients: enrichedClients });
  } catch (err) {
    console.error("[clients GET]", err);
    return Response.json({ success: false, message: "Failed to fetch clients." }, { status: 500 });
  }
};

// POST — Create new client profile
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { companyName, address, contactPerson, contactPhone, contactEmail, logoUrl } = body;

    if (!companyName?.trim()) {
      return Response.json({ success: false, message: "Company name is required." }, { status: 400 });
    }
    if (!address?.trim()) {
      return Response.json({ success: false, message: "Physical address is required." }, { status: 400 });
    }
    if (!contactEmail?.trim()) {
      return Response.json({ success: false, message: "Contact email is required." }, { status: 400 });
    }

    const client = await prisma.clientProfile.upsert({
      where: {
        salesUserId_companyName: {
          salesUserId: locals.user.userId,
          companyName: companyName.trim(),
        },
      },
      update: {
        address: address.trim(),
        contactPerson: contactPerson?.trim() || null,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
      },
      create: {
        salesUserId: locals.user.userId,
        companyName: companyName.trim(),
        address: address.trim(),
        contactPerson: contactPerson?.trim() || null,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
      },
    });

    return Response.json({ success: true, client, message: "Client profile saved successfully." }, { status: 201 });
  } catch (err: any) {
    console.error("[clients POST]", err);
    return Response.json({ success: false, message: err?.message || "Failed to save client." }, { status: 500 });
  }
};
