// src/pages/api/admin/logout.ts — Executive HOD Logout Endpoint
import type { APIRoute } from "astro";
import { buildAdminClearCookieHeader } from "../../../lib/adminAuth.js";

const handleLogout = (request: Request) => {
  const cookieHeader = buildAdminClearCookieHeader();
  const acceptsJson = request.headers.get("accept")?.includes("application/json");

  if (acceptsJson) {
    return new Response(JSON.stringify({ success: true, redirectUrl: "/login" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieHeader,
      },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": cookieHeader,
    },
  });
};

export const POST: APIRoute = async ({ request }) => handleLogout(request);
export const GET: APIRoute = async ({ request }) => handleLogout(request);
