import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_PATH = resolve(process.cwd(), "src", "App.tsx");
const ADMIN_LAYOUT_PATH = resolve(process.cwd(), "src", "pages", "admin", "AdminLayout.tsx");
const ADMIN_ACCOUNT_PAGE_PATH = resolve(process.cwd(), "src", "pages", "admin", "AdminAccount.tsx");

test("App wires /admin/admin-account route", () => {
  const source = readFileSync(APP_PATH, "utf8");

  assert.match(source, /path="admin-account"/);
  assert.match(source, /AdminAccount/);
});

test("AdminLayout nav includes /admin/admin-account entry", () => {
  const source = readFileSync(ADMIN_LAYOUT_PATH, "utf8");

  assert.match(source, /to:\s*"\/admin\/admin-account"/);
  assert.match(source, /key:\s*"nav\.adminAccount"/);
});

test("AdminLayout places admin account as the first nav entry", () => {
  const source = readFileSync(ADMIN_LAYOUT_PATH, "utf8");

  assert.match(
    source,
    /const nav = \[\s*\{\s*to:\s*"\/admin\/admin-account",\s*key:\s*"nav\.adminAccount",\s*icon:\s*Settings\s*\},/s,
  );
});

test("AdminAccount saves via store then logs out and redirects to /login", () => {
  assert.equal(existsSync(ADMIN_ACCOUNT_PAGE_PATH), true);

  const source = readFileSync(ADMIN_ACCOUNT_PAGE_PATH, "utf8");

  assert.match(source, /updateAdminCredentials/);
  assert.match(source, /logout\(\)/);
  assert.match(source, /navigate\("\/login",\s*\{\s*replace:\s*true\s*\}\)/);
});
