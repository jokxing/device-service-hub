import { mergeConfig } from "vite";
import base from "./vite.config.ts";
export default mergeConfig(base, {
  plugins: [
    {
      name: "devices-micro-html",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "index.html",
          source:
            '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><link rel="stylesheet" href="./devices.css"></head><body><div data-devices-root></div><script src="./devices.umd.js" entry></script></body></html>',
        });
      },
    },
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: {
    outDir: "dist/micro",
    lib: {
      entry: "src/micro.ts",
      name: "device-service-devices",
      formats: ["umd"],
      fileName: () => "devices.umd.js",
      cssFileName: "devices",
    },
    cssCodeSplit: false,
  },
  preview: {
    cors: { origin: ["http://127.0.0.1:5174", "http://127.0.0.1:4174"] },
  },
});
