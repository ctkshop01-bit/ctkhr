import test from "node:test";
import assert from "node:assert/strict";
import type { AppDb, User } from "../src/types/domain.js";
import { createAdminAccountUpdater } from "../src/data/adminAccount.js";

function baseDb(adminPasswordHash: string): AppDb {
  const admin: User = {
    id: "usr_admin",
    username: "admin",
    passwordHash: adminPasswordHash,
    name: "admin",
    role: "admin",
    baseSalaryCents: 0,
    status: "active",
    createdAtISO: "2026-06-01T00:00:00Z",
  };
  const employee: User = {
    id: "usr_e",
    username: "e1",
    passwordHash: "pw",
    name: "e1",
    role: "employee",
    baseSalaryCents: 0,
    status: "active",
    createdAtISO: "2026-06-01T00:00:00Z",
  };

  return {
    users: [admin, employee],
    clockEvents: [],
    attendanceDaily: [],
    leaveRequests: [],
    overtimeRequests: [],
    deductionRules: [],
    payrollItems: [],
    announcements: [],
    announcementReads: [],
    tasks: [],
    taskAssignees: [],
  };
}

test("updates single admin username/password when current password matches", async () => {
  const updater = createAdminAccountUpdater(baseDb("admin123"));
  const result = await updater.update({
    currentPassword: "admin123",
    newUsername: "boss",
    newPassword: "newpw",
  });

  assert.equal(result.ok, true);
  assert.equal(result.db!.users.find(user => user.role === "admin")!.username, "boss");
  assert.notEqual(result.db!.users.find(user => user.role === "admin")!.passwordHash, "admin123");
});

test("rejects update when current password is wrong", async () => {
  const updater = createAdminAccountUpdater(baseDb("admin123"));
  const result = await updater.update({
    currentPassword: "bad",
    newUsername: "boss",
    newPassword: "newpw",
  });

  assert.deepEqual(result, { ok: false, code: "bad_current_password" });
});

test("rejects update when new username conflicts with existing user", async () => {
  const updater = createAdminAccountUpdater(baseDb("admin123"));
  const result = await updater.update({
    currentPassword: "admin123",
    newUsername: "e1",
    newPassword: "newpw",
  });

  assert.deepEqual(result, { ok: false, code: "username_taken" });
});
