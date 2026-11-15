// src/middleware.ts — Unified Authentication & Route Protection Middleware
import { defineMiddleware } from "astro:middleware";
import { getAuthUser } from "./lib/auth.js";
import { getAdminAuthUser } from "./lib/adminAuth.js";

// Routes requiring sales representative authentication
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/proposals",
  "/create-proposal",
  "/profile",
  "/pipeline",
  "/clients",
  "/analytics",
];

// Public authentication pages (sales reps & unified login)
const AUTH_ONLY_ROUTES = ["/", "/login", "/register", "/signup", "/forgot-password"];

// Protected sales rep API endpoints
const PROTECTED_API_PREFIXES = [
  "/api/proposals",
  "/api/profile",
  "/api/auth/profile",
  "/api/clients",
  "/api/pipeline",
  "/api/analytics",
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, redirect, locals } = context;
  const pathname = url.pathname;

  // Extract both session contexts (strictly isolated)
  const user = getAuthUser(request);
  const adminUser = getAdminAuthUser(request);

  // Expose user and adminUser in locals
  locals.user = user ?? null;
  locals.adminUser = adminUser ?? null;

  // ─── 1. LEGACY ADMIN LOGIN REDIRECT ──────────────────────────────────────────
  if (pathname === "/admin/login") {
    return redirect("/login", 301);
  }

  // ─── 2. ISOLATED HOD EXECUTIVE ADMIN ACCESS (/admin & /api/admin) ─────────────
  
  // A. Admin API Routes Guard
  if (pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
      return next();
    }
    if (!adminUser || adminUser.role !== "HOD_ADMIN") {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized executive access." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    return next();
  }

  // B. Admin View Routes Guard (/admin and /admin/*)
  // Standard SalesUser cookies grant ZERO access here.
  // If unauthenticated or unauthorized, redirect directly to unified /login
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!adminUser || adminUser.role !== "HOD_ADMIN") {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("redirect", pathname);
      return redirect(loginUrl.toString(), 302);
    }
    return next();
  }

  // ─── 3. AUTH PAGES REDIRECT FOR ALREADY AUTHENTICATED USERS ─────────────────
  if (AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    // If Admin is logged in, redirect to /admin
    if (adminUser && adminUser.role === "HOD_ADMIN") {
      return redirect("/admin", 302);
    }
    // If Sales Representative is logged in, redirect to /dashboard
    if (user) {
      return redirect("/dashboard", 302);
    }
  }

  // ─── 4. SALES REPRESENTATIVE ROUTE GUARDS ────────────────────────────────────

  // A. Guard protected API routes with JSON 401 (allows either sales user or adminUser)
  if (PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!user && !adminUser) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized. Please log in." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return next();
  }

  // B. Guard protected view routes with redirect to unified login
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!user) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("redirect", pathname);
      return redirect(loginUrl.toString(), 302);
    }
  }

  return next();
});
