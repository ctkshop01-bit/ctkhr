import test from "node:test";
import assert from "node:assert/strict";
import { computeMonthlyLeaveDeduction } from "../src/stores/payrollPolicy.js";

test("regular employee gets 4 paid leave days per month and excess leave is unpaid", () => {
  const result = computeMonthlyLeaveDeduction({
    baseSalaryCents: 2600000,
    employmentType: "regular",
    monthlyPaidLeaveDays: 4,
    approvedLeaveDays: 6,
    missingDays: 0,
  });

  assert.equal(result.dailySalaryCents, 100000);
  assert.equal(result.paidLeaveDays, 4);
  assert.equal(result.unpaidLeaveDays, 2);
  assert.equal(result.unpaidLeaveDeductionCents, 200000);
  assert.equal(result.missingDeductionCents, 0);
  assert.equal(result.deductionCents, 200000);
});

test("probation employee has no paid leave quota", () => {
  const result = computeMonthlyLeaveDeduction({
    baseSalaryCents: 2600000,
    employmentType: "probation",
    monthlyPaidLeaveDays: 0,
    approvedLeaveDays: 2,
    missingDays: 0,
  });

  assert.equal(result.dailySalaryCents, 100000);
  assert.equal(result.paidLeaveDays, 0);
  assert.equal(result.unpaidLeaveDays, 2);
  assert.equal(result.unpaidLeaveDeductionCents, 200000);
  assert.equal(result.missingDeductionCents, 0);
  assert.equal(result.deductionCents, 200000);
});

test("missing attendance day deducts one full daily salary each time", () => {
  const result = computeMonthlyLeaveDeduction({
    baseSalaryCents: 2600000,
    employmentType: "regular",
    monthlyPaidLeaveDays: 4,
    approvedLeaveDays: 0,
    missingDays: 3,
  });

  assert.equal(result.dailySalaryCents, 100000);
  assert.equal(result.paidLeaveDays, 0);
  assert.equal(result.unpaidLeaveDays, 0);
  assert.equal(result.unpaidLeaveDeductionCents, 0);
  assert.equal(result.missingDeductionCents, 300000);
  assert.equal(result.deductionCents, 300000);
});
