import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { allocateLeaveUsage, buildNextLeaveBalance } from "../src/stores/leaveBalancePolicy";

const DOMAIN_PATH = resolve(process.cwd(), "src", "types", "domain.ts");
const SEED_PATH = resolve(process.cwd(), "src", "data", "seedDb.ts");

test("domain defines notification, leave balance, and approval settings structures", () => {
  const source = readFileSync(DOMAIN_PATH, "utf8");

  assert.match(source, /export type NotificationType = "leave_reviewed" \| "overtime_reviewed" \| "attendance_confirmed" \| "announcement_published" \| "task_created"/);
  assert.match(source, /export interface NotificationItem/);
  assert.match(source, /export interface LeaveBalanceItem/);
  assert.match(source, /export interface LeavePolicySettings/);
  assert.match(source, /export interface ApprovalSettings/);
  assert.match(source, /export interface ApprovalLogItem/);
  assert.match(source, /notifications: NotificationItem\[\]/);
  assert.match(source, /leaveBalances: LeaveBalanceItem\[\]/);
  assert.match(source, /leavePolicySettings: LeavePolicySettings/);
  assert.match(source, /approvalSettings: ApprovalSettings/);
  assert.match(source, /approvalLogs: ApprovalLogItem\[\]/);
});

test("seed db initializes additive defaults for notifications, leave balances, and approval settings", () => {
  const source = readFileSync(SEED_PATH, "utf8");

  assert.match(source, /notifications: \[\]/);
  assert.match(source, /leaveBalances: \[\]/);
  assert.match(source, /carryoverMode: "none"/);
  assert.match(source, /carryoverCapDays: 0/);
  assert.match(source, /approvalSettings: \{/);
  assert.match(source, /leaveReviewerUserId: null/);
  assert.match(source, /approvalLogs: \[\]/);
});

test("allocateLeaveUsage consumes paid leave before unpaid leave", () => {
  assert.deepEqual(
    allocateLeaveUsage({ requestedDays: 5, availablePaidDays: 3 }),
    { usedPaidDays: 3, usedUnpaidDays: 2 },
  );
});

test("buildNextLeaveBalance applies capped carryover", () => {
  assert.deepEqual(
    buildNextLeaveBalance({
      month: "2026-08",
      grantDays: 4,
      previousClosingBalanceDays: 6,
      carryoverMode: "capped",
      carryoverCapDays: 2,
      usedPaidDays: 1,
      usedUnpaidDays: 0,
    }),
    {
      month: "2026-08",
      grantedDays: 4,
      carriedDays: 2,
      usedPaidDays: 1,
      usedUnpaidDays: 0,
      expiredDays: 4,
      closingBalanceDays: 5,
    },
  );
});
