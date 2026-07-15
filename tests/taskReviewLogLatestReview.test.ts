import test from "node:test";
import assert from "node:assert/strict";
import { buildLatestReviewByTaskId } from "../src/pages/employee/taskReviewLogs";

test("latest review picks the newest confirm or return log per task", () => {
  const latestReviewByTaskId = buildLatestReviewByTaskId([
    {
      id: "log_return",
      taskId: "task_1",
      userId: "usr_e001",
      action: "return",
      fromStatus: "submitted",
      toStatus: "returned",
      operatorUserId: "usr_admin",
      operatorRole: "admin",
      reason: "need attachment",
      createdAtISO: "2026-07-15T16:13:34.149Z",
    },
    {
      id: "log_submit",
      taskId: "task_1",
      userId: "usr_e001",
      action: "submit",
      fromStatus: "returned",
      toStatus: "submitted",
      operatorUserId: "usr_e001",
      operatorRole: "employee",
      createdAtISO: "2026-07-15T16:14:22.463Z",
    },
    {
      id: "log_confirm",
      taskId: "task_1",
      userId: "usr_e001",
      action: "confirm",
      fromStatus: "submitted",
      toStatus: "confirmed",
      operatorUserId: "usr_admin",
      operatorRole: "admin",
      createdAtISO: "2026-07-15T16:15:24.106Z",
    },
  ]);

  assert.equal(latestReviewByTaskId.get("task_1")?.action, "confirm");
  assert.equal(latestReviewByTaskId.get("task_1")?.toStatus, "confirmed");
  assert.equal(latestReviewByTaskId.get("task_1")?.createdAtISO, "2026-07-15T16:15:24.106Z");
});
