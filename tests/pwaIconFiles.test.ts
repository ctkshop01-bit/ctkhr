import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC_DIR = resolve(process.cwd(), "public");

test("icon generation emits required png files for install surfaces", () => {
  assert.equal(existsSync(resolve(PUBLIC_DIR, "apple-touch-icon-v2.png")), true);
  assert.equal(existsSync(resolve(PUBLIC_DIR, "pwa-192x192-v2.png")), true);
  assert.equal(existsSync(resolve(PUBLIC_DIR, "pwa-512x512-v2.png")), true);
  assert.equal(existsSync(resolve(PUBLIC_DIR, "maskable-512x512-v2.png")), true);
});
