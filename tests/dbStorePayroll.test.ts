import assert from "node:assert/strict";
import test from "node:test";
import { applySharedCommand } from "../scripts/server/app-db-commands.mjs";
import { createSeedDb } from "../src/data/seedDb.js";

test("generatePayroll applies payroll policy leave and missing deductions on top of rule-based deductions", async () => {
  const db = {
    users: [
      {
        id: "emp_1",
        username: "emp_1",
        passwordHash: "hash",
        name: "Employee 1",
        role: "employee",
        baseSalaryCents: 2600000,
        employmentType: "regular",
        monthlyPaidLeaveDays: 1,
        status: "active",
        createdAtISO: "2026-06-01T00:00:00.000Z",
      },
    ],
    clockEvents: [],
    attendanceDaily: [
      {
        id: "att_missing",
        userId: "emp_1",
        dateISO: "2026-06-12",
        status: "missing",
      },
      {
        id: "att_late",
        userId: "emp_1",
        dateISO: "2026-06-18",
        status: "late",
      },
    ],
    leaveRequests: [
      {
        id: "leave_1",
        userId: "emp_1",
        leaveType: "annual",
        startISO: "2026-06-03T09:00:00.000Z",
        endISO: "2026-06-04T18:00:00.000Z",
        hours: 16,
        reason: "annual leave",
        status: "approved",
        createdAtISO: "2026-06-01T00:00:00.000Z",
      },
    ],
    overtimeRequests: [],
    deductionRules: [
      {
        id: "rule_late",
        name: "Late",
        type: "late",
        amountCents: 5000,
        enabled: true,
      },
      {
        id: "rule_missing",
        name: "Missing",
        type: "missing",
        amountCents: 20000,
        enabled: true,
      },
      {
        id: "rule_custom",
        name: "Custom",
        type: "custom",
        amountCents: 7000,
        enabled: true,
      },
    ],
    payrollItems: [],
    announcements: [],
    announcementReads: [],
    tasks: [],
    taskAssignees: [],
  };

  const result = await applySharedCommand(db, {
    type: "generatePayroll",
    payload: { monthISO: "2026-06" },
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const [item] = result.result;

  assert.equal(item.baseSalaryCents, 2600000);
  assert.equal(item.overtimePayCents, 0);
  assert.equal(item.paidLeaveDays, 1);
  assert.equal(item.unpaidLeaveDays, 1);
  assert.equal(item.unpaidLeaveDeductionCents, 100000);
  assert.equal(item.missingDays, 1);
  assert.equal(item.missingDeductionCents, 100000);
  assert.equal(item.deductionsCents, 212000);
  assert.equal(item.netPayCents, 2388000);
});

test("generatePayroll uses leave balance carryover and persists current month leave balance", async () => {
  const db = createSeedDb();
  const employee = db.users.find(user => user.role === "employee" && user.status === "active");
  assert.ok(employee);
  db.leavePolicySettings = {
    carryoverMode: "capped",
    carryoverCapDays: 2,
    monthlyGrantMode: "employee_field",
  };
  db.leaveBalances = [
    {
      userId: employee.id,
      month: "2026-06",
      grantedDays: 4,
      carriedDays: 0,
      usedPaidDays: 0,
      usedUnpaidDays: 0,
      expiredDays: 0,
      closingBalanceDays: 6,
    },
  ];
  db.leaveRequests = [
    {
      id: "leave-1",
      userId: employee.id,
      leaveType: "annual",
      startISO: "2026-07-03T09:00:00.000Z",
      endISO: "2026-07-04T18:00:00.000Z",
      hours: 16,
      reason: "leave",
      status: "approved",
      createdAtISO: "2026-07-01T00:00:00.000Z",
    },
  ];

  const result = await applySharedCommand(db, {
    type: "generatePayroll",
    payload: { monthISO: "2026-07" },
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const item = result.result.find(payroll => payroll.userId === employee.id && payroll.monthISO === "2026-07");
  const balance = result.db.leaveBalances.find(entry => entry.userId === employee.id && entry.month === "2026-07");

  assert.ok(item);
  assert.ok(balance);
  assert.equal(balance.carriedDays, 2);
  assert.equal(balance.usedPaidDays, 2);
  assert.equal(balance.usedUnpaidDays, 0);
  assert.equal(item.paidLeaveDays, 2);
  assert.equal(item.unpaidLeaveDays, 0);
});
