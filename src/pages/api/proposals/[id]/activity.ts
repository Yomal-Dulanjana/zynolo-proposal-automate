// src/pages/api/proposals/[id]/activity.ts — Activity & Touchpoint Logging API
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { getAdminAuthUser } from "../../../../lib/adminAuth.js";

// GET — Fetch chronological activity timeline for a proposal
export const GET: APIRoute = async ({ params, locals, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const rawId = params.id;
  if (!rawId) {
    return Response.json({ success: false, message: "Missing proposal ID." }, { status: 400 });
  }

  const numId = Number(rawId);
  const isNumeric = !isNaN(numId) && numId > 0;

  try {
    const isHodAdmin = !!(adminUser && adminUser.role === "HOD_ADMIN");
    const where = isHodAdmin
      ? isNumeric
        ? { id: numId }
        : { proposalId: rawId }
      : isNumeric
      ? { id: numId, salesUserId: user!.userId }
      : { proposalId: rawId, salesUserId: user!.userId };

    const proposal = await prisma.proposal.findFirst({
      where,
      select: { id: true, proposalId: true },
    });

    if (!proposal) {
      return Response.json({ success: false, message: "Proposal not found or access denied." }, { status: 404 });
    }

    const activities = await prisma.proposalActivity.findMany({
      where: { proposalId: proposal.id },
      include: {
        salesUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({
      success: true,
      proposalId: proposal.proposalId,
      activities,
    });
  } catch (err) {
    console.error("[proposal activity GET]", err);
    return Response.json({ success: false, message: "Failed to fetch activities." }, { status: 500 });
  }
};

// POST — Record a new touchpoint / activity
export const POST: APIRoute = async ({ params, locals, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const rawId = params.id;
  if (!rawId) {
    return Response.json({ success: false, message: "Missing proposal ID." }, { status: 400 });
  }

  const numId = Number(rawId);
  const isNumeric = !isNaN(numId) && numId > 0;

  try {
    const isHodAdmin = !!(adminUser && adminUser.role === "HOD_ADMIN");
    const where = isHodAdmin
      ? isNumeric
        ? { id: numId }
        : { proposalId: rawId }
      : isNumeric
      ? { id: numId, salesUserId: user!.userId }
      : { proposalId: rawId, salesUserId: user!.userId };

    const proposal = await prisma.proposal.findFirst({
      where,
      select: { id: true, proposalId: true, salesUserId: true },
    });

    if (!proposal) {
      return Response.json({ success: false, message: "Proposal not found or access denied." }, { status: 404 });
    }

    const body = await request.json();
    const { type, outcome, notes, nextActionAt } = body;

    const validTypes = ["CALL", "EMAIL", "DEMO", "WHATSAPP", "NOTE"];
    const validOutcomes = ["INTERESTED", "MEETING_SCHEDULED", "APPROVED", "OBJECTION", "FOLLOW_UP_REQUIRED", "FOLLOW_UP_SENT"];

    const activityType = (type || "CALL").toUpperCase();
    const activityOutcome = (outcome || "INTERESTED").toUpperCase();

    const currentSalesUserId = user ? user.userId : proposal.salesUserId;
    const now = new Date();

    const activity = await prisma.proposalActivity.create({
      data: {
        proposalId: proposal.id,
        salesUserId: currentSalesUserId,
        type: activityType,
        outcome: activityOutcome,
        notes: notes ? String(notes).trim() : null,
        nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
        createdAt: now,
      },
      include: {
        salesUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Update proposal's lastContactedAt timestamp
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        lastContactedAt: now,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Activity logged successfully.",
        activity,
        lastContactedAt: now.toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[proposal activity POST]", err);
    return Response.json({ success: false, message: "Failed to record activity." }, { status: 500 });
  }
};
