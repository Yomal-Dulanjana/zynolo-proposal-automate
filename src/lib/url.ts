// src/lib/url.ts — 100% Automated, Zero-Configuration Dynamic URL Resolution

/**
 * Strictly derives the full origin (protocol + domain + port) directly from request headers at runtime.
 * Eliminates reliance on manual domain entries in `.env` to prevent human error across deployments.
 *
 * 1. Checks proxy forwarding headers (Reverse proxy, NGINX, Cloudflare, Load Balancers)
 * 2. Checks direct host header (Localhost / direct server bindings)
 * 3. Falls back to http://localhost:4321 if called without request context
 */
export function getOrigin(request?: Request): string {
  if (request) {
    // 1. Check proxy forwarding headers first (Reverse proxy, NGINX, Cloudflare, Load Balancers)
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");

    if (forwardedHost) {
      const proto = (forwardedProto ? forwardedProto.split(",")[0].trim() : "") || "https";
      return `${proto}://${forwardedHost.split(",")[0].trim()}`;
    }

    // 2. Direct host header fallback
    const host = request.headers.get("host");
    if (host) {
      // If running on localhost or 127.0.0.1 default to http, otherwise https
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      return `${isLocal ? "http" : "https"}://${host}`;
    }
  }

  // 3. Ultra fallback
  return "http://localhost:4321";
}

// Backward-compatible alias for existing codebase callers
export const getBaseUrl = getOrigin;

/**
 * Resolves a fully-qualified absolute URL from a given relative or absolute path.
 */
export function getAbsoluteUrl(pathOrUrl: string, request?: Request): string {
  if (!pathOrUrl) return getOrigin(request);
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("data:")
  ) {
    return pathOrUrl;
  }
  const base = getOrigin(request);
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

