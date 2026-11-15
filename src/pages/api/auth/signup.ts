// src/pages/api/auth/signup.ts
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/db.js";
import { hashPassword, signToken, buildSetCookieHeader } from "../../../lib/auth.js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { fullName, email, mobileNumber, password } = body;

    // ── Validation ──────────────────────────────────────────────────
    if (!fullName || !email || !mobileNumber || !password) {
      return Response.json(
        { success: false, message: "All fields are required." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return Response.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // ── Duplicate email check ────────────────────────────────────────
    const existing = await prisma.salesUser.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // ── Create user ──────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);
    const user = await prisma.salesUser.create({
      data: { fullName, email, mobileNumber, passwordHash },
    });

    // ── Issue JWT ────────────────────────────────────────────────────
    const token = signToken({ userId: user.id, email: user.email, fullName: user.fullName });

    return Response.json(
      { success: true, message: "Account created successfully." },
      {
        status: 201,
        headers: { "Set-Cookie": buildSetCookieHeader(token) },
      }
    );
  } catch (err) {
    console.error("[signup]", err);
    return Response.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
};
