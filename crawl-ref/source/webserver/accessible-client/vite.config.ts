import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

declare const process: { env: Record<string, string | undefined> };

const webtilesTarget = process.env.VITE_CRAWL_PROXY_TARGET ?? "http://127.0.0.1:6080";

export default defineConfig({
  plugins: [solid()],
  server: {
    host: "127.0.0.1",
    port: 6173,
    strictPort: true,
    proxy: {
      "/socket": {
        target: webtilesTarget,
        ws: true
      },
      "/gamedata": {
        target: webtilesTarget
      },
      "/static": {
        target: webtilesTarget
      }
    }
  },
  build: {
    outDir: "../static/accessible",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        entryFileNames: "app.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "main.css") {
            return "app.css";
          }
          return "assets/[name]-[hash][extname]";
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"]
  }
});
