type LeaveUsageInput = {
  requestedDays: number;
  availablePaidDays: number;
};

type LeaveBalanceBuildInput = {
  month: string;
  grantDays: number;
  previousClosingBalanceDays: number;
  carryoverMode: "none" | "full" | "capped";
  carryoverCapDays: number;
  usedPaidDays: number;
  usedUnpaidDays: number;
};

export function allocateLeaveUsage({ requestedDays, availablePaidDays }: LeaveUsageInput) {
  const usedPaidDays = Math.min(requestedDays, Math.max(0, availablePaidDays));
  const usedUnpaidDays = Math.max(0, requestedDays - usedPaidDays);

  return { usedPaidDays, usedUnpaidDays };
}

export function buildNextLeaveBalance({
  month,
  grantDays,
  previousClosingBalanceDays,
  carryoverMode,
  carryoverCapDays,
  usedPaidDays,
  usedUnpaidDays,
}: LeaveBalanceBuildInput) {
  const carriedDays = carryoverMode === "none"
    ? 0
    : carryoverMode === "full"
      ? previousClosingBalanceDays
      : Math.min(previousClosingBalanceDays, carryoverCapDays);
  const expiredDays = Math.max(0, previousClosingBalanceDays - carriedDays);
  const closingBalanceDays = Math.max(0, carriedDays + grantDays - usedPaidDays);

  return {
    month,
    grantedDays: grantDays,
    carriedDays,
    usedPaidDays,
    usedUnpaidDays,
    expiredDays,
    closingBalanceDays,
  };
}
