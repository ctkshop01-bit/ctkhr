import test from "node:test";
import assert from "node:assert/strict";
import { createWebManifest, PWA_THEME_COLOR } from "../src/pwa/pwaConfig.js";

test("creates standalone thai manifest metadata for the HR app", () => {
  const manifest = createWebManifest();

  assert.equal(manifest.name, "企业员工考勤系统");
  assert.equal(manifest.short_name, "HR考勤");
  assert.equal(manifest.lang, "th");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.theme_color, PWA_THEME_COLOR);
  assert.deepEqual(
    manifest.icons.map(icon => icon.src),
    [
      "pwa-192x192-v2.png?v=20260630",
      "pwa-512x512-v2.png?v=20260630",
      "maskable-512x512-v2.png?v=20260630",
    ],
  );
});
