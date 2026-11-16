// src/utils/url.ts — Global Dynamic URL Resolver Utility for Vercel Serverless & Localhost

/**
 * Dynamically resolves the base URL across client and server environments.
 * - Client-side: returns `window.location.origin`.
 * - Server-side: inspects forwarding and host headers (`x-forwarded-host`, `x-forwarded-proto`, `host`).
 * - Vercel system environment variables (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`).
 * - Default fallback to local development origin.
 */
export function getAppBaseUrl(request?: Request): string {
  if (typeof window !== "undefined") return window.location.origin;
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isLocal = host?.includes("localhost") || host?.includes("127.0.0.1");
    const proto = (forwardedProto ? forwardedProto.split(",")[0].trim() : "") || (isLocal ? "http" : "https");
    if (host) return `${proto}://${host.split(",")[0].trim()}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:4321";
}

export const getBaseUrl = getAppBaseUrl;
export const getOrigin = getAppBaseUrl;

/**
 * Resolves a fully-qualified absolute URL from a given relative or absolute path.
 */
export function getAbsoluteUrl(pathOrUrl: string, request?: Request): string {
  if (!pathOrUrl) return getBaseUrl(request);
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("data:")
  ) {
    return pathOrUrl;
  }
  const base = getBaseUrl(request);
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${normalizedPath}`;
}

/**
 * Returns the absolute URL for a stored PDF file.
 */
export function getPdfUrl(pdfPath: string, request?: Request): string {
  return getAbsoluteUrl(pdfPath, request);
}

/**
 * Returns the absolute URL for a proposal view portal token.
 */
export function getProposalPortalUrl(token: string, request?: Request): string {
  return getAbsoluteUrl(`/p/${token}`, request);
}
