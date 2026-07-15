import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRE_AUTH_PATH = resolve(process.cwd(), "src", "components", "auth", "RequireAuth.tsx");

test("RequireAuth loads shared snapshot before rendering protected routes after refresh", () => {
  const source = readFileSync(REQUIRE_AUTH_PATH, "utf8");

  assert.match(source, /useDbStore/);
  assert.match(source, /loadSharedSnapshot/);
  assert.match(source, /useEffect/);
  assert.match(source, /await loadSharedSnapshot\(\)/);
  assert.match(source, /if \(!snapshotReady\) return null/);
});

test("RequireAuth keeps protected routes blocked and retries when the first shared snapshot load fails", () => {
  const source = readFileSync(REQUIRE_AUTH_PATH, "utf8");

  assert.doesNotMatch(source, /finally\s*\{[\s\S]*setSnapshotReady\(true\)/);
  assert.match(source, /catch\s*\{/);
  assert.match(source, /setSnapshotReady\(false\)/);
  assert.match(source, /setTimeout\(/);
});
