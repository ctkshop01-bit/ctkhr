import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_PATH = resolve(process.cwd(), "src", "App.tsx");
const LAYOUT_PATH = resolve(process.cwd(), "src", "pages", "employee", "EmployeeLayout.tsx");
const DASHBOARD_PATH = resolve(process.cwd(), "src", "pages", "employee", "Dashboard.tsx");
const REQUESTS_PATH = resolve(process.cwd(), "src", "pages", "employee", "Requests.tsx");

test("employee app wires notifications route and layout entry", () => {
  const appSource = readFileSync(APP_PATH, "utf8");
  const layoutSource = readFileSync(LAYOUT_PATH, "utf8");

  assert.match(appSource, /path="notifications"/);
  assert.match(layoutSource, /to: "\/app\/notifications"/);
  assert.match(layoutSource, /notifications\.filter/);
});

test("employee dashboard and requests page show unread and leave balance hints", () => {
  const dashboardSource = readFileSync(DASHBOARD_PATH, "utf8");
  const requestsSource = readFileSync(REQUESTS_PATH, "utf8");

  assert.match(dashboardSource, /notifications\.filter\(n => !n\.isRead\)/);
  assert.match(dashboardSource, /leaveBalances/);
  assert.match(requestsSource, /availablePaidLeaveDays/);
  assert.match(requestsSource, /expectedPaidDays/);
  assert.match(requestsSource, /expectedUnpaidDays/);
});
