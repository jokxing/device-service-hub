import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "ticket-micro-html",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "index.html",
          source:
            '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><link rel="stylesheet" href="./tickets.css"></head><body><div data-device-service-root></div><script src="./tickets.umd.js" entry></script></body></html>',
        });
      },
    },
  ],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist/micro",
    lib: {
      entry: "src/micro.ts",
      name: "DeviceServiceTickets",
      formats: ["umd"],
      fileName: () => "tickets.umd.js",
      cssFileName: "tickets",
    },
    cssCodeSplit: false,
  },
  preview: {
    cors: { origin: ["http://127.0.0.1:5174", "http://127.0.0.1:4174"] },
  },
});
