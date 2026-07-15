import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import type { AppDb } from "../src/types/domain.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

const DB_STORE_PATH = resolve(process.cwd(), "src", "stores", "dbStore.ts");

async function startServer(db: AppDb) {
  const root = await mkdtemp(join(tmpdir(), "hr-notify-"));
  const dataFilePath = join(root, "app-db.json");
  writeFileSync(dataFilePath, JSON.stringify(db, null, 2));
  const server = createHrServer({ dataFilePath });
  await server.listen(0);
  const port = (server.address() as { port: number }).port;
  return { server, port, dataFilePath };
}

test("reviewLeave creates a notification for the employee", async () => {
  const db = createSeedDb();
  const employee = db.users.find(user => user.role === "employee" && user.status === "active");
  const reviewer = db.users.find(user => user.role === "admin" && user.status === "active");
  assert.ok(employee);
  assert.ok(reviewer);
  db.notifications = [];
  db.leaveRequests = [
    {
      id: "leave-1",
      userId: employee.id,
      leaveType: "annual",
      startISO: "2026-07-03T09:00:00.000Z",
      endISO: "2026-07-03T18:00:00.000Z",
      hours: 8,
      reason: "Need leave",
      status: "pending",
      createdAtISO: "2026-07-03T00:00:00.000Z",
    },
  ];

  const { server, port, dataFilePath } = await startServer(db);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "reviewLeave",
        payload: {
          id: "leave-1",
          reviewerId: reviewer.id,
          status: "approved",
          note: "ok",
        },
      }),
    });

    assert.equal(res.status, 200);
    const updated = JSON.parse(readFileSync(dataFilePath, "utf8"));
    assert.equal(updated.notifications.length, 1);
    assert.equal(updated.notifications[0].userId, employee.id);
    assert.equal(updated.notifications[0].type, "leave_reviewed");
    assert.equal(updated.notifications[0].relatedType, "leave");
    assert.equal(updated.notifications[0].relatedId, "leave-1");
    assert.equal(updated.notifications[0].isRead, false);
  } finally {
    await server.close();
  }
});

test("markAllNotificationsRead flips unread messages for one employee only", async () => {
  const db = createSeedDb();
  const employee = db.users.find(user => user.role === "employee" && user.status === "active");
  const other = db.users.find(user => user.role === "admin" && user.status === "active");
  assert.ok(employee);
  assert.ok(other);
  db.notifications = [
    {
      id: "n1",
      userId: employee.id,
      type: "task_created",
      title: "A",
      body: "A",
      relatedType: "task",
      relatedId: "t1",
      isRead: false,
      createdAtISO: "2026-07-03T00:00:00.000Z",
    },
    {
      id: "n2",
      userId: other.id,
      type: "task_created",
      title: "B",
      body: "B",
      relatedType: "task",
      relatedId: "t2",
      isRead: false,
      createdAtISO: "2026-07-03T00:00:00.000Z",
    },
  ];

  const { server, port, dataFilePath } = await startServer(db);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "markAllNotificationsRead",
        payload: { userId: employee.id },
      }),
    });

    assert.equal(res.status, 200);
    const updated = JSON.parse(readFileSync(dataFilePath, "utf8"));
    assert.equal(updated.notifications.find(item => item.id === "n1")?.isRead, true);
    assert.equal(updated.notifications.find(item => item.id === "n2")?.isRead, false);
  } finally {
    await server.close();
  }
});

test("db store wires notification read actions through shared commands", () => {
  const source = readFileSync(DB_STORE_PATH, "utf8");

  assert.match(source, /markNotificationRead:\s*async/);
  assert.match(source, /markAllNotificationsRead:\s*async/);
  assert.match(source, /type:\s*"markNotificationRead"/);
  assert.match(source, /type:\s*"markAllNotificationsRead"/);
});
