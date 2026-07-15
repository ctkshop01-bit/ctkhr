import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

async function startServer(db: any) {
  const root = await mkdtemp(join(tmpdir(), "hr-approval-"));
  const dataFilePath = join(root, "app-db.json");
  writeFileSync(dataFilePath, JSON.stringify(db, null, 2));
  const server = createHrServer({ dataFilePath });
  await server.listen(0);
  const port = (server.address() as { port: number }).port;
  return { server, port, dataFilePath };
}

test("submitLeave rejects when leave reviewer is not configured", async () => {
  const db = createSeedDb();
  const employee = db.users.find(user => user.role === "employee" && user.status === "active");
  assert.ok(employee);
  db.approvalSettings = {
    leaveReviewerUserId: null,
    overtimeReviewerUserId: null,
    attendanceReviewerUserId: null,
  };

  const { server, port } = await startServer(db);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "submitLeave",
        payload: {
          userId: employee.id,
          leaveType: "annual",
          startISO: "2026-07-03T09:00:00.000Z",
          endISO: "2026-07-03T18:00:00.000Z",
          hours: 8,
          reason: "Need leave",
        },
      }),
    });
    const json = await res.json();

    assert.equal(res.status, 400);
    assert.equal(json.ok, false);
    assert.match(json.message, /leave reviewer/i);
  } finally {
    await server.close();
  }
});

test("submitOvertime rejects when overtime reviewer is not configured", async () => {
  const db = createSeedDb();
  const employee = db.users.find(user => user.role === "employee" && user.status === "active");
  const reviewer = db.users.find(user => user.role === "admin" && user.status === "active");
  assert.ok(employee);
  assert.ok(reviewer);
  db.approvalSettings = {
    leaveReviewerUserId: reviewer.id,
    overtimeReviewerUserId: null,
    attendanceReviewerUserId: reviewer.id,
  };

  const { server, port } = await startServer(db);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "submitOvertime",
        payload: {
          userId: employee.id,
          startISO: "2026-07-03T18:00:00.000Z",
          endISO: "2026-07-03T21:00:00.000Z",
          reason: "Project launch",
        },
      }),
    });
    const json = await res.json();

    assert.equal(res.status, 400);
    assert.equal(json.ok, false);
    assert.match(json.message, /overtime reviewer/i);
  } finally {
    await server.close();
  }
});

test("updateApprovalSettings persists reviewer ids into shared db", async () => {
  const db = createSeedDb();
  const activeReviewer = db.users.find(user => user.status === "active" && user.role === "employee");
  assert.ok(activeReviewer);

  const { server, port, dataFilePath } = await startServer(db);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "updateApprovalSettings",
        payload: {
          leaveReviewerUserId: activeReviewer.id,
          overtimeReviewerUserId: activeReviewer.id,
          attendanceReviewerUserId: activeReviewer.id,
        },
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true);

    const updated = JSON.parse(readFileSync(dataFilePath, "utf8"));
    assert.equal(updated.approvalSettings.leaveReviewerUserId, activeReviewer.id);
    assert.equal(updated.approvalSettings.overtimeReviewerUserId, activeReviewer.id);
    assert.equal(updated.approvalSettings.attendanceReviewerUserId, activeReviewer.id);
  } finally {
    await server.close();
  }
});

test("reviewLeave writes approval log entry", async () => {
  const db = createSeedDb();
  const employee = db.users.find(user => user.role === "employee" && user.status === "active");
  const reviewer = db.users.find(user => user.role === "admin" && user.status === "active");
  assert.ok(employee);
  assert.ok(reviewer);
  db.approvalSettings = {
    leaveReviewerUserId: reviewer.id,
    overtimeReviewerUserId: reviewer.id,
    attendanceReviewerUserId: reviewer.id,
  };
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
    },
  ];
  db.approvalLogs = [];

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
          note: "Approved",
        },
      }),
    });

    assert.equal(res.status, 200);
    const updated = JSON.parse(readFileSync(dataFilePath, "utf8"));
    assert.equal(updated.approvalLogs.length, 1);
    assert.equal(updated.approvalLogs[0].requestType, "leave");
    assert.equal(updated.approvalLogs[0].requestId, "leave-1");
    assert.equal(updated.approvalLogs[0].submitterUserId, employee.id);
    assert.equal(updated.approvalLogs[0].reviewerUserId, reviewer.id);
    assert.equal(updated.approvalLogs[0].decision, "approved");
    assert.equal(updated.approvalLogs[0].note, "Approved");
  } finally {
    await server.close();
  }
});

test("confirmAttendance writes approval log entry with configured attendance reviewer", async () => {
  const db = createSeedDb();
  const employee = db.users.find(user => user.role === "employee" && user.status === "active");
  const reviewer = db.users.find(user => user.role === "admin" && user.status === "active");
  assert.ok(employee);
  assert.ok(reviewer);
  db.approvalSettings = {
    leaveReviewerUserId: reviewer.id,
    overtimeReviewerUserId: reviewer.id,
    attendanceReviewerUserId: reviewer.id,
  };
  db.attendanceDaily = [
    {
      id: "att-1",
      userId: employee.id,
      dateISO: "2026-07-03",
      status: "missing",
      abnormalReason: "reason.missing",
      confirmed: false,
    },
  ];
  db.approvalLogs = [];

  const { server, port, dataFilePath } = await startServer(db);

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "confirmAttendance",
        payload: {
          attendanceId: "att-1",
          patch: {
            clockInISO: "2026-07-03T09:00:00.000Z",
            clockOutISO: "2026-07-03T18:00:00.000Z",
            abnormalReason: "Manual confirmation",
          },
        },
      }),
    });

    assert.equal(res.status, 200);
    const updated = JSON.parse(readFileSync(dataFilePath, "utf8"));
    assert.equal(updated.approvalLogs.length, 1);
    assert.equal(updated.approvalLogs[0].requestType, "attendance");
    assert.equal(updated.approvalLogs[0].requestId, "att-1");
    assert.equal(updated.approvalLogs[0].submitterUserId, employee.id);
    assert.equal(updated.approvalLogs[0].reviewerUserId, reviewer.id);
    assert.equal(updated.approvalLogs[0].decision, "confirmed");
    assert.equal(updated.approvalLogs[0].note, "Manual confirmation");
  } finally {
    await server.close();
  }
});
