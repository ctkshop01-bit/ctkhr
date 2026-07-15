import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FAVICON_PATH = resolve(process.cwd(), "public", "favicon.svg");

test("favicon source uses the selected C icon with ice-blue gradients and a subtle cut-corner line", () => {
  const svg = readFileSync(FAVICON_PATH, "utf8");

  assert.match(svg, /linearGradient/);
  assert.match(svg, /CTKHR/);
  assert.match(svg, /font-weight="900"/);
  assert.match(svg, /path d="M23\.5 1L31 8\.5"/);
});
