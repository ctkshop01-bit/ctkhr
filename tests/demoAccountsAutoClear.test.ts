import test from "node:test";
import assert from "node:assert/strict";
import type { AppDb, User } from "../src/types/domain.js";
import { clearBuiltInDemoUserData, getSeedUserId } from "../src/data/seedUserIds.js";

test("clearBuiltInDemoUserData removes records for built-in demo users only", () => {
  const e001 = getSeedUserId("e001")!;
  const admin = getSeedUserId("admin")!;

  const users: User[] = [
    {
      id: admin,
      username: "admin",
      passwordHash: "admin123",
      name: "admin",
      role: "admin",
      baseSalaryCents: 0,
      status: "active",
      createdAtISO: "2026-06-01T00:00:00Z",
    },
    {
      id: e001,
      username: "e001",
      passwordHash: "123456",
      name: "e001",
      role: "employee",
      baseSalaryCents: 1,
      status: "active",
      createdAtISO: "2026-06-01T00:00:00Z",
    },
    {
      id: "usr_real",
      username: "real",
      passwordHash: "pw",
      name: "real",
      role: "employee",
      baseSalaryCents: 1,
      status: "active",
      createdAtISO: "2026-06-01T00:00:00Z",
    },
  ];

  const db: AppDb = {
    users,
    clockEvents: [
      { id: "c1", userId: e001, type: "in", timeISO: "2026-06-01T00:00:00Z" },
      { id: "c2", userId: "usr_real", type: "in", timeISO: "2026-06-01T00:00:00Z" },
    ],
    attendanceDaily: [
      { id: "a1", userId: e001, dateISO: "2026-06-01", status: "missing", abnormalReason: "reason.missing" },
      { id: "a2", userId: "usr_real", dateISO: "2026-06-01", status: "missing", abnormalReason: "reason.missing" },
    ],
    leaveRequests: [
      {
        id: "l1",
        userId: e001,
        leaveType: "annual",
        startISO: "2026-06-01T00:00:00Z",
        endISO: "2026-06-01T01:00:00Z",
        hours: 1,
        reason: "x",
        status: "pending",
        createdAtISO: "2026-06-01T00:00:00Z",
      },
    ],
    overtimeRequests: [
      {
        id: "o1",
        userId: e001,
        startISO: "2026-06-01T00:00:00Z",
        endISO: "2026-06-01T01:00:00Z",
        hours: 1,
        hourlyRateCents: 1,
        overtimePayCents: 1,
        reason: "x",
        status: "pending",
        createdAtISO: "2026-06-01T00:00:00Z",
      },
    ],
    deductionRules: [],
    payrollItems: [
      {
        id: "p1",
        userId: e001,
        monthISO: "2026-06",
        baseSalaryCents: 1,
        overtimePayCents: 1,
        deductionsCents: 0,
        netPayCents: 2,
        generatedAtISO: "2026-06-01T00:00:00Z",
      },
    ],
    announcements: [],
    announcementReads: [{ id: "ar1", announcementId: "ann", userId: e001, readAtISO: "2026-06-01T00:00:00Z" }],
    tasks: [],
    taskAssignees: [
      { id: "ta1", taskId: "t1", userId: admin },
      { id: "ta2", taskId: "t1", userId: "usr_real" },
      { id: "ta3", taskId: "all", userId: "all" },
    ],
  };

  const cleaned = clearBuiltInDemoUserData(db);

  assert.equal(cleaned.users.length, 3);
  assert.deepEqual(cleaned.clockEvents.map(x => x.id), ["c2"]);
  assert.deepEqual(cleaned.attendanceDaily.map(x => x.id), ["a2"]);
  assert.deepEqual(cleaned.leaveRequests.map(x => x.id), []);
  assert.deepEqual(cleaned.overtimeRequests.map(x => x.id), []);
  assert.deepEqual(cleaned.payrollItems.map(x => x.id), []);
  assert.deepEqual(cleaned.announcementReads.map(x => x.id), []);
  assert.deepEqual(cleaned.taskAssignees.map(x => x.id), ["ta2", "ta3"]);
});
