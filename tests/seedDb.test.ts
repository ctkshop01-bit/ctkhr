import test from "node:test";
import assert from "node:assert/strict";
import { createSeedDb } from "../src/data/seedDb.js";
import { getSeedUserId, normalizeBuiltInUserIds } from "../src/data/seedUserIds.js";

test("returns stable ids for built-in demo accounts", () => {
  assert.equal(getSeedUserId("admin"), "usr_admin");
  assert.equal(getSeedUserId("e001"), "usr_e001");
  assert.equal(getSeedUserId("e002"), "usr_e002");
});

test("normalizes persisted records to the stable built-in user ids", () => {
  const normalized = normalizeBuiltInUserIds({
    users: [
      { id: "legacy_admin", username: "admin" } as any,
      { id: "legacy_e001", username: "e001" } as any,
      { id: "legacy_e002", username: "e002" } as any,
      { id: "usr_custom", username: "custom" } as any,
    ],
    clockEvents: [{ id: "clk_1", userId: "legacy_e001" }] as any,
    attendanceDaily: [{ id: "att_1", userId: "legacy_e001" }] as any,
    leaveRequests: [{ id: "lv_1", userId: "legacy_e001" }] as any,
    overtimeRequests: [{ id: "ot_1", userId: "legacy_e001" }] as any,
    payrollItems: [{ id: "pay_1", userId: "legacy_e001" }] as any,
    announcementReads: [{ id: "ar_1", userId: "legacy_e001" }] as any,
    taskAssignees: [{ id: "ta_1", userId: "legacy_e001" }] as any,
  } as any);

  assert.deepEqual(
    normalized.users.map(user => [user.username, user.id]),
    [
      ["admin", "usr_admin"],
      ["e001", "usr_e001"],
      ["e002", "usr_e002"],
      ["custom", "usr_custom"],
    ],
  );
  assert.equal(normalized.overtimeRequests[0].userId, "usr_e001");
  assert.equal(normalized.payrollItems[0].userId, "usr_e001");
  assert.equal(normalized.clockEvents[0].userId, "usr_e001");
});

test("seed employees default to the agreed leave policy", () => {
  const db = createSeedDb();
  const e001 = db.users.find(user => user.username === "e001");
  const e002 = db.users.find(user => user.username === "e002");

  assert.ok(e001);
  assert.ok(e002);

  assert.equal(e001.employmentType, "regular");
  assert.equal(e001.monthlyPaidLeaveDays, 4);
  assert.equal(e002.employmentType, "regular");
  assert.equal(e002.monthlyPaidLeaveDays, 4);
});
