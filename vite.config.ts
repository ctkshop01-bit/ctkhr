import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import { createWebManifest, PWA_ASSET_VERSION } from "./src/pwa/pwaConfig";

const versionedManifestHref = `/manifest.webmanifest?v=${PWA_ASSET_VERSION}`;

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: "hidden",
  },
  plugins: [
    react({
      babel: {
        plugins: ["react-dev-locator"],
      },
    }),
    tsconfigPaths(),
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      includeAssets: ["favicon-v2.svg"],
      manifest: createWebManifest(),
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
    {
      name: "version-pwa-manifest-link",
      transformIndexHtml(html) {
        return html.replace(
          /href="\/manifest\.webmanifest(?:\?v=\d+)?"/g,
          `href="${versionedManifestHref}"`,
        );
      },
      closeBundle() {
        const indexHtmlPath = resolve(process.cwd(), "dist", "index.html");
        if (!existsSync(indexHtmlPath)) {
          return;
        }

        const html = readFileSync(indexHtmlPath, "utf8").replace(
          /href="\/manifest\.webmanifest(?:\?v=\d+)?"/g,
          `href="${versionedManifestHref}"`,
        );
        writeFileSync(indexHtmlPath, html);
      },
    },
  ],
});
