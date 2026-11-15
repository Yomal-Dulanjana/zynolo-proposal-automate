// src/pages/api/upload-logo.ts — Multipart file upload for client logos
import type { APIRoute } from "astro";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getOrigin, getAbsoluteUrl } from "../../lib/url.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./public/uploads";
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE ?? "5242880", 10); // 5MB default

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user && !locals.adminUser) {
    return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file || file.size === 0) {
      return Response.json({ success: false, message: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { success: false, message: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { success: false, message: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() ?? "png";
    const filename = `logo_${randomUUID()}.${ext}`;
    ensureDir(UPLOAD_DIR);
    const absPath = path.join(UPLOAD_DIR, filename);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(absPath, Buffer.from(arrayBuffer));

    const publicUrl = `/uploads/${filename}`;
    const absoluteUrl = getAbsoluteUrl(publicUrl, request);
    return Response.json({ success: true, url: publicUrl, absoluteUrl });
  } catch (err) {
    console.error("[upload-logo]", err);
    return Response.json({ success: false, message: "Upload failed." }, { status: 500 });
  }
};
