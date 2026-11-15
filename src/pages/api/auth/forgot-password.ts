// src/pages/api/auth/forgot-password.ts — Step 1: Send OTP
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/db.js";
import { generateOTP, otpExpiresAt } from "../../../lib/auth.js";
import { sendOTPEmail } from "../../../lib/email.js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ success: false, message: "Email is required." }, { status: 400 });
    }

    const user = await prisma.salesUser.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) {
      return Response.json({
        success: true,
        message: "If that email exists, an OTP has been sent.",
      });
    }

    const otp = generateOTP();
    const expiresAt = otpExpiresAt();

    await prisma.salesUser.update({
      where: { email },
      data: { otpCode: otp, otpExpiresAt: expiresAt },
    });

    await sendOTPEmail(email, user.fullName, otp);

    return Response.json({ success: true, message: "OTP sent to your email address." });
  } catch (err) {
    console.error("[forgot-password]", err);
    return Response.json({ success: false, message: "Failed to send OTP." }, { status: 500 });
  }
};
