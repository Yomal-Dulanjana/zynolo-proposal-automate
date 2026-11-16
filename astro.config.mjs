import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  output: "server",
  adapter: vercel({
    webAnalytics: { enabled: true },
    maxDuration: 25,
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    server: {
      allowedHosts: [".ngrok-free.app", ".ngrok.io", ".trycloudflare.com"],
    },
    optimizeDeps: {
      exclude: ["@prisma/client", "puppeteer-core", "@sparticuz/chromium"],
    },
    build: {
      rollupOptions: {
        external: ["puppeteer-core", "@sparticuz/chromium", "bcryptjs", "jsonwebtoken"],
      },
    },
    ssr: {
      noExternal: ["lucide-react"],
    },
  },
  server: {
    port: 4321,
    host: true,
  },
});