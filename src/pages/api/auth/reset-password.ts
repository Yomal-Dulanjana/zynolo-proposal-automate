// src/pages/api/auth/reset-password.ts — Step 2: Verify OTP & reset password
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/db.js";
import { hashPassword } from "../../../lib/auth.js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return Response.json(
        { success: false, message: "Email, OTP, and new password are required." },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return Response.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const user = await prisma.salesUser.findUnique({ where: { email } });
    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return Response.json(
        { success: false, message: "Invalid or expired OTP. Please request a new one." },
        { status: 400 }
      );
    }

    if (user.otpCode !== otp) {
      return Response.json({ success: false, message: "Incorrect OTP." }, { status: 400 });
    }

    if (new Date() > user.otpExpiresAt) {
      return Response.json(
        { success: false, message: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.salesUser.update({
      where: { email },
      data: { passwordHash, otpCode: null, otpExpiresAt: null },
    });

    return Response.json({ success: true, message: "Password reset successfully. Please log in." });
  } catch (err) {
    console.error("[reset-password]", err);
    return Response.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
};
