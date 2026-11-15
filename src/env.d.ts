// src/env.d.ts — Type augmentation for Astro locals
/// <reference types="astro/client" />
import type { JWTPayload } from "./lib/auth";
import type { AdminJWTPayload } from "./lib/adminAuth";

declare namespace App {
  interface Locals {
    user: JWTPayload | null;
    adminUser?: AdminJWTPayload | null;
  }
}
