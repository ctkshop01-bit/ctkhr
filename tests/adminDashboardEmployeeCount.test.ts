import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DASHBOARD_PATH = resolve(process.cwd(), "src", "pages", "admin", "Dashboard.tsx");
const TRANSLATIONS_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("admin dashboard employee card shows total employees so new hires update the workbench immediately", () => {
  const source = readFileSync(DASHBOARD_PATH, "utf8");

  assert.match(source, /const totalEmployees = db\.users\.filter\(u => u\.role === "employee"\)/);
  assert.match(source, /const activeEmployees = totalEmployees\.filter\(u => u\.status === "active"\)/);
  assert.match(source, /text-4xl font-semibold text-zinc-100">\{totalEmployees\.length\}</);
  assert.match(source, /admin\.dashboard\.employeesMeta/);
});

test("admin dashboard translations describe total and active employee counts", () => {
  const source = readFileSync(TRANSLATIONS_PATH, "utf8");

  assert.match(source, /"admin\.dashboard\.employeesDesc": "员工总数与在职人数"/);
  assert.match(source, /"admin\.dashboard\.employeesMeta": "总数 \{total\} · 在职 \{active\}"/);
});
