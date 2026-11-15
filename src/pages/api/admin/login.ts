// src/pages/api/admin/login.ts — Executive HOD Authentication Endpoint
import type { APIRoute } from "astro";
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
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const isValid = verifyAdminCredentials(email, password);

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid executive credentials" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email: verifiedEmail } = getAdminCredentials();
    const token = signAdminToken({ role: "HOD_ADMIN", email: verifiedEmail });
    const cookieHeader = buildAdminSetCookieHeader(token);

    return new Response(
      JSON.stringify({ success: true, redirectUrl: "/admin" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (err: any) {
    console.error("[admin login error]", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal authentication error." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
