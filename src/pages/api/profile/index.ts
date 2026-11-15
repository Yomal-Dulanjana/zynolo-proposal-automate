// src/pages/api/profile/index.ts — Update profile (mobile, password)
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/db.js";
import { hashPassword, verifyPassword } from "../../../lib/auth.js";

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user!;
  const profile = await prisma.salesUser.findUnique({
    where: { id: user.userId },
    select: { id: true, fullName: true, email: true, mobileNumber: true, createdAt: true },
  });
  return Response.json({ success: true, profile });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  const body = await request.json();
  const { mobileNumber, currentPassword, newPassword } = body;

  const dbUser = await prisma.salesUser.findUnique({ where: { id: user.userId } });
  if (!dbUser) {
    return Response.json({ success: false, message: "User not found." }, { status: 404 });
  }

  const updateData: { mobileNumber?: string; passwordHash?: string } = {};

  if (mobileNumber) updateData.mobileNumber = mobileNumber;

  if (newPassword) {
    if (!currentPassword) {
      return Response.json(
        { success: false, message: "Current password is required to set a new one." },
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
        { success: false, message: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }
    updateData.passwordHash = await hashPassword(newPassword);
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ success: false, message: "No changes provided." }, { status: 400 });
  }

  await prisma.salesUser.update({ where: { id: user.userId }, data: updateData });
  return Response.json({ success: true, message: "Profile updated successfully." });
};
