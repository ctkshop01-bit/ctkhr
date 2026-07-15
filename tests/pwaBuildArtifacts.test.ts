import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DIST_DIR = resolve(process.cwd(), "dist");

test("build emits manifest and service worker for the PWA shell", () => {
  const manifestPath = resolve(DIST_DIR, "manifest.webmanifest");
  const swPath = resolve(DIST_DIR, "sw.js");
  const indexHtmlPath = resolve(DIST_DIR, "index.html");

  assert.equal(existsSync(manifestPath), true);
  assert.equal(existsSync(swPath), true);
  assert.equal(existsSync(indexHtmlPath), true);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "th");
  assert.equal(
    manifest.icons.some((icon: { src: string }) => icon.src === "pwa-192x192-v2.png?v=20260630"),
    true,
  );

  const indexHtml = readFileSync(indexHtmlPath, "utf8");
  assert.match(indexHtml, /href="\/favicon-v2\.svg\?v=20260630"/);
  assert.match(indexHtml, /rel="shortcut icon"[^>]+href="\/favicon-v2\.svg\?v=20260630"/);
  assert.match(indexHtml, /apple-touch-icon-v2\.png\?v=20260630/);
  assert.match(indexHtml, /manifest\.webmanifest\?v=20260630/);
});
