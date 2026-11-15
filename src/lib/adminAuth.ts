// src/lib/adminAuth.ts — Isolated Runtime HOD Executive Admin Authentication
import jwt from "jsonwebtoken";

export interface AdminJWTPayload {
  role: "HOD_ADMIN";
  email: string;
}

export const ADMIN_COOKIE_NAME = "admin_session_token";

/**
 * Dynamically resolves HOD executive admin credentials directly from environment variables.
 * Decoupled from the database to enable instant, zero-migration credential rotation.
 */
export function getAdminCredentials() {
  const email = (process.env.HOD_ADMIN_EMAIL || "admin@dtech.lk").trim().toLowerCase();
  const password = process.env.HOD_ADMIN_PASSWORD || "Sales@dtechlk19940";
  const jwtSecret = process.env.ADMIN_JWT_SECRET || "super_secure_random_admin_secret_key_change_me";

  return { email, password, jwtSecret };
}

/**
 * Validates candidate credentials against runtime environment configuration.
 */
export function verifyAdminCredentials(candidateEmail?: string, candidatePassword?: string): boolean {
  if (!candidateEmail || !candidatePassword) return false;

  const { email, password } = getAdminCredentials();
  return (
    candidateEmail.trim().toLowerCase() === email &&
    candidatePassword === password
  );
}

/**
 * Signs an executive admin session JWT.
 */
export function signAdminToken(payload: AdminJWTPayload): string {
  const { jwtSecret } = getAdminCredentials();
  return jwt.sign(payload, jwtSecret, { expiresIn: "24h" });
}

/**
 * Verifies an incoming admin JWT token and ensures the HOD_ADMIN role.
 */
export function verifyAdminToken(token: string): AdminJWTPayload | null {
  try {
    const { jwtSecret } = getAdminCredentials();
    const decoded = jwt.verify(token, jwtSecret) as AdminJWTPayload;
    if (decoded && decoded.role === "HOD_ADMIN") {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts the admin session cookie from an incoming HTTP request.
 */
export function getAdminSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  return cookies[ADMIN_COOKIE_NAME] ?? null;
}

/**
 * Validates and retrieves the authenticated admin from the request headers.
 */
export function getAdminAuthUser(request: Request): AdminJWTPayload | null {
  const token = getAdminSessionCookie(request);
  if (!token) return null;
  return verifyAdminToken(token);
}

/**
 * Generates Set-Cookie header for executive admin session.
 * Path=/ ensures all /admin and /api/admin endpoints receive the credential.
 */
export function buildAdminSetCookieHeader(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`;
}

/**
 * Generates Set-Cookie header to clear executive admin session.
 */
export function buildAdminClearCookieHeader(): string {
  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
