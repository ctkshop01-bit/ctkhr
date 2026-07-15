import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const VITE_CONFIG_PATH = resolve(process.cwd(), "vite.config.ts");

test("production build config no longer injects the TRAE SOLO badge plugin", () => {
  const source = readFileSync(VITE_CONFIG_PATH, "utf8");

  assert.doesNotMatch(source, /vite-plugin-trae-solo-badge/);
  assert.doesNotMatch(source, /traeBadgePlugin\(/);
});
