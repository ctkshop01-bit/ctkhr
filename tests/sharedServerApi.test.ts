import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

const DB_STORE_PATH = resolve(process.cwd(), "src", "stores", "dbStore.ts");

test("bootstrap reports uninitialized shared db before import", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/api/bootstrap`);
  const json = await res.json();

  assert.equal(json.initialized, false);
  await server.close();
});

test("import-local initializes the shared db and login uses the imported users", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;
  const seed = createSeedDb();

  const importRes = await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db: seed }),
  });
  assert.equal(importRes.status, 200);

  const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginJson = await loginRes.json();

  assert.equal(loginRes.status, 200);
  assert.equal(loginJson.ok, true);
  assert.equal(loginJson.user.username, "admin");
  await server.close();
});

test("snapshot reports unavailable before shared db initialization", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const json = await res.json();

  assert.equal(res.status, 503);
  assert.equal(json.ok, false);
  assert.match(json.message, /not initialized/i);
  await server.close();
});

test("shared api responses disable HTTP caching for snapshot and command routes", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;
  const seed = createSeedDb();

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db: seed }),
  });

  const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  assert.equal(snapshotRes.status, 200);
  assert.equal(snapshotRes.headers.get("cache-control"), "no-store, no-cache, must-revalidate");

  const commandRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "upsertTask",
      payload: {
        title: "缓存禁用测试",
        description: "验证共享 API 响应头",
        dueAtISO: undefined,
        status: "open",
      },
    }),
  });
  assert.equal(commandRes.status, 200);
  assert.equal(commandRes.headers.get("cache-control"), "no-store, no-cache, must-revalidate");

  await server.close();
});

test("html shell disables HTTP caching so new deployments do not serve stale index pages", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/login`);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
  assert.equal(res.headers.get("pragma"), "no-cache");
  assert.equal(res.headers.get("expires"), "0");

  await server.close();
});

test("db command rejects writes before shared db initialization", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "upsertEmployee",
      payload: { id: "emp_missing" },
    }),
  });
  const json = await res.json();

  assert.equal(res.status, 503);
  assert.equal(json.ok, false);
  assert.match(json.message, /not initialized/i);
  await server.close();
});

test("login rejects before shared db initialization", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const json = await res.json();

  assert.equal(res.status, 503);
  assert.equal(json.ok, false);
  assert.match(json.message, /not initialized/i);
  await server.close();
});

test("db command updates shared users and snapshot returns the new value", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;
  const seed = createSeedDb();

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db: seed }),
  });

  const employee = seed.users.find(item => item.role === "employee");
  assert.ok(employee);

  const commandRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "upsertEmployee",
      payload: { ...employee, name: "共享版员工A" },
    }),
  });
  const commandJson = await commandRes.json();
  assert.equal(commandRes.status, 200);
  assert.equal(commandJson.ok, true);

  const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const snapshotJson = await snapshotRes.json();
  assert.equal(snapshotRes.status, 200);
  assert.equal(snapshotJson.db.users.find(item => item.id === employee.id)?.name, "共享版员工A");
  await server.close();
});

test("db command rejects unsupported command types", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;
  const seed = createSeedDb();

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db: seed }),
  });

  const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "unsupported-command",
      payload: {},
    }),
  });
  const json = await res.json();

  assert.equal(res.status, 400);
  assert.equal(json.ok, false);
  assert.match(json.message, /unsupported command/i);
  await server.close();
});

