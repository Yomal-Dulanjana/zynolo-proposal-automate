// src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";
import { buildClearCookieHeader } from "../../../lib/auth.js";

export const POST: APIRoute = async () => {
  return Response.json(
    { success: true, message: "Logged out successfully." },
    {
      status: 200,
      headers: { "Set-Cookie": buildClearCookieHeader() },
    }
  );
};
