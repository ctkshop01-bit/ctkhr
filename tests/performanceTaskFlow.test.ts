import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

const DB_STORE_PATH = resolve(process.cwd(), "src", "stores", "dbStore.ts");

test("task submit and review commands update lifecycle fields", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-performance-task-"));
  const server = createHrServer({ dataFilePath: join(root, "app-db.json") });
  const db = createSeedDb();
  db.tasks = [
    {
      id: "tsk_same_day",
      title: "Daily cleanup",
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
          taskId: "tsk_same_day",
          userId: "usr_admin",
          submittedAtISO: "2026-07-15T16:00:00.000Z",
        },
      }),
    });
    assert.equal(submitRes.status, 200);

    const submitJson = await submitRes.json();
    assert.equal(submitJson.result.status, "submitted");
    assert.equal(submitJson.result.submittedByUserId, "usr_admin");
    assert.equal(submitJson.result.submittedAtISO, "2026-07-15T16:00:00.000Z");

    const reviewRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "reviewTaskCompletion",
        payload: {
          taskId: "tsk_same_day",
          reviewerId: "usr_admin",
          action: "return",
          reason: "missing photos",
        },
      }),
    });
    assert.equal(reviewRes.status, 200);

    const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
    const snapshotJson = await snapshotRes.json();
    const task = snapshotJson.db.tasks.find((item: { id: string }) => item.id === "tsk_same_day");

    assert.equal(task.status, "returned");
    assert.equal(task.returnCount, 1);
    assert.equal(task.lastReturnReason, "missing photos");
    assert.equal(task.lastReturnedAtISO?.length > 0, true);
  } finally {
    await server.close();
  }
});

test("db store wires task submit and review commands through shared api", () => {
  const source = readFileSync(DB_STORE_PATH, "utf8");

  assert.match(source, /submitTaskCompletion:\s*async/);
  assert.match(source, /reviewTaskCompletion:\s*async/);
  assert.match(source, /type:\s*"submitTaskCompletion"/);
  assert.match(source, /type:\s*"reviewTaskCompletion"/);
});
