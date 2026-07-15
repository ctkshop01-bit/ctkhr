import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_PATH = resolve(process.cwd(), "src", "App.tsx");
const EMP_LAYOUT_PATH = resolve(process.cwd(), "src", "pages", "employee", "EmployeeLayout.tsx");
const EMP_TASKS_PATH = resolve(process.cwd(), "src", "pages", "employee", "Tasks.tsx");
const EMP_CLOCK_PATH = resolve(process.cwd(), "src", "pages", "employee", "Clock.tsx");
const ADMIN_LAYOUT_PATH = resolve(process.cwd(), "src", "pages", "admin", "AdminLayout.tsx");
const ADMIN_DASHBOARD_PATH = resolve(process.cwd(), "src", "pages", "admin", "Dashboard.tsx");
const ADMIN_APPROVALS_PATH = resolve(process.cwd(), "src", "pages", "admin", "Approvals.tsx");
const I18N_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("performance routes, nav labels and task interactions are wired", () => {
  const app = readFileSync(APP_PATH, "utf8");
  const employeeLayout = readFileSync(EMP_LAYOUT_PATH, "utf8");
  const employeeTasks = readFileSync(EMP_TASKS_PATH, "utf8");
  const employeeClock = readFileSync(EMP_CLOCK_PATH, "utf8");
  const adminLayout = readFileSync(ADMIN_LAYOUT_PATH, "utf8");
  const adminDashboard = readFileSync(ADMIN_DASHBOARD_PATH, "utf8");
  const adminApprovals = readFileSync(ADMIN_APPROVALS_PATH, "utf8");
  const i18n = readFileSync(I18N_PATH, "utf8");

  assert.match(app, /path="performance"/);
  assert.match(app, /PerformanceSettings/);
  assert.match(app, /PerformanceDashboard/);
  assert.match(employeeLayout, /nav\.performance|\/app\/performance/);
  assert.match(employeeTasks, /submitTaskCompletion/);
  assert.match(employeeTasks, /taskType/);
  assert.match(employeeTasks, /lastReturnReason/);
  assert.match(employeeClock, /performance|evaluate/i);
  assert.match(adminLayout, /nav\.performanceSettings|performance-settings/);
  assert.match(adminLayout, /nav\.performanceDashboard|performance-dashboard/);
  assert.match(adminDashboard, /taskType/);
  assert.match(adminApprovals, /"task"/);
  assert.match(adminApprovals, /reviewTaskCompletion/);
  assert.match(adminApprovals, /submitted/);
  assert.match(i18n, /employee\.performance\.title/);
  assert.match(i18n, /admin\.performance\.title/);
  assert.match(i18n, /admin\.performanceSettings\.title/);
  assert.match(i18n, /admin\.approvals\.tasks/);
});
