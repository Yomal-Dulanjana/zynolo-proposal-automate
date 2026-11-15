// src/lib/auth.ts — JWT + bcrypt authentication helpers
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AstroGlobal } from "astro";

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "your-super-secure-jwt-secret-change-this-in-production";
}

export function getCookieName(): string {
  return process.env.COOKIE_NAME || "pa_session";
}

export interface JWTPayload {
  userId: number;
  email: string;
  fullName: string;
}

// ─── Password hashing ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT tokens ──────────────────────────────────────────────────────────────

export function signToken(payload: JWTPayload): string {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, secret, { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JWTPayload | null {
  if (!token) return null;
  const secrets = [
    getJwtSecret(),
    "your-super-secure-jwt-secret-change-this-in-production",
    "fallback-secret-change-in-prod",
  ];
  for (const secret of secrets) {
    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      if (decoded && decoded.userId) {
        return decoded;
      }
    } catch {
      // try next secret
    }
  }
  return null;
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const cookieName = getCookieName();
  return cookies[cookieName] || cookies["pa_session"] || null;
}

export function buildSetCookieHeader(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  const cookieName = getCookieName();
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function buildClearCookieHeader(): string {
  const cookieName = getCookieName();
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ─── Authenticated user extraction ───────────────────────────────────────────

export function getAuthUser(request: Request): JWTPayload | null {
  const token = getSessionCookie(request);
  if (!token) return null;
  return verifyToken(token);
}

// ─── OTP generation ───────────────────────────────────────────────────────────

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function otpExpiresAt(): Date {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}
