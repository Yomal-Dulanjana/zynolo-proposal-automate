// src/pages/api/upload-logo.ts — Serverless In-Memory Base64 Logo Processor
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Basic auth check: accept authenticated sales user or HOD admin
    if (!locals?.user && !locals?.adminUser) {
      // Also check headers if available
      return new Response(
        JSON.stringify({ error: "Unauthorized." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Invalid content type. Expected multipart/form-data." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file || typeof file === "string" || file.size === 0) {
      return new Response(
        JSON.stringify({ error: "No logo file provided." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Size limit check: 2MB max
    if (file.size > 2 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Logo size must be less than 2MB." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate mime type
    const mimeType = file.type || "image/png";
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"].includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: "Supported formats: PNG, JPG, WEBP, SVG." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convert Buffer directly to Base64 in-memory (ZERO DISK WRITES)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: dataUri, // Directly usable as <img src={url} /> and inside PDF generation
        absoluteUrl: dataUri,
        message: "Logo uploaded and processed successfully.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Serverless logo processing error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process logo in serverless runtime.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
