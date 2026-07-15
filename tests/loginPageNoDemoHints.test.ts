import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOGIN_PAGE_PATH = resolve(process.cwd(), "src", "pages", "Login.tsx");

test("login page no longer exposes demo shortcuts or prefilled demo credentials", () => {
  const source = readFileSync(LOGIN_PAGE_PATH, "utf8");

  assert.doesNotMatch(source, /auth\.employeeDemo/);
  assert.doesNotMatch(source, /auth\.adminDemo/);
  assert.doesNotMatch(source, /app\.demoHint/);
  assert.doesNotMatch(source, /useState\("e001"\)/);
  assert.doesNotMatch(source, /useState\("123456"\)/);
  assert.doesNotMatch(source, /setUsername\("admin"\)/);
  assert.doesNotMatch(source, /setUsername\("e002"\)/);
});
