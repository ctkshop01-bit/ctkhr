import type { EmploymentType } from "../types/domain.js";

export type ComputeMonthlyLeaveDeductionInput = {
  baseSalaryCents: number;
  employmentType: EmploymentType;
  monthlyPaidLeaveDays: number;
  approvedLeaveDays: number;
  missingDays: number;
};

export function computeMonthlyLeaveDeduction(input: ComputeMonthlyLeaveDeductionInput) {
  const dailySalaryCents = Math.round(input.baseSalaryCents / 26);
  const paidQuota = input.employmentType === "regular" ? Math.max(0, input.monthlyPaidLeaveDays) : 0;
  const paidLeaveDays = Math.min(input.approvedLeaveDays, paidQuota);
  const unpaidLeaveDays = Math.max(0, input.approvedLeaveDays - paidLeaveDays);
  const unpaidLeaveDeductionCents = unpaidLeaveDays * dailySalaryCents;
  const missingDeductionCents = input.missingDays * dailySalaryCents;

  return {
    dailySalaryCents,
    paidLeaveDays,
    unpaidLeaveDays,
    unpaidLeaveDeductionCents,
    missingDeductionCents,
    deductionCents: unpaidLeaveDeductionCents + missingDeductionCents,
  };
}
