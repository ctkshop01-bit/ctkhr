import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ADMIN_PAYROLL_PAGE_PATH = resolve(process.cwd(), "src", "pages", "admin", "Payroll.tsx");
const TRANSLATIONS_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("admin payroll edit dialog source includes payroll breakdown fields", () => {
  const source = readFileSync(ADMIN_PAYROLL_PAGE_PATH, "utf8");

  assert.match(source, /admin\.payroll\.breakdown/);
  assert.match(source, /admin\.payroll\.breakdownDesc/);
  assert.match(source, /admin\.payroll\.paidLeaveDays/);
  assert.match(source, /admin\.payroll\.unpaidLeaveDays/);
  assert.match(source, /admin\.payroll\.unpaidLeaveDeduction/);
  assert.match(source, /admin\.payroll\.missingDays/);
  assert.match(source, /admin\.payroll\.missingDeduction/);
  assert.match(source, /openItem\?\.paidLeaveDays \?\? 0/);
  assert.match(source, /openItem\?\.unpaidLeaveDays \?\? 0/);
  assert.match(source, /openItem\?\.unpaidLeaveDeductionCents \?\? 0/);
  assert.match(source, /openItem\?\.missingDays \?\? 0/);
  assert.match(source, /openItem\?\.missingDeductionCents \?\? 0/);
});

test("translations define admin payroll breakdown labels in both languages", () => {
  const source = readFileSync(TRANSLATIONS_PATH, "utf8");

  assert.match(source, /"admin\.payroll\.breakdown":/);
  assert.match(source, /"admin\.payroll\.breakdownDesc":/);
  assert.match(source, /"admin\.payroll\.paidLeaveDays":/);
  assert.match(source, /"admin\.payroll\.unpaidLeaveDays":/);
  assert.match(source, /"admin\.payroll\.unpaidLeaveDeduction":/);
  assert.match(source, /"admin\.payroll\.missingDays":/);
  assert.match(source, /"admin\.payroll\.missingDeduction":/);
});
