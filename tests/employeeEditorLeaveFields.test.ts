import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const EMPLOYEES_PAGE_PATH = resolve(process.cwd(), "src", "pages", "admin", "Employees.tsx");
const TRANSLATIONS_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("employee editor source includes employment type and monthly paid leave fields", () => {
  const source = readFileSync(EMPLOYEES_PAGE_PATH, "utf8");

  assert.match(source, /employmentType/);
  assert.match(source, /monthlyPaidLeaveDays/);
  assert.match(source, /admin\.employees\.employmentType/);
  assert.match(source, /admin\.employees\.monthlyPaidLeaveDays/);
  assert.match(source, /employmentType:\s*form\.employmentType/);
  assert.match(source, /monthlyPaidLeaveDays:\s*[^,\n]+/);
});

test("translations define employee type and monthly paid leave labels in both languages", () => {
  const source = readFileSync(TRANSLATIONS_PATH, "utf8");

  assert.match(source, /"admin\.employees\.employmentType":/);
  assert.match(source, /"admin\.employees\.employmentTypeRegular":/);
  assert.match(source, /"admin\.employees\.employmentTypeProbation":/);
  assert.match(source, /"admin\.employees\.monthlyPaidLeaveDays":/);
  assert.match(source, /"admin\.employees\.monthlyPaidLeaveDaysHint":/);
});

test("employee editor refreshes shared snapshot after save and status changes", () => {
  const source = readFileSync(EMPLOYEES_PAGE_PATH, "utf8");

  assert.match(source, /const db = useDbStore\(\)/);
  assert.match(source, /const \{ users, upsertEmployee, setUserStatus, loadSharedSnapshot, leaveBalances \} = db/);
  assert.match(source, /await loadSharedSnapshot\(\)/);
  assert.match(source, /await upsertEmployee\(\{/);
  assert.match(source, /await setUserStatus\(u\.id, u\.status === "active" \? "inactive" : "active"\)/);
});
