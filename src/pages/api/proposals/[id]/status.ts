// src/pages/api/proposals/[id]/status.ts — PATCH /api/proposals/[id]/status
import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/prisma.js";
import { ProposalStatus, DealStage } from "@prisma/client";
import { getAdminAuthUser } from "../../../../lib/adminAuth.js";

const STAGE_MAP: Record<string, { stage: DealStage; status: ProposalStatus; probability: number }> = {
  NEW_LEAD: { stage: DealStage.NEW_LEAD, status: ProposalStatus.DRAFT, probability: 10 },
  LEAD: { stage: DealStage.NEW_LEAD, status: ProposalStatus.DRAFT, probability: 10 },
  QUALIFIED: { stage: DealStage.QUALIFIED, status: ProposalStatus.DRAFT, probability: 30 },
  PROPOSAL_SENT: { stage: DealStage.PROPOSAL_SENT, status: ProposalStatus.SENT, probability: 60 },
  SENT: { stage: DealStage.PROPOSAL_SENT, status: ProposalStatus.SENT, probability: 60 },
  APPROVED_SENT: { stage: DealStage.PROPOSAL_SENT, status: ProposalStatus.SENT, probability: 60 },
  APPROVED: { stage: DealStage.PROPOSAL_SENT, status: ProposalStatus.APPROVED, probability: 60 },
  NEGOTIATION: { stage: DealStage.NEGOTIATION, status: ProposalStatus.IN_NEGOTIATION, probability: 80 },
  IN_NEGOTIATION: { stage: DealStage.NEGOTIATION, status: ProposalStatus.IN_NEGOTIATION, probability: 80 },
  CLOSED_WON: { stage: DealStage.CLOSED_WON, status: ProposalStatus.ACCEPTED, probability: 100 },
  WON: { stage: DealStage.CLOSED_WON, status: ProposalStatus.ACCEPTED, probability: 100 },
  ACCEPTED: { stage: DealStage.CLOSED_WON, status: ProposalStatus.ACCEPTED, probability: 100 },
  ACCEPTED_WON: { stage: DealStage.CLOSED_WON, status: ProposalStatus.ACCEPTED, probability: 100 },
  CLOSED_LOST: { stage: DealStage.CLOSED_LOST, status: ProposalStatus.REJECTED, probability: 0 },
  LOST: { stage: DealStage.CLOSED_LOST, status: ProposalStatus.REJECTED, probability: 0 },
  REJECTED: { stage: DealStage.CLOSED_LOST, status: ProposalStatus.REJECTED, probability: 0 },
  REJECTED_LOST: { stage: DealStage.CLOSED_LOST, status: ProposalStatus.REJECTED, probability: 0 },
  EXPIRED: { stage: DealStage.CLOSED_LOST, status: ProposalStatus.EXPIRED, probability: 0 },
  HOD_REVIEW: { stage: DealStage.PROPOSAL_SENT, status: ProposalStatus.HOD_PENDING, probability: 20 },
  DISPATCHED: { stage: DealStage.PROPOSAL_SENT, status: ProposalStatus.SENT, probability: 60 },
  DROPPED_LOST: { stage: DealStage.CLOSED_LOST, status: ProposalStatus.REJECTED, probability: 0 },
};

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  const adminUser = locals.adminUser || getAdminAuthUser(request);
  const user = locals.user;

  if (!user && !adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return Response.json({ success: false, message: "Invalid proposal ID." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const rawInput = (body.stage || body.status || "").trim().toUpperCase();

    const stageConfig = STAGE_MAP[rawInput];
    if (!stageConfig) {
      return Response.json(
        {
          success: false,
          message: `Invalid stage or status '${rawInput}'. Valid progression stages: NEW_LEAD, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, CLOSED_WON, CLOSED_LOST.`,
        },
        { status: 400 }
      );
    }

    const isHodAdmin = !!(adminUser && adminUser.role === "HOD_ADMIN");
    const where = isHodAdmin ? { id } : { id, salesUserId: user!.userId };

    const proposal = await prisma.proposal.findFirst({
      where,
      include: {
        salesUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobileNumber: true,
          },
        },
      },
    });

    if (!proposal) {
      return Response.json({ success: false, message: "Proposal not found or access denied." }, { status: 404 });
    }

    const isCurrentlyInReview = [
      ProposalStatus.HOD_PENDING,
      ProposalStatus.CHANGED_PENDING,
      ProposalStatus.CHANGES_REQUESTED,
    ].includes(proposal.status);

    // Business Rule: Reps cannot advance deals pending HOD review into PROPOSAL_SENT, NEGOTIATION, or CLOSED_WON
    if (!isHodAdmin) {
      if (
        isCurrentlyInReview &&
        !proposal.isHodApproved &&
        stageConfig.stage !== DealStage.CLOSED_LOST &&
        stageConfig.stage !== DealStage.NEW_LEAD &&
        stageConfig.stage !== DealStage.QUALIFIED
      ) {
        return Response.json(
          {
            success: false,
            message: "Proposal is pending executive HOD approval and cannot advance to Proposal Sent or Negotiation.",
          },
          { status: 403 }
        );
      }
    }

    const updateData: {
      stage: DealStage;
      probability: number;
      status: ProposalStatus;
      isHodApproved?: boolean;
      salesUserId?: number;
      lossReason?: string | null;
      lossNotes?: string | null;
      lastContactedAt?: Date;
    } = {
      stage: stageConfig.stage,
      probability: stageConfig.probability,
      status: stageConfig.status,
      lastContactedAt: new Date(),
    };

    if (isHodAdmin && stageConfig.stage === DealStage.PROPOSAL_SENT) {
      updateData.isHodApproved = true;
    }

    if (body.lossReason) {
      updateData.lossReason = String(body.lossReason).trim();
    }
    if (body.lossNotes !== undefined) {
      updateData.lossNotes = body.lossNotes ? String(body.lossNotes).trim() : null;
    }

    // Executive re-assignment support
    if (isHodAdmin && body.salesUserId) {
      const newRepId = Number(body.salesUserId);
      if (newRepId && !isNaN(newRepId)) {
        const targetRep = await prisma.salesUser.findUnique({ where: { id: newRepId } });
        if (targetRep) {
          updateData.salesUserId = newRepId;
        }
      }
    }

    const updated = await prisma.proposal.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        proposalId: true,
        status: true,
        stage: true,
        isHodApproved: true,
        probability: true,
        updatedAt: true,
        salesUserId: true,
        totalAmount: true,
        baseAmount: true,
        lossReason: true,
        lossNotes: true,
        lastContactedAt: true,
        salesUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobileNumber: true,
          },
        },
      },
    });

    // Record stage movement / loss activity
    if (body.lossReason || stageConfig.stage === DealStage.CLOSED_LOST) {
      try {
        await prisma.proposalActivity.create({
          data: {
            proposalId: updated.id,
            salesUserId: user ? user.userId : updated.salesUserId,
            type: "NOTE",
            outcome: "OBJECTION",
            notes: `Stage updated to Closed Lost.${body.lossReason ? ` Reason: ${body.lossReason}` : ""}${body.lossNotes ? ` | Notes: ${body.lossNotes}` : ""}`,
          },
        });
      } catch (e) {
        console.warn("Could not log loss activity:", e);
      }
    } else {
      try {
        await prisma.proposalActivity.create({
          data: {
            proposalId: updated.id,
            salesUserId: user ? user.userId : updated.salesUserId,
            type: "NOTE",
            outcome: stageConfig.stage === DealStage.CLOSED_WON ? "APPROVED" : "INTERESTED",
            notes: `Deal progressed to stage: ${stageConfig.stage} (${stageConfig.probability}% probability).`,
          },
        });
      } catch (e) {
        console.warn("Could not log stage progression activity:", e);
      }
    }

    return Response.json({
      success: true,
      message: `Proposal ${updated.proposalId} stage updated to ${updated.stage} (${updated.probability}%).`,
      proposal: updated,
    });
  } catch (err) {
    console.error("[proposals PATCH status]", err);
    return Response.json({ success: false, message: "Failed to update stage." }, { status: 500 });
  }
};
