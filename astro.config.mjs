import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  output: "server",
  adapter: vercel({
    webAnalytics: { enabled: true },
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
      exclude: ["@prisma/client", "puppeteer"],
    },
    build: {
      rollupOptions: {
        external: ["puppeteer", "bcryptjs", "jsonwebtoken"],
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