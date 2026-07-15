import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_PATH = resolve(process.cwd(), "src", "App.tsx");
const LAYOUT_PATH = resolve(process.cwd(), "src", "pages", "admin", "AdminLayout.tsx");
const APPROVALS_PATH = resolve(process.cwd(), "src", "pages", "admin", "Approvals.tsx");
const EMPLOYEES_PATH = resolve(process.cwd(), "src", "pages", "admin", "Employees.tsx");

test("admin app wires approval settings route and nav entry", () => {
  const appSource = readFileSync(APP_PATH, "utf8");
  const layoutSource = readFileSync(LAYOUT_PATH, "utf8");

  assert.match(appSource, /path="approval-settings"/);
  assert.match(layoutSource, /to: "\/admin\/approval-settings"/);
});

test("approvals and employees pages show approval and leave balance context", () => {
  const approvalsSource = readFileSync(APPROVALS_PATH, "utf8");
  const employeesSource = readFileSync(EMPLOYEES_PATH, "utf8");

  assert.match(approvalsSource, /approvalSettings/);
  assert.match(approvalsSource, /approvalLogs/);
  assert.match(employeesSource, /leaveBalances/);
  assert.match(employeesSource, /closingBalanceDays/);
});