test("announcement commands persist create-read-delete changes through shared db", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;
  const seed = createSeedDb();
  const employee = seed.users.find(item => item.role === "employee");
  assert.ok(employee);

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db: seed }),
  });

  const createRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "upsertAnnouncement",
      payload: {
        title: "共享公告",
        content: "测试公告链路",
        pinned: false,
      },
    }),
  });
  const createJson = await createRes.json();
  assert.equal(createRes.status, 200);
  assert.equal(createJson.ok, true);
  assert.equal(createJson.result.title, "共享公告");

  const createdAnnouncementId = createJson.result.id;
  assert.ok(createdAnnouncementId);

  const readRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "markAnnouncementRead",
      payload: {
        announcementId: createdAnnouncementId,
        userId: employee.id,
      },
    }),
  });
  const readJson = await readRes.json();
  assert.equal(readRes.status, 200);
  assert.equal(readJson.ok, true);

  const afterReadRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const afterReadJson = await afterReadRes.json();
  assert.equal(afterReadRes.status, 200);
  assert.equal(afterReadJson.db.announcements.some(item => item.id === createdAnnouncementId), true);
  assert.equal(
    afterReadJson.db.announcementReads.some(
      item => item.announcementId === createdAnnouncementId && item.userId === employee.id,
    ),
    true,
  );

  const deleteRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "deleteAnnouncement",
      payload: {
        id: createdAnnouncementId,
      },
    }),
  });
  const deleteJson = await deleteRes.json();
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteJson.ok, true);

  const afterDeleteRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const afterDeleteJson = await afterDeleteRes.json();
  assert.equal(afterDeleteRes.status, 200);
  assert.equal(afterDeleteJson.db.announcements.some(item => item.id === createdAnnouncementId), false);
  assert.equal(afterDeleteJson.db.announcementReads.some(item => item.announcementId === createdAnnouncementId), false);
  await server.close();
});

test("task commands persist create-toggle-delete changes through shared db", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({
    distDir: join(process.cwd(), "dist"),
    dataFilePath: join(root, "app-db.json"),
  });
  await server.listen(0);
  const port = server.address().port;
  const seed = createSeedDb();

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db: seed }),
  });

  const createRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "upsertTask",
      payload: {
        title: "共享任务",
        description: "测试任务链路",
        dueAtISO: "2026-07-31T09:00:00.000Z",
        status: "open",
        taskType: "same_day",
        includeInPerformance: true,
      },
    }),
  });
  const createJson = await createRes.json();
  assert.equal(createRes.status, 200);
  assert.equal(createJson.ok, true);
  assert.equal(createJson.result.status, "open");
  assert.equal(createJson.result.taskType, "same_day");
  assert.equal(createJson.result.includeInPerformance, true);

  const createdTaskId = createJson.result.id;
  assert.ok(createdTaskId);

  const toggleRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "toggleTaskDone",
      payload: {
        taskId: createdTaskId,
      },
    }),
  });
  const toggleJson = await toggleRes.json();
  assert.equal(toggleRes.status, 200);
  assert.equal(toggleJson.ok, true);

  const afterToggleRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const afterToggleJson = await afterToggleRes.json();
  assert.equal(afterToggleRes.status, 200);
  assert.equal(afterToggleJson.db.tasks.find(item => item.id === createdTaskId)?.status, "done");
  assert.equal(afterToggleJson.db.tasks.find(item => item.id === createdTaskId)?.taskType, "same_day");
  assert.equal(afterToggleJson.db.tasks.find(item => item.id === createdTaskId)?.includeInPerformance, true);

  const deleteRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "deleteTask",
      payload: {
        id: createdTaskId,
      },
    }),
  });
  const deleteJson = await deleteRes.json();
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteJson.ok, true);

  const afterDeleteRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const afterDeleteJson = await afterDeleteRes.json();
  assert.equal(afterDeleteRes.status, 200);
  assert.equal(afterDeleteJson.db.tasks.some(item => item.id === createdTaskId), false);
  await server.close();
});

test("db store wires notification and approval settings commands through shared api", () => {
  const source = readFileSync(DB_STORE_PATH, "utf8");

  assert.match(source, /markNotificationRead:\s*async/);
  assert.match(source, /markAllNotificationsRead:\s*async/);
  assert.match(source, /updateApprovalSettings:\s*async/);
  assert.match(source, /updateLeavePolicySettings:\s*async/);
});
