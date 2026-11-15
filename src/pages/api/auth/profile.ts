// src/pages/api/auth/profile.ts — PUT /api/auth/profile for sales reps
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../../lib/auth.js";

export const GET: APIRoute = async ({ locals }) => {
  if (locals.user) {
    const profile = await prisma.salesUser.findUnique({
      where: { id: locals.user.userId },
      select: { id: true, fullName: true, email: true, mobileNumber: true, createdAt: true },
    });
    return Response.json({ success: true, profile });
  }

  if (locals.adminUser) {
    const firstRep = await prisma.salesUser.findFirst({
      select: { id: true, fullName: true, email: true, mobileNumber: true, createdAt: true },
    });
    const profile = firstRep || {
      id: 0,
      fullName: "HOD Executive Administrator",
      email: locals.adminUser.email || "admin@dtech.lk",
      mobileNumber: "0776263388",
      createdAt: new Date(),
    };
    return Response.json({ success: true, profile });
  }

  return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { mobileNumber, currentPassword, newPassword } = body;

    const dbUser = await prisma.salesUser.findUnique({ where: { id: locals.user.userId } });
    if (!dbUser) {
      return Response.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const updateData: { mobileNumber?: string; passwordHash?: string } = {};

    if (mobileNumber && mobileNumber.trim() !== "") {
      updateData.mobileNumber = mobileNumber.trim();
    }

    if (newPassword && newPassword.trim() !== "") {
      if (!currentPassword) {
        return Response.json(
          { success: false, message: "Current password is required to set a new password." },
          { status: 400 }
        );
      }
      const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!valid) {
        return Response.json(
          { success: false, message: "Current password is incorrect." },
          { status: 400 }
        );
      }
      if (newPassword.length < 8) {
        return Response.json(
          { success: false, message: "New password must be at least 8 characters long." },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ success: false, message: "No profile changes provided." }, { status: 400 });
    }

    await prisma.salesUser.update({
      where: { id: locals.user.userId },
      data: updateData,
    });

    return Response.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("[profile PUT]", err);
    return Response.json({ success: false, message: "Failed to update profile." }, { status: 500 });
  }
};
