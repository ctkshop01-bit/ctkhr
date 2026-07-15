import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

const DB_STORE_PATH = resolve(process.cwd(), "src", "stores", "dbStore.ts");

test("clock out evaluation creates task penalty, warning, and monthly summary", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-performance-clockout-"));
  const server = createHrServer({ dataFilePath: join(root, "app-db.json") });
  const db = createSeedDb();

  db.performanceSettings.warningRules.taskUnfinishedThreshold = 1;
  db.users = [
    {
      id: "emp_1",
      username: "emp_1",
      passwordHash: "123456",
      name: "员工A",
      role: "employee",
      status: "active",
      baseSalaryCents: 200000,
      createdAtISO: "2026-07-01T00:00:00.000Z",
    },
  ];
  db.tasks = [
    {
      id: "tsk_1",
      title: "same day task",
      status: "open",
      taskType: "same_day",
      includeInPerformance: true,
      createdAtISO: "2026-07-15T08:00:00.000Z",
    },
    {
      id: "tsk_2",
      title: "same day task 2",
      status: "open",
      taskType: "same_day",
      includeInPerformance: true,
      createdAtISO: "2026-07-15T08:30:00.000Z",
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

    const evalRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "evaluateSameDayTasksOnClockOut",
        payload: {
          userId: "emp_1",
          dateISO: "2026-07-15",
          clockOutAtISO: "2026-07-15T18:00:00.000Z",
        },
      }),
    });
    assert.equal(evalRes.status, 200);

    const firstSnapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
    const firstSnapshotJson = await firstSnapshotRes.json();

    assert.equal(firstSnapshotJson.db.performanceEvents.length, 2);
    assert.equal(firstSnapshotJson.db.performanceEvents[0].eventType, "warning_triggered");
    assert.equal(firstSnapshotJson.db.performanceEvents[1].eventType, "task_unfinished_tier_2");
    assert.equal(firstSnapshotJson.db.performanceWarnings.length, 1);
    assert.equal(firstSnapshotJson.db.performanceWarnings[0].warningType, "task_unfinished");
    assert.equal(firstSnapshotJson.db.performanceWarnings[0].triggerCount, 1);
    assert.equal(firstSnapshotJson.db.performanceWarnings[0].threshold, 1);

    const summaryRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "generatePerformanceMonthlySummary",
        payload: { month: "2026-07" },
      }),
    });
    assert.equal(summaryRes.status, 200);

    const finalSnapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
    const finalSnapshotJson = await finalSnapshotRes.json();

    assert.equal(finalSnapshotJson.db.performanceMonthlySummaries.length, 1);
    assert.equal(finalSnapshotJson.db.performanceMonthlySummaries[0].finalScore, 97);
    assert.equal(finalSnapshotJson.db.performanceMonthlySummaries[0].warningCount, 1);
    assert.equal(finalSnapshotJson.db.performanceMonthlySummaries[0].kpiRate, 1);
  } finally {
    await server.close();
  }
});

test("monthly summary falls back to tiered KPI rules when legacy db misses performance settings", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-performance-legacy-"));
  const server = createHrServer({ dataFilePath: join(root, "app-db.json") });
  const db = createSeedDb();
  delete (db as typeof db & { performanceSettings?: unknown }).performanceSettings;
  db.users = [
    {
      id: "emp_legacy",
      username: "emp_legacy",
      passwordHash: "123456",
      name: "员工旧数据",
      role: "employee",
      status: "active",
      baseSalaryCents: 200000,
      createdAtISO: "2026-07-01T00:00:00.000Z",
    },
  ];
  db.performanceEvents = [
    {
      id: "pfe_reward_1",
      userId: "emp_legacy",
      month: "2026-07",
      dateISO: "2026-07-15",
      category: "reward",
      eventType: "task_all_completed",
      scoreDelta: 2,
      warningDelta: 0,
      relatedTaskId: null,
      note: "legacy summary should still use tiered KPI fallback",
      createdAtISO: "2026-07-15T18:00:00.000Z",
      createdBy: "system",
      isReverted: false,
    },
  ];
  db.performanceWarnings = [];
  db.performanceMonthlySummaries = [];

  await server.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const importRes = await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ db }),
    });
    assert.equal(importRes.status, 200);

    const summaryRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "generatePerformanceMonthlySummary",
        payload: { month: "2026-07" },
      }),
    });
    assert.equal(summaryRes.status, 200);

    const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
    const snapshotJson = await snapshotRes.json();

    assert.equal(snapshotJson.db.performanceMonthlySummaries.length, 1);
    assert.equal(snapshotJson.db.performanceMonthlySummaries[0].finalScore, 102);
    assert.equal(snapshotJson.db.performanceMonthlySummaries[0].kpiRate, 1);
    assert.equal(snapshotJson.db.performanceMonthlySummaries[0].kpiPayoutCents, 100000);
  } finally {
    await server.close();
  }
});

test("db store wires performance settings and summary commands through shared api", () => {
  const source = readFileSync(DB_STORE_PATH, "utf8");

  assert.match(source, /updatePerformanceSettings:\s*async/);
  assert.match(source, /loadPerformanceSummary:\s*async/);
  assert.match(source, /type:\s*"updatePerformanceSettings"/);
  assert.match(source, /type:\s*"loadPerformanceSummary"/);
});
