import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_STORE_PATH = resolve(process.cwd(), "src", "stores", "dbStore.ts");

test("dbStore wires updateAdminCredentials through shared commands", () => {
  const source = readFileSync(DB_STORE_PATH, "utf8");

  assert.match(source, /updateAdminCredentials:\s*\(input:\s*\{\s*currentPassword:\s*string;\s*newUsername:\s*string;\s*newPassword:\s*string;\s*\}\)\s*=>\s*Promise<\{\s*ok:\s*true\s*\}\s*\|\s*\{\s*ok:\s*false;\s*code:\s*string\s*\}>/s);
  assert.match(source, /const res = await runSharedCommand<null>\(\{/);
  assert.match(source, /type:\s*"updateAdminCredentials"/);
  assert.match(source, /payload:\s*input/);
  assert.match(source, /if \(!res\.ok\)\s*\{/);
  assert.match(source, /\("code" in res \? res\.code : undefined\) \?\? "invalid_input"/);
  assert.match(source, /set\(\(\) => res\.db\)/);
  assert.match(source, /return \{ ok: true \}/);
});
