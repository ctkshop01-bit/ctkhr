import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ADMIN_APPROVALS_PATH = resolve(process.cwd(), "src", "pages", "admin", "Approvals.tsx");
const EMP_TASKS_PATH = resolve(process.cwd(), "src", "pages", "employee", "Tasks.tsx");
const I18N_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("task review log ui is wired for admin and employee pages", () => {
  const adminApprovals = readFileSync(ADMIN_APPROVALS_PATH, "utf8");
  const employeeTasks = readFileSync(EMP_TASKS_PATH, "utf8");
  const i18n = readFileSync(I18N_PATH, "utf8");

  assert.match(adminApprovals, /taskReviewLogs/);
  assert.match(adminApprovals, /admin\.approvals\.taskReviewHistory/);
  assert.match(adminApprovals, /admin\.approvals\.taskReviewEmpty/);
  assert.match(employeeTasks, /taskReviewLogs/);
  assert.match(employeeTasks, /employee\.tasks\.latestReview/);
  assert.match(employeeTasks, /employee\.tasks\.latestReviewedAt/);
  assert.match(i18n, /admin\.approvals\.taskReviewHistory/);
  assert.match(i18n, /admin\.approvals\.taskReviewEmpty/);
  assert.match(i18n, /employee\.tasks\.latestReview/);
});
