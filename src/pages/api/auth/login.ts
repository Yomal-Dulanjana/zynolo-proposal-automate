// src/pages/api/auth/login.ts — Unified Dual-Role Authentication (HOD Admin via .env / Rep via DB)
import type { APIRoute } from "astro";
import { prisma } from "../../../lib/db.js";
import { verifyPassword, signToken, buildSetCookieHeader } from "../../../lib/auth.js";
import {
  verifyAdminCredentials,
  signAdminToken,
  buildAdminSetCookieHeader,
  getAdminCredentials,
} from "../../../lib/adminAuth.js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { success: false, message: "Email and password are required.", error: "Email and password are required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim();

    // ── 1. Check for Executive HOD Admin Credentials First (.env Decoupled) ───
    if (verifyAdminCredentials(trimmedEmail, password)) {
      const { email: verifiedAdminEmail } = getAdminCredentials();
      const adminToken = signAdminToken({ role: "HOD_ADMIN", email: verifiedAdminEmail });

      return Response.json(
        {
          success: true,
          message: "Authenticated as Head of Department.",
          redirectUrl: "/admin",
        },
        {
          status: 200,
          headers: {
            "Set-Cookie": buildAdminSetCookieHeader(adminToken),
          },
        }
      );
    }

    // ── 2. Fallback to Sales Representative Database (Prisma SalesUser) ───────
    const user = await prisma.salesUser.findUnique({
      where: { email: trimmedEmail.toLowerCase() },
    });

    if (user) {
      const valid = await verifyPassword(password, user.passwordHash);
      if (valid) {
        const token = signToken({
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
        });

        return Response.json(
          {
            success: true,
            message: "Logged in successfully as Sales Representative.",
            redirectUrl: "/dashboard",
          },
          {
            status: 200,
            headers: {
              "Set-Cookie": buildSetCookieHeader(token),
            },
          }
        );
      }
    }

    // ── 3. Neither Matched ───────────────────────────────────────────────────
    return Response.json(
      { success: false, message: "Invalid email or password.", error: "Invalid email or password" },
      { status: 401 }
    );
  } catch (err) {
    console.error("[unified login]", err);
    return Response.json(
      { success: false, message: "Internal server error.", error: "Internal server error." },
      { status: 500 }
    );
  }
};
