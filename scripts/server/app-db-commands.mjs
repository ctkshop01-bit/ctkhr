import { createHash, randomUUID } from "node:crypto";

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

async function verifyPassword(stored, input) {
  if (stored.length === 64 && /^[a-f0-9]+$/i.test(stored)) {
    return sha256Hex(input) === stored;
  }

  return stored === input;
}

export async function loginWithSharedDb(db, username, password) {
  const user = db.users.find(item => item.username === username && item.status === "active");
  if (!user) {
    return null;
  }

  return (await verifyPassword(user.passwordHash, password)) ? user : null;
}

function createId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function nowISO() {
  return new Date().toISOString();
}

function roundMoneyCents(value) {
  return Math.round(value);
}

function minutesBetween(startISO, endISO) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

function toDateISO(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthISOFromDateTimeISO(iso) {
  const match = iso.match(/^(\d{4}-\d{2})/);
  if (match) {
    return match[1];
  }

  const date = new Date(iso);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function getPreviousMonthISO(monthISO) {
  const [year, month] = monthISO.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${`${previous.getUTCMonth() + 1}`.padStart(2, "0")}`;
}

function parseHMToMinutes(hm) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function minutesFromDayStart(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function roundToHalfHour(hours) {
  return Math.round(hours * 2) / 2;
}

function calcHourlyRateCents(baseSalaryCents) {
  const monthHours = 21.75 * 8;
  return roundMoneyCents(baseSalaryCents / monthHours);
}

function deriveAttendanceStatus(clockInISO, clockOutISO) {
  if (!clockInISO && !clockOutISO) return { status: "missing", abnormalReason: "reason.missing" };
  if (!clockInISO || !clockOutISO) return { status: "missing", abnormalReason: "reason.missing" };

  const startMin = parseHMToMinutes("09:00");
  const endMin = parseHMToMinutes("18:00");
  const inMin = minutesFromDayStart(new Date(clockInISO));
  const outMin = minutesFromDayStart(new Date(clockOutISO));

  if (inMin > startMin + 10) return { status: "late", abnormalReason: "reason.late" };
  if (outMin < endMin - 10) return { status: "early_leave", abnormalReason: "reason.early_leave" };
  return { status: "normal", abnormalReason: undefined };
}

function ensureDayAttendance(state, userId, dateISO) {
  const existing = state.attendanceDaily.find(item => item.userId === userId && item.dateISO === dateISO);
  if (existing) {
    return existing;
  }

  const created = {
    id: createId("att"),
    userId,
    dateISO,
    status: "missing",
    abnormalReason: "reason.missing",
    confirmed: false,
  };
  state.attendanceDaily.push(created);
  return created;
}

function monthMatchesDate(monthISO, dateISO) {
  return dateISO.startsWith(`${monthISO}-`);
}

function normalizeWeeklyOffDays(weeklyOffDays) {
  return Array.from(new Set(weeklyOffDays))
    .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

function computeMonthlyLeaveDeduction(input) {
  const dailySalaryCents = Math.round(input.baseSalaryCents / 26);
  const paidQuota = input.employmentType === "regular" ? Math.max(0, input.monthlyPaidLeaveDays) : 0;
  const paidLeaveDays = Math.min(input.approvedLeaveDays, paidQuota);
  const unpaidLeaveDays = Math.max(0, input.approvedLeaveDays - paidLeaveDays);
  const unpaidLeaveDeductionCents = unpaidLeaveDays * dailySalaryCents;
  const missingDeductionCents = input.missingDays * dailySalaryCents;

  return {
    paidLeaveDays,
    unpaidLeaveDays,
    unpaidLeaveDeductionCents,
    missingDeductionCents,
    deductionCents: unpaidLeaveDeductionCents + missingDeductionCents,
  };
}

function allocateLeaveUsage({ requestedDays, availablePaidDays }) {
  const usedPaidDays = Math.min(requestedDays, Math.max(0, availablePaidDays));
  const usedUnpaidDays = Math.max(0, requestedDays - usedPaidDays);

  return { usedPaidDays, usedUnpaidDays };
}

function buildNextLeaveBalance({
  month,
  grantDays,
  previousClosingBalanceDays,
  carryoverMode,
  carryoverCapDays,
  usedPaidDays,
  usedUnpaidDays,
}) {
  const carriedDays =
    carryoverMode === "none"
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

function getMonthlyGrantDays(user) {
  const employmentType = user.employmentType ?? "regular";
  return typeof user.monthlyPaidLeaveDays === "number" ? user.monthlyPaidLeaveDays : employmentType === "probation" ? 0 : 4;
}

function ensureLeaveBalanceForMonth(db, user, monthISO, approvedLeaveDays) {
  const previousMonthISO = getPreviousMonthISO(monthISO);
  const previousBalance = (db.leaveBalances ?? []).find(item => item.userId === user.id && item.month === previousMonthISO);
  const previousClosingBalanceDays = previousBalance?.closingBalanceDays ?? 0;
  const grantDays = getMonthlyGrantDays(user);
  const carryoverMode = db.leavePolicySettings?.carryoverMode ?? "none";
  const carryoverCapDays = db.leavePolicySettings?.carryoverCapDays ?? 0;
  const carriedDays =
    carryoverMode === "none"
      ? 0
      : carryoverMode === "full"
        ? previousClosingBalanceDays
        : Math.min(previousClosingBalanceDays, carryoverCapDays);
  const { usedPaidDays, usedUnpaidDays } = allocateLeaveUsage({
    requestedDays: approvedLeaveDays,
    availablePaidDays: carriedDays + grantDays,
  });

  return {
    userId: user.id,
    ...buildNextLeaveBalance({
      month: monthISO,
      grantDays,
      previousClosingBalanceDays,
      carryoverMode,
      carryoverCapDays,
      usedPaidDays,
      usedUnpaidDays,
    }),
  };
}

function upsertLeaveBalance(db, leaveBalance) {
  const leaveBalances = [...(db.leaveBalances ?? [])];
  const existingIndex = leaveBalances.findIndex(item => item.userId === leaveBalance.userId && item.month === leaveBalance.month);
  if (existingIndex >= 0) {
    leaveBalances[existingIndex] = leaveBalance;
  } else {
    leaveBalances.push(leaveBalance);
  }
  db.leaveBalances = leaveBalances;
}

function findSingleAdmin(users) {
  const admins = users.filter(user => user.role === "admin");
  return admins.length === 1 ? admins[0] : null;
}

function getConfiguredReviewer(db, requestType) {
  if (requestType === "leave") return db.approvalSettings?.leaveReviewerUserId ?? null;
  if (requestType === "overtime") return db.approvalSettings?.overtimeReviewerUserId ?? null;
  return db.approvalSettings?.attendanceReviewerUserId ?? null;
}

function getApprovalSettingsWithDefaults(db) {
  return db.approvalSettings ?? {
    leaveReviewerUserId: null,
    overtimeReviewerUserId: null,
    attendanceReviewerUserId: null,
  };
}

function assertActiveReviewerIfConfigured(db, reviewerUserId) {
  if (!reviewerUserId) return;
  const reviewer = db.users.find(user => user.id === reviewerUserId && user.status === "active");
  if (!reviewer) {
    throw new Error("reviewer must be an active user");
  }
}

function ensureReviewerConfigured(db, requestType) {
  const reviewerUserId = getConfiguredReviewer(db, requestType);
  const reviewer = db.users.find(user => user.id === reviewerUserId && user.status === "active");
  if (!reviewer) {
    throw new Error(`${requestType} reviewer is not configured`);
  }

  return reviewer.id;
}

function appendApprovalLog(db, log) {
  const approvalLogs = db.approvalLogs ?? [];
  approvalLogs.push({
    id: createId("apl"),
    createdAtISO: nowISO(),
    ...log,
  });
  db.approvalLogs = approvalLogs;
}

function appendTaskReviewLog(db, log) {
  const taskReviewLogs = db.taskReviewLogs ?? [];
  taskReviewLogs.unshift({
    id: createId("trl"),
    createdAtISO: nowISO(),
    ...log,
  });
  db.taskReviewLogs = taskReviewLogs;
}

function appendNotification(db, notification) {
  const notifications = db.notifications ?? [];
  notifications.push({
    id: createId("ntf"),
    createdAtISO: nowISO(),
    isRead: false,
    ...notification,
  });
  db.notifications = notifications;
}

function appendNotificationForActiveEmployees(db, notificationFactory) {
  for (const user of db.users.filter(user => user.role === "employee" && user.status === "active")) {
    appendNotification(db, notificationFactory(user));
  }
}

function getPerformanceSettings(db) {
  return db.performanceSettings ?? {
    enabled: true,
    scoreBase: 100,
    kpiBaseDefaultCents: 100000,
    fullAttendanceBonus: 10,
    kpiRateRules: [
      { minScore: 95, rate: 1 },
      { minScore: 90, rate: 0.9 },
      { minScore: 80, rate: 0.8 },
      { minScore: 70, rate: 0.6 },
      { minScore: 0, rate: 0.5 },
    ],
    taskRules: {
      allCompletedBonus: 2,
      unfinishedTier1Penalty: -1,
      unfinishedTier2Penalty: -3,
      unfinishedTier3Penalty: -5,
      afterClockOutPenalty: -1,
      returnPenalty: -2,
      multiReturnExtraPenalty: -2,
    },
    attendanceRules: {
      latePenalty: -2,
      seriousLatePenalty: -4,
      earlyLeavePenalty: -2,
      seriousEarlyLeavePenalty: -4,
      missingPunchPenalty: -3,
    },
    warningRules: {
      lateThreshold: 3,
      earlyLeaveThreshold: 3,
      taskUnfinishedThreshold: 3,
      secondWarningPenalty: -5,
      thirdWarningPenalty: -10,
    },
  };
}

function mergePerformanceSettings(current, patch = {}) {
  return {
    ...current,
    ...patch,
    kpiRateRules: patch.kpiRateRules ?? current.kpiRateRules,
    taskRules: {
      ...current.taskRules,
      ...(patch.taskRules ?? {}),
    },
    attendanceRules: {
      ...current.attendanceRules,
      ...(patch.attendanceRules ?? {}),
    },
    warningRules: {
      ...current.warningRules,
      ...(patch.warningRules ?? {}),
    },
  };
}

function resolveKpiRate(settings, finalScore) {
  const sortedRules = [...(settings.kpiRateRules ?? [])].sort((a, b) => b.minScore - a.minScore);
  return sortedRules.find(rule => finalScore >= rule.minScore)?.rate ?? 0.5;
}

function createPerformanceEvent(base) {
  return {
    id: createId("pfe"),
    createdAtISO: nowISO(),
    createdBy: "system",
    isReverted: false,
    ...base,
  };
}

function countSameDayTaskPenalty(settings, unfinishedCount) {
  if (unfinishedCount <= 0) {
    return {
      scoreDelta: settings.taskRules.allCompletedBonus,
      eventType: "task_all_completed",
      category: "reward",
      title: "当天任务全部完成",
      detail: "unfinished=0",
    };
  }
  if (unfinishedCount === 1) {
    return {
      scoreDelta: settings.taskRules.unfinishedTier1Penalty,
      eventType: "task_unfinished_tier_1",
      category: "task",
      title: "当天任务未完成",
      detail: "unfinished=1",
    };
  }
  if (unfinishedCount === 2) {
    return {
      scoreDelta: settings.taskRules.unfinishedTier2Penalty,
      eventType: "task_unfinished_tier_2",
      category: "task",
      title: "当天任务未完成",
      detail: "unfinished=2",
    };
  }
  return {
    scoreDelta: settings.taskRules.unfinishedTier3Penalty,
    eventType: "task_unfinished_tier_3",
    category: "task",
    title: "当天任务未完成",
    detail: `unfinished=${unfinishedCount}`,
  };
}

function createWarningsForThreshold(db, { userId, dateISO, month, warningType, triggerCount, threshold, sourceEventIds }) {
  if (!threshold || triggerCount < threshold) {
    return { warnings: [], events: [] };
  }

  const activeWarnings = (db.performanceWarnings ?? []).filter(
    item => item.userId === userId && item.month === month && !item.resolved,
  );
  const existingWarningsOfType = activeWarnings.filter(item => item.warningType === warningType);
  const expectedWarningsOfType = Math.floor(triggerCount / threshold);
  const warningsToCreate = Math.max(0, expectedWarningsOfType - existingWarningsOfType.length);

  if (warningsToCreate === 0) {
    return { warnings: [], events: [] };
  }

  const warnings = [];
  const events = [];

  for (let index = 0; index < warningsToCreate; index += 1) {
    const warningOrdinal = activeWarnings.length + index + 1;
    const warning = {
      id: createId("pfw"),
      userId,
      month,
      warningType,
      triggerCount,
      threshold,
      sourceEventIds,
      createdAtISO: nowISO(),
      resolved: false,
    };
    warnings.push(warning);
    events.push(
      createPerformanceEvent({
        userId,
        date: dateISO,
        month,
        category: "warning",
        eventType: "warning_triggered",
        scoreDelta: 0,
        warningDelta: 1,
        sourceType: "system",
        sourceId: warning.id,
        title: "绩效警告触发",
        detail: `warningType=${warningType};triggerCount=${triggerCount}`,
      }),
    );

    if (warningOrdinal === 2) {
      events.push(
        createPerformanceEvent({
          userId,
          date: dateISO,
          month,
          category: "warning",
          eventType: "warning_penalty_level_2",
          scoreDelta: db.performanceSettings.warningRules.secondWarningPenalty,
          warningDelta: 0,
          sourceType: "system",
          sourceId: warning.id,
          title: "绩效警告附加扣分",
          detail: "warningLevel=2",
        }),
      );
    } else if (warningOrdinal >= 3) {
      events.push(
        createPerformanceEvent({
          userId,
          date: dateISO,
          month,
          category: "warning",
          eventType: "warning_penalty_level_3",
          scoreDelta: db.performanceSettings.warningRules.thirdWarningPenalty,
          warningDelta: 0,
          sourceType: "system",
          sourceId: warning.id,
          title: "绩效警告附加扣分",
          detail: `warningLevel=${warningOrdinal}`,
        }),
      );
    }
  }

  return { warnings, events };
}

function okResult(db, result) {
  return { ok: true, db, result };
}

export async function applySharedCommand(db, command) {
  switch (command?.type) {
    case "upsertEmployee": {
      const employee = command.payload;
      const exists = db.users.some(item => item.id === employee.id);
      return okResult(
        {
          ...db,
          users: exists ? db.users.map(item => (item.id === employee.id ? employee : item)) : [employee, ...db.users],
        },
        employee,
      );
    }

    case "setUserWeeklyOffDays": {
      const { userId, weeklyOffDays } = command.payload;
      return okResult(
        {
          ...db,
          users: db.users.map(user => (user.id === userId ? { ...user, weeklyOffDays: normalizeWeeklyOffDays(weeklyOffDays) } : user)),
        },
        null,
      );
    }

    case "setUserStatus": {
      const { userId, status } = command.payload;
      return okResult(
        {
          ...db,
          users: db.users.map(user => (user.id === userId ? { ...user, status } : user)),
        },
        null,
      );
    }

    case "updateApprovalSettings": {
      const patch = command.payload ?? {};
      const current = getApprovalSettingsWithDefaults(db);
      const nextSettings = {
        leaveReviewerUserId:
          Object.prototype.hasOwnProperty.call(patch, "leaveReviewerUserId") ? patch.leaveReviewerUserId : current.leaveReviewerUserId,
        overtimeReviewerUserId:
          Object.prototype.hasOwnProperty.call(patch, "overtimeReviewerUserId")
            ? patch.overtimeReviewerUserId
            : current.overtimeReviewerUserId,
        attendanceReviewerUserId:
          Object.prototype.hasOwnProperty.call(patch, "attendanceReviewerUserId")
            ? patch.attendanceReviewerUserId
            : current.attendanceReviewerUserId,
      };

      assertActiveReviewerIfConfigured(db, nextSettings.leaveReviewerUserId);
      assertActiveReviewerIfConfigured(db, nextSettings.overtimeReviewerUserId);
      assertActiveReviewerIfConfigured(db, nextSettings.attendanceReviewerUserId);

      return okResult(
        {
          ...db,
          approvalSettings: nextSettings,
        },
        null,
      );
    }

    case "updatePerformanceSettings": {
      const patch = command.payload ?? {};
      const current = getPerformanceSettings(db);
      const performanceSettings = mergePerformanceSettings(current, patch);
      return okResult(
        {
          ...db,
          performanceSettings,
        },
        performanceSettings,
      );
    }

    case "clock": {
      const { userId, type, payload } = command.payload;
      const timeISO = payload?.timeISO ?? nowISO();
      const dateISO = toDateISO(new Date(timeISO));
      const nextDb = structuredClone(db);

      nextDb.clockEvents.push({
        id: createId("clk"),
        userId,
        type,
        timeISO,
        location: payload?.location,
        photoDataUrl: payload?.photoDataUrl,
      });

      const daily = ensureDayAttendance(nextDb, userId, dateISO);
      if (type === "in") {
        daily.clockInISO = timeISO;
      }
      if (type === "out") {
        daily.clockOutISO = timeISO;
      }

      if (type === "in" || type === "out") {
        const derived = deriveAttendanceStatus(daily.clockInISO, daily.clockOutISO);
        daily.status = derived.status;
        daily.abnormalReason = derived.abnormalReason;
      }

      return okResult(nextDb, daily);
    }

    case "submitLeave": {
      ensureReviewerConfigured(db, "leave");
      const created = {
        ...command.payload,
        id: createId("lv"),
        status: "pending",
        createdAtISO: nowISO(),
      };
      return okResult(
        {
          ...db,
          leaveRequests: [created, ...db.leaveRequests],
        },
        created,
      );
    }

    case "submitOvertime": {
      ensureReviewerConfigured(db, "overtime");
      const input = command.payload;
      const user = db.users.find(item => item.id === input.userId);
      const baseSalaryCents = user?.baseSalaryCents ?? 0;
      const baseHourlyRateCents = calcHourlyRateCents(baseSalaryCents);
      const hourlyRateCents =
        input.hourlyRateCents ??
        (typeof user?.overtimeHourlyRateCents === "number" && user.overtimeHourlyRateCents > 0 ? user.overtimeHourlyRateCents : undefined) ??
        roundMoneyCents(baseHourlyRateCents * 1.5);
      const hours = roundToHalfHour(minutesBetween(input.startISO, input.endISO) / 60);
      const overtimePayCents = roundMoneyCents(hours * hourlyRateCents);
      const created = {
        ...input,
        id: createId("ot"),
        status: "pending",
        hours,
        hourlyRateCents,
        overtimePayCents,
        createdAtISO: nowISO(),
      };

      return okResult(
        {
          ...db,
          overtimeRequests: [created, ...db.overtimeRequests],
        },
        created,
      );
    }

    case "reviewLeave": {
      const { id, reviewerId, status, note } = command.payload;
      const nextDb = structuredClone(db);
      const request = nextDb.leaveRequests.find(item => item.id === id);
      if (request) {
        appendApprovalLog(nextDb, {
          requestType: "leave",
          requestId: request.id,
          submitterUserId: request.userId,
          reviewerUserId: reviewerId,
          decision: status,
          note: note ?? "",
        });
        appendNotification(nextDb, {
          userId: request.userId,
          type: "leave_reviewed",
          title: status === "approved" ? "请假已通过" : "请假被驳回",
          body: note || "请查看审批详情",
          relatedType: "leave",
          relatedId: request.id,
        });
      }

      return okResult(
        {
          ...nextDb,
          leaveRequests: nextDb.leaveRequests.map(request =>
            request.id === id
              ? {
                  ...request,
                  status,
                  reviewerId,
                  reviewNote: note,
                  reviewedAtISO: nowISO(),
                }
              : request,
          ),
        },
        null,
      );
    }

    case "reviewOvertime": {
      const { id, reviewerId, status, note, override } = command.payload;
      const nextDb = structuredClone(db);
      const request = nextDb.overtimeRequests.find(item => item.id === id);
      if (request) {
        appendApprovalLog(nextDb, {
          requestType: "overtime",
          requestId: request.id,
          submitterUserId: request.userId,
          reviewerUserId: reviewerId,
          decision: status,
          note: note ?? "",
        });
        appendNotification(nextDb, {
          userId: request.userId,
          type: "overtime_reviewed",
          title: status === "approved" ? "加班已通过" : "加班被驳回",
          body: note || "请查看审批详情",
          relatedType: "overtime",
          relatedId: request.id,
        });
      }

      return okResult(
        {
          ...nextDb,
          overtimeRequests: nextDb.overtimeRequests.map(request => {
            if (request.id !== id) {
              return request;
            }

            let hourlyRateCents = request.hourlyRateCents;
            let overtimePayCents = request.overtimePayCents;
            if (override) {
              if (typeof override.hourlyRateCents === "number") {
                hourlyRateCents = override.hourlyRateCents;
                overtimePayCents = roundMoneyCents(request.hours * hourlyRateCents);
              } else if (typeof override.overtimePayCents === "number") {
                overtimePayCents = override.overtimePayCents;
                hourlyRateCents = request.hours > 0 ? roundMoneyCents(overtimePayCents / request.hours) : hourlyRateCents;
              }
            }

            return {
              ...request,
              hourlyRateCents,
              overtimePayCents,
              status,
              reviewerId,
              reviewNote: note,
              reviewedAtISO: nowISO(),
            };
          }),
        },
        null,
      );
    }

    case "confirmAttendance": {
      const { attendanceId, patch } = command.payload;
      const nextDb = structuredClone(db);
      const reviewerUserId = ensureReviewerConfigured(nextDb, "attendance");
      const attendance = nextDb.attendanceDaily.find(item => item.id === attendanceId);
      if (attendance) {
        appendApprovalLog(nextDb, {
          requestType: "attendance",
          requestId: attendance.id,
          submitterUserId: attendance.userId,
          reviewerUserId,
          decision: "confirmed",
          note: patch.abnormalReason ?? "",
        });
        appendNotification(nextDb, {
          userId: attendance.userId,
          type: "attendance_confirmed",
          title: "考勤已确认",
          body: patch.abnormalReason || "请查看最新考勤结果",
          relatedType: "attendance",
          relatedId: attendance.id,
        });
      }

      return okResult(
        {
          ...nextDb,
          attendanceDaily: nextDb.attendanceDaily.map(attendance => {
            if (attendance.id !== attendanceId) {
              return attendance;
            }

            const next = { ...attendance, ...patch, confirmed: true };
            const derived = deriveAttendanceStatus(next.clockInISO, next.clockOutISO);
            next.status = patch.status ?? derived.status;
            next.abnormalReason = patch.abnormalReason ?? derived.abnormalReason;
            return next;
          }),
        },
        null,
      );
    }

    case "upsertDeductionRule": {
      const rule = command.payload;
      const exists = db.deductionRules.some(item => item.id === rule.id);
      return okResult(
        {
          ...db,
          deductionRules: exists ? db.deductionRules.map(item => (item.id === rule.id ? rule : item)) : [rule, ...db.deductionRules],
        },
        rule,
      );
    }

    case "deleteDeductionRule": {
      const { id } = command.payload;
      return okResult(
        {
          ...db,
          deductionRules: db.deductionRules.filter(item => item.id !== id),
        },
        null,
      );
    }

    case "updatePayrollItem": {
      const { id, patch } = command.payload;
      return okResult(
        {
          ...db,
          payrollItems: db.payrollItems.map(item => {
            if (item.id !== id) {
              return item;
            }

            const baseSalaryCents = typeof patch.baseSalaryCents === "number" ? patch.baseSalaryCents : item.baseSalaryCents;
            const overtimePayCents = typeof patch.overtimePayCents === "number" ? patch.overtimePayCents : item.overtimePayCents;
            const hasDeductions = typeof patch.deductionsCents === "number";
            const hasNet = typeof patch.netPayCents === "number";

            if (!hasDeductions && hasNet) {
              const netPayCents = patch.netPayCents;
              const deductionsCents = baseSalaryCents + overtimePayCents - netPayCents;
              return { ...item, baseSalaryCents, overtimePayCents, deductionsCents, netPayCents };
            }

            if (hasDeductions && !hasNet) {
              const deductionsCents = patch.deductionsCents;
              const netPayCents = baseSalaryCents + overtimePayCents - deductionsCents;
              return { ...item, baseSalaryCents, overtimePayCents, deductionsCents, netPayCents };
            }

            const deductionsCents = hasDeductions ? patch.deductionsCents : item.deductionsCents;
            const netPayCents = hasNet ? patch.netPayCents : baseSalaryCents + overtimePayCents - deductionsCents;
            return { ...item, baseSalaryCents, overtimePayCents, deductionsCents, netPayCents };
          }),
        },
        null,
      );
    }

    case "generatePayroll": {
      const { monthISO } = command.payload;
      const nextDb = structuredClone(db);
      const employees = nextDb.users.filter(user => user.role === "employee" && user.status === "active");
      const lateRule = nextDb.deductionRules.find(rule => rule.type === "late" && rule.enabled);
      const customDeductionCents = nextDb.deductionRules
        .filter(rule => rule.type === "custom" && rule.enabled)
        .reduce((sum, rule) => sum + rule.amountCents, 0);

      const items = employees.map(user => {
        const overtimePayCents = nextDb.overtimeRequests
          .filter(request => request.userId === user.id && request.status === "approved" && monthISOFromDateTimeISO(request.startISO) === monthISO)
          .reduce((sum, request) => sum + request.overtimePayCents, 0);
        const attendanceForMonth = nextDb.attendanceDaily.filter(attendance => attendance.userId === user.id && monthMatchesDate(monthISO, attendance.dateISO));
        const approvedLeaveDays = nextDb.leaveRequests
          .filter(request => request.userId === user.id && request.status === "approved" && monthISOFromDateTimeISO(request.startISO) === monthISO)
          .reduce((sum, request) => sum + request.hours / 8, 0);
        const missingDays = attendanceForMonth.filter(attendance => attendance.status === "missing").length;
        const dailySalaryCents = Math.round(user.baseSalaryCents / 26);
        const leaveBalance = ensureLeaveBalanceForMonth(nextDb, user, monthISO, approvedLeaveDays);
        upsertLeaveBalance(nextDb, leaveBalance);
        const unpaidLeaveDeductionCents = leaveBalance.usedUnpaidDays * dailySalaryCents;
        const missingDeductionCents = missingDays * dailySalaryCents;
        const ruleBasedDeductions = attendanceForMonth.reduce((sum, attendance) => {
          if (attendance.status === "late" || attendance.status === "early_leave") {
            return sum + (lateRule?.amountCents ?? 0);
          }

          return sum;
        }, customDeductionCents);
        const deductionsCents = ruleBasedDeductions + unpaidLeaveDeductionCents + missingDeductionCents;
        const netPayCents = user.baseSalaryCents + overtimePayCents - deductionsCents;

        return {
          id: createId("pay"),
          userId: user.id,
          monthISO,
          baseSalaryCents: user.baseSalaryCents,
          overtimePayCents,
          paidLeaveDays: leaveBalance.usedPaidDays,
          unpaidLeaveDays: leaveBalance.usedUnpaidDays,
          unpaidLeaveDeductionCents,
          missingDays,
          missingDeductionCents,
          deductionsCents,
          netPayCents,
          generatedAtISO: nowISO(),
        };
      });

      return okResult(
        {
          ...nextDb,
          payrollItems: [...items, ...nextDb.payrollItems.filter(item => item.monthISO !== monthISO)],
        },
        items,
      );
    }

    case "markAnnouncementRead": {
      const { announcementId, userId } = command.payload;
      const exists = db.announcementReads.some(item => item.announcementId === announcementId && item.userId === userId);
      if (exists) {
        return okResult(db, null);
      }

      const read = {
        id: createId("ar"),
        announcementId,
        userId,
        readAtISO: nowISO(),
      };

      return okResult(
        {
          ...db,
          announcementReads: [read, ...db.announcementReads],
        },
        read,
      );
    }

    case "markNotificationRead": {
      const { id, userId } = command.payload;
      const nextDb = structuredClone(db);
      const item = nextDb.notifications?.find(notification => notification.id === id && notification.userId === userId);
      if (item) {
        item.isRead = true;
      }
      return okResult(nextDb, null);
    }

    case "markAllNotificationsRead": {
      const { userId } = command.payload;
      const nextDb = structuredClone(db);
      nextDb.notifications = (nextDb.notifications ?? []).map(notification =>
        notification.userId === userId ? { ...notification, isRead: true } : notification,
      );
      return okResult(nextDb, null);
    }

    case "upsertAnnouncement": {
      const input = command.payload;
      const announcement = {
        id: input.id ?? createId("ann"),
        title: input.title,
        content: input.content,
        pinned: input.pinned,
        createdAtISO: nowISO(),
      };
      const exists = db.announcements.some(item => item.id === announcement.id);
      const nextDb = {
        ...db,
        announcements: exists
          ? db.announcements.map(item => (item.id === announcement.id ? { ...item, ...announcement } : item))
          : [announcement, ...db.announcements],
      };
      if (!exists) {
        appendNotificationForActiveEmployees(nextDb, user => ({
          userId: user.id,
          type: "announcement_published",
          title: announcement.title,
          body: announcement.content,
          relatedType: "announcement",
          relatedId: announcement.id,
        }));
      }

      return okResult(
        nextDb,
        announcement,
      );
    }

    case "deleteAnnouncement": {
      const { id } = command.payload;
      return okResult(
        {
          ...db,
          announcements: db.announcements.filter(item => item.id !== id),
          announcementReads: db.announcementReads.filter(item => item.announcementId !== id),
        },
        null,
      );
    }

    case "upsertTask": {
      const input = command.payload;
      const task = {
        id: input.id ?? createId("tsk"),
        title: input.title,
        description: input.description,
        dueAtISO: input.dueAtISO,
        status: input.status,
        taskType: input.taskType,
        submittedAtISO: input.submittedAtISO,
        submittedByUserId: input.submittedByUserId,
        confirmedAtISO: input.confirmedAtISO,
        confirmedByUserId: input.confirmedByUserId,
        returnCount: input.returnCount,
        lastReturnedAtISO: input.lastReturnedAtISO,
        lastReturnReason: input.lastReturnReason,
        includeInPerformance: input.includeInPerformance,
        performanceEvaluated: input.performanceEvaluated,
        createdAtISO: nowISO(),
      };
      const exists = db.tasks.some(item => item.id === task.id);
      const nextDb = {
        ...db,
        tasks: exists ? db.tasks.map(item => (item.id === task.id ? { ...item, ...task } : item)) : [task, ...db.tasks],
      };
      if (!exists) {
        appendNotificationForActiveEmployees(nextDb, user => ({
          userId: user.id,
          type: "task_created",
          title: task.title,
          body: task.description || "请查看任务详情",
          relatedType: "task",
          relatedId: task.id,
        }));
      }

      return okResult(
        nextDb,
        task,
      );
    }

    case "deleteTask": {
      const { id } = command.payload;
      return okResult(
        {
          ...db,
          tasks: db.tasks.filter(item => item.id !== id),
        },
        null,
      );
    }

    case "submitTaskCompletion": {
      const { taskId, userId, submittedAtISO } = command.payload;
      const nextDb = structuredClone(db);
      const task = nextDb.tasks.find(item => item.id === taskId);
      if (!task) {
        throw new Error("task not found");
      }

      const fromStatus = task.status;
      task.status = "submitted";
      task.submittedByUserId = userId;
      task.submittedAtISO = submittedAtISO ?? nowISO();
      task.confirmedByUserId = undefined;
      task.confirmedAtISO = undefined;

      const operator = nextDb.users.find(item => item.id === userId);
      appendTaskReviewLog(nextDb, {
        taskId: task.id,
        userId,
        action: "submit",
        fromStatus,
        toStatus: "submitted",
        operatorUserId: userId,
        operatorRole: operator?.role ?? "employee",
        reason: undefined,
      });

      return okResult(nextDb, task);
    }

    case "reviewTaskCompletion": {
      const { taskId, reviewerId, action, reason } = command.payload;
      const nextDb = structuredClone(db);
      const task = nextDb.tasks.find(item => item.id === taskId);
      if (!task) {
        throw new Error("task not found");
      }

      const fromStatus = task.status;
      if (action === "confirm") {
        task.status = "confirmed";
        task.confirmedByUserId = reviewerId;
        task.confirmedAtISO = nowISO();
      } else {
        task.status = "returned";
        task.returnCount = (task.returnCount ?? 0) + 1;
        task.lastReturnedAtISO = nowISO();
        task.lastReturnReason = reason ?? "";
        task.confirmedByUserId = undefined;
        task.confirmedAtISO = undefined;
      }

      const reviewer = nextDb.users.find(item => item.id === reviewerId);
      appendTaskReviewLog(nextDb, {
        taskId: task.id,
        userId: task.submittedByUserId ?? task.confirmedByUserId ?? reviewerId,
        action,
        fromStatus,
        toStatus: task.status,
        operatorUserId: reviewerId,
        operatorRole: reviewer?.role ?? "admin",
        reason: reason ?? undefined,
      });

      return okResult(nextDb, task);
    }

    case "evaluateSameDayTasksOnClockOut": {
      const { userId, dateISO } = command.payload;
      const month = dateISO.slice(0, 7);
      const settings = getPerformanceSettings(db);
      const relevantTasks = db.tasks.filter(item => {
        if (item.taskType !== "same_day" || item.includeInPerformance === false || item.performanceEvaluated) {
          return false;
        }
        const taskDateISO = (item.dueAtISO ?? item.createdAtISO ?? "").slice(0, 10);
        return taskDateISO === dateISO;
      });

      if (relevantTasks.length === 0) {
        return okResult(db, null);
      }

      const unfinishedCount = relevantTasks.filter(item => !["submitted", "confirmed", "closed"].includes(item.status)).length;
      const penalty = countSameDayTaskPenalty(settings, unfinishedCount);
      const taskEvent = createPerformanceEvent({
        userId,
        date: dateISO,
        month,
        category: penalty.category,
        eventType: penalty.eventType,
        scoreDelta: penalty.scoreDelta,
        warningDelta: 0,
        sourceType: "system",
        sourceId: `${userId}:${dateISO}:clock_out`,
        title: penalty.title,
        detail: penalty.detail,
      });

      const performanceEvents = [];
      const performanceWarnings = [];
      if (unfinishedCount > 0) {
        const unfinishedEventCount =
          db.performanceEvents.filter(
            item =>
              item.userId === userId &&
              item.month === month &&
              /^task_unfinished_tier_/.test(item.eventType) &&
              !item.isReverted,
          ).length + 1;
        const warningArtifacts = createWarningsForThreshold(db, {
          userId,
          dateISO,
          month,
          warningType: "task_unfinished",
          triggerCount: unfinishedEventCount,
          threshold: settings.warningRules.taskUnfinishedThreshold,
          sourceEventIds: [taskEvent.id],
        });
        performanceWarnings.push(...warningArtifacts.warnings);
        performanceEvents.push(...warningArtifacts.events);
      }
      performanceEvents.push(taskEvent);

      return okResult(
        {
          ...db,
          tasks: db.tasks.map(item =>
            relevantTasks.some(task => task.id === item.id) ? { ...item, performanceEvaluated: true } : item,
          ),
          performanceEvents: [...performanceEvents, ...(db.performanceEvents ?? [])],
          performanceWarnings: [...performanceWarnings, ...(db.performanceWarnings ?? [])],
        },
        {
          taskEvent,
          warnings: performanceWarnings,
        },
      );
    }

    case "generatePerformanceMonthlySummary": {
      const { month } = command.payload;
      const settings = getPerformanceSettings(db);
      const users = db.users.filter(user => user.role === "employee" && user.status === "active");
      const summaries = users.map(user => {
        const events = (db.performanceEvents ?? []).filter(
          item => item.userId === user.id && item.month === month && !item.isReverted,
        );
        const warnings = (db.performanceWarnings ?? []).filter(
          item => item.userId === user.id && item.month === month && !item.resolved,
        );
        const taskScore = events.filter(item => item.category === "task").reduce((sum, item) => sum + item.scoreDelta, 0);
        const attendanceScore = events
          .filter(item => item.category === "attendance")
          .reduce((sum, item) => sum + item.scoreDelta, 0);
        const rewardScore = events.filter(item => item.category === "reward").reduce((sum, item) => sum + item.scoreDelta, 0);
        const warningPenaltyScore = events
          .filter(item => item.category === "warning")
          .reduce((sum, item) => sum + item.scoreDelta, 0);
        const manualAdjustmentScore = events
          .filter(item => item.category === "manual_adjustment")
          .reduce((sum, item) => sum + item.scoreDelta, 0);
        const finalScore =
          settings.scoreBase + taskScore + attendanceScore + rewardScore + warningPenaltyScore + manualAdjustmentScore;
        const kpiRate = resolveKpiRate(settings, finalScore);

        return {
          id: `pms_${user.id}_${month}`,
          userId: user.id,
          month,
          baseScore: settings.scoreBase,
          taskScore,
          attendanceScore,
          rewardScore,
          warningPenaltyScore,
          manualAdjustmentScore,
          finalScore,
          warningCount: warnings.length,
          kpiBaseCents: settings.kpiBaseDefaultCents,
          kpiRate,
          kpiPayoutCents: Math.round(settings.kpiBaseDefaultCents * kpiRate),
          generatedAtISO: nowISO(),
          status: "draft",
        };
      });
      const performanceMonthlySummaries = [
        ...summaries,
        ...(db.performanceMonthlySummaries ?? []).filter(item => item.month !== month),
      ];
      return okResult(
        {
          ...db,
          performanceMonthlySummaries,
        },
        summaries,
      );
    }

    case "loadPerformanceSummary": {
      const { month } = command.payload;
      return okResult(db, {
        month,
        settings: getPerformanceSettings(db),
        events: (db.performanceEvents ?? []).filter(item => item.month === month && !item.isReverted),
        warnings: (db.performanceWarnings ?? []).filter(item => item.month === month && !item.resolved),
        summaries: (db.performanceMonthlySummaries ?? []).filter(item => item.month === month),
      });
    }

    case "toggleTaskDone": {
      const { taskId } = command.payload;
      let toggledTask = null;
      const tasks = db.tasks.map(item => {
        if (item.id !== taskId) {
          return item;
        }

        toggledTask = {
          ...item,
          status: item.status === "done" ? "open" : "done",
        };
        return toggledTask;
      });

      return okResult(
        {
          ...db,
          tasks,
        },
        toggledTask,
      );
    }

    case "updateAdminCredentials": {
      const { currentPassword, newUsername, newPassword } = command.payload;
      const trimmedUsername = newUsername.trim();
      if (!trimmedUsername || !newPassword) {
        return { ok: false, code: "invalid_input" };
      }

      const admin = findSingleAdmin(db.users);
      if (!admin) {
        return { ok: false, code: "admin_not_found" };
      }

      const passwordMatches = await verifyPassword(admin.passwordHash, currentPassword);
      if (!passwordMatches) {
        return { ok: false, code: "bad_current_password" };
      }

      const usernameTaken = db.users.some(user => user.id !== admin.id && user.username === trimmedUsername);
      if (usernameTaken) {
        return { ok: false, code: "username_taken" };
      }

      const updatedAdmin = {
        ...admin,
        username: trimmedUsername,
        passwordHash: sha256Hex(newPassword),
      };

      return okResult(
        {
          ...db,
          users: db.users.map(user => (user.id === admin.id ? updatedAdmin : user)),
        },
        null,
      );
    }

    default:
      throw new Error(`Unsupported command: ${command?.type ?? "unknown"}`);
  }
}
