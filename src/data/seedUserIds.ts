import type { AppDb } from "../types/domain.js";

const BUILT_IN_USER_IDS = {
  admin: "usr_admin",
  e001: "usr_e001",
  e002: "usr_e002",
} as const;

const BUILT_IN_USERNAMES = ["admin", "e001", "e002"] as const;

export function getSeedUserId(username: string) {
  return BUILT_IN_USER_IDS[username as keyof typeof BUILT_IN_USER_IDS] ?? null;
}

export function isBuiltInDemoUsername(username: string) {
  return (BUILT_IN_USERNAMES as readonly string[]).includes(username);
}

export function isBuiltInDemoUserId(userId: string) {
  return (Object.values(BUILT_IN_USER_IDS) as string[]).includes(userId);
}

export function clearBuiltInDemoUserData(db: AppDb): AppDb {
  const demoUserIds = new Set<string>(Object.values(BUILT_IN_USER_IDS));
  const keepUserId = (userId: string) => !demoUserIds.has(userId);
  const notifications = db.notifications ?? [];
  const leaveBalances = db.leaveBalances ?? [];
  const leavePolicySettings = db.leavePolicySettings ?? {
    carryoverMode: "none",
    carryoverCapDays: 0,
    monthlyGrantMode: "employee_field",
  };
  const approvalSettings = db.approvalSettings ?? {
    leaveReviewerUserId: null,
    overtimeReviewerUserId: null,
    attendanceReviewerUserId: null,
  };
  const approvalLogs = db.approvalLogs ?? [];
  const taskReviewLogs = db.taskReviewLogs ?? [];
  const performanceEvents = db.performanceEvents ?? [];
  const performanceMonthlySummaries = db.performanceMonthlySummaries ?? [];
  const performanceWarnings = db.performanceWarnings ?? [];
  const performanceSettings = db.performanceSettings;

  return {
    users: db.users,
    clockEvents: db.clockEvents.filter(item => keepUserId(item.userId)),
    attendanceDaily: db.attendanceDaily.filter(item => keepUserId(item.userId)),
    leaveRequests: db.leaveRequests.filter(item => keepUserId(item.userId)),
    overtimeRequests: db.overtimeRequests.filter(item => keepUserId(item.userId)),
    deductionRules: db.deductionRules,
    payrollItems: db.payrollItems.filter(item => keepUserId(item.userId)),
    notifications: notifications.filter(item => keepUserId(item.userId)),
    leaveBalances: leaveBalances.filter(item => keepUserId(item.userId)),
    leavePolicySettings,
    approvalSettings,
    approvalLogs: approvalLogs.filter(
      item => keepUserId(item.submitterUserId) && keepUserId(item.reviewerUserId),
    ),
    taskReviewLogs: taskReviewLogs.filter(
      item => keepUserId(item.userId) && keepUserId(item.operatorUserId),
    ),
    performanceEvents: performanceEvents.filter(item => keepUserId(item.userId)),
    performanceMonthlySummaries: performanceMonthlySummaries.filter(item => keepUserId(item.userId)),
    performanceWarnings: performanceWarnings.filter(item => keepUserId(item.userId)),
    performanceSettings,
    announcements: db.announcements,
    announcementReads: db.announcementReads.filter(item => keepUserId(item.userId)),
    tasks: db.tasks,
    taskAssignees: db.taskAssignees.filter(item => keepUserId(item.userId)),
  };
}

export function normalizeBuiltInUserIds(db: AppDb): AppDb {
  const remap = new Map<string, string>();

  const users = db.users.map(user => {
    const stableId = getSeedUserId(user.username);
    if (!stableId || stableId === user.id) return user;
    remap.set(user.id, stableId);
    return { ...user, id: stableId };
  });

  if (!remap.size) return db;

  const normalizeUserId = (userId: string) => remap.get(userId) ?? userId;

  return {
    ...db,
    users,
    clockEvents: db.clockEvents.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    attendanceDaily: db.attendanceDaily.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    leaveRequests: db.leaveRequests.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    overtimeRequests: db.overtimeRequests.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    payrollItems: db.payrollItems.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    performanceEvents: db.performanceEvents.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    performanceMonthlySummaries: db.performanceMonthlySummaries.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    performanceWarnings: db.performanceWarnings.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    announcementReads: db.announcementReads.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
    taskReviewLogs: db.taskReviewLogs.map(item => ({
      ...item,
      userId: normalizeUserId(item.userId),
      operatorUserId: normalizeUserId(item.operatorUserId),
    })),
    taskAssignees: db.taskAssignees.map(item => ({ ...item, userId: normalizeUserId(item.userId) })),
  };
}
