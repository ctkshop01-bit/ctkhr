import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const EMPLOYEE_PAYROLL_PAGE_PATH = resolve(process.cwd(), "src", "pages", "employee", "Payroll.tsx");
const TRANSLATIONS_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("employee payroll page source includes payroll breakdown fields", () => {
  const source = readFileSync(EMPLOYEE_PAYROLL_PAGE_PATH, "utf8");

  assert.match(source, /employee\.payroll\.paidLeaveDays/);
  assert.match(source, /employee\.payroll\.unpaidLeaveDays/);
  assert.match(source, /employee\.payroll\.unpaidLeaveDeduction/);
  assert.match(source, /employee\.payroll\.missingDays/);
  assert.match(source, /employee\.payroll\.missingDeduction/);
});

test("translations define payroll breakdown labels in both languages", () => {
  const source = readFileSync(TRANSLATIONS_PATH, "utf8");

  assert.match(source, /"employee\.payroll\.breakdown":/);
  assert.match(source, /"employee\.payroll\.breakdownDesc":/);
  assert.match(source, /"employee\.payroll\.paidLeaveDays":/);
  assert.match(source, /"employee\.payroll\.unpaidLeaveDays":/);
  assert.match(source, /"employee\.payroll\.unpaidLeaveDeduction":/);
  assert.match(source, /"employee\.payroll\.missingDays":/);
  assert.match(source, /"employee\.payroll\.missingDeduction":/);
});
