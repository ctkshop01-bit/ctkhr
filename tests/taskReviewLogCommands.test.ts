import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

test("task submit and review commands append task review logs", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-task-review-log-"));
  const server = createHrServer({ dataFilePath: join(root, "app-db.json") });
  const db = createSeedDb();

  db.tasks = [
    {
      id: "tsk_1",
      title: "same day task",
      status: "open",
      taskType: "same_day",
      includeInPerformance: true,
      createdAtISO: "2026-07-15T08:00:00.000Z",
    },
  ];

  await server.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const importRes = await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ db }),
    });
    assert.equal(importRes.status, 200);

    const submitRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "submitTaskCompletion",
        payload: {
          taskId: "tsk_1",
          userId: "usr_e001",
          submittedAtISO: "2026-07-15T16:00:00.000Z",
        },
      }),
    });
    assert.equal(submitRes.status, 200);

    const reviewRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "reviewTaskCompletion",
        payload: {
          taskId: "tsk_1",
          reviewerId: "usr_admin",
          action: "return",
          reason: "missing photos",
        },
      }),
    });
    assert.equal(reviewRes.status, 200);

    const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
    assert.equal(snapshotRes.status, 200);
    const snapshotJson = await snapshotRes.json();

    assert.equal(snapshotJson.db.taskReviewLogs.length, 2);
    assert.equal(snapshotJson.db.taskReviewLogs[0].action, "return");
    assert.equal(snapshotJson.db.taskReviewLogs[0].fromStatus, "submitted");
    assert.equal(snapshotJson.db.taskReviewLogs[0].toStatus, "returned");
    assert.equal(snapshotJson.db.taskReviewLogs[0].reason, "missing photos");
    assert.equal(snapshotJson.db.taskReviewLogs[1].action, "submit");
    assert.equal(snapshotJson.db.taskReviewLogs[1].fromStatus, "open");
    assert.equal(snapshotJson.db.taskReviewLogs[1].toStatus, "submitted");
  } finally {
    await server.close();
  }
});

test("task confirm clears stale return reason after resubmission", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-task-review-confirm-"));
  const server = createHrServer({ dataFilePath: join(root, "app-db.json") });
  const db = createSeedDb();

  db.tasks = [
    {
      id: "tsk_confirm_1",
      title: "same day task",
      status: "open",
      taskType: "same_day",
      includeInPerformance: true,
      createdAtISO: "2026-07-15T08:00:00.000Z",
    },
  ];

  await server.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const importRes = await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ db }),
    });
    assert.equal(importRes.status, 200);

    for (const command of [
      {
        type: "submitTaskCompletion",
        payload: {
          taskId: "tsk_confirm_1",
          userId: "usr_e001",
          submittedAtISO: "2026-07-15T16:00:00.000Z",
        },
      },
      {
        type: "reviewTaskCompletion",
        payload: {
          taskId: "tsk_confirm_1",
          reviewerId: "usr_admin",
          action: "return",
          reason: "missing photos",
        },
      },
      {
        type: "submitTaskCompletion",
        payload: {
          taskId: "tsk_confirm_1",
          userId: "usr_e001",
          submittedAtISO: "2026-07-15T16:05:00.000Z",
        },
      },
      {
        type: "reviewTaskCompletion",
        payload: {
          taskId: "tsk_confirm_1",
          reviewerId: "usr_admin",
          action: "confirm",
        },
      },
    ]) {
      const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      assert.equal(res.status, 200);
    }

    const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
    assert.equal(snapshotRes.status, 200);
    const snapshotJson = await snapshotRes.json();
    const task = snapshotJson.db.tasks.find((item: { id: string }) => item.id === "tsk_confirm_1");

    assert.equal(task.status, "confirmed");
    assert.equal(task.lastReturnReason, undefined);
  } finally {
    await server.close();
  }
});
