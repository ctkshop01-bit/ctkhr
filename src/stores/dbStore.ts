import { create } from "zustand";
import type {
  Announcement,
  ApprovalSettings,
  AppDb,
  ClockType,
  DailyAttendance,
  DeductionRule,
  LeaveRequest,
  LeavePolicySettings,
  OvertimeRequest,
  PayrollItem,
  PerformanceEventItem,
  PerformanceMonthlySummaryItem,
  PerformanceSettings,
  PerformanceWarningItem,
  TaskItem,
  User,
  UserRole,
} from "../types/domain.js";
import { createSeedDb } from "../data/seedDb.js";
import { clearBuiltInDemoUserData } from "../data/seedUserIds.js";
import { loadSharedSnapshot as loadSharedSnapshotFromApi, runSharedCommand } from "../lib/sharedApi.js";
import { nowISO, sha256Hex } from "../utils/core.js";

type DbActions = {
  resetDb: () => void;
  clearBuiltInDemoData: () => void;
  loadSharedSnapshot: () => Promise<void>;
  login: (username: string, password: string) => Promise<User | null>;
  updateAdminCredentials: (input: {
    currentPassword: string;
    newUsername: string;
    newPassword: string;
  }) => Promise<{ ok: true } | { ok: false; code: string }>;
  getUserById: (userId: string) => User | undefined;
  listEmployees: () => User[];
  upsertEmployee: (input: Omit<User, "role" | "createdAtISO" | "passwordHash"> & { password?: string }) => Promise<User>;
  setUserWeeklyOffDays: (userId: string, weeklyOffDays: number[]) => Promise<void>;
  setUserStatus: (userId: string, status: "active" | "inactive") => Promise<void>;
  clock: (
    userId: string,
    type: ClockType,
    payload?: { location?: { lat: number; lng: number; addressText?: string }; photoDataUrl?: string; timeISO?: string },
  ) => Promise<DailyAttendance>;
  submitLeave: (input: Omit<LeaveRequest, "id" | "status" | "createdAtISO">) => Promise<LeaveRequest>;
  submitOvertime: (
    input: Omit<OvertimeRequest, "id" | "status" | "createdAtISO" | "hourlyRateCents" | "overtimePayCents" | "hours"> & {
      hourlyRateCents?: number;
    },
  ) => Promise<OvertimeRequest>;
  reviewLeave: (id: string, reviewerId: string, status: "approved" | "rejected", note?: string) => Promise<void>;
  reviewOvertime: (
    id: string,
    reviewerId: string,
    status: "approved" | "rejected",
    note?: string,
    override?: Partial<Pick<OvertimeRequest, "hourlyRateCents" | "overtimePayCents">>,
  ) => Promise<void>;
  confirmAttendance: (attendanceId: string, patch: Partial<Pick<DailyAttendance, "clockInISO" | "clockOutISO" | "status" | "abnormalReason">>) => Promise<void>;
  upsertDeductionRule: (rule: DeductionRule) => Promise<void>;
  deleteDeductionRule: (id: string) => Promise<void>;
  updatePayrollItem: (
    id: string,
    patch: Partial<Pick<PayrollItem, "baseSalaryCents" | "overtimePayCents" | "deductionsCents" | "netPayCents">>,
  ) => Promise<void>;
  generatePayroll: (monthISO: string) => Promise<PayrollItem[]>;
  markAnnouncementRead: (announcementId: string, userId: string) => Promise<void>;
  markNotificationRead: (userId: string, id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;
  updateApprovalSettings: (patch: Partial<ApprovalSettings>) => Promise<void>;
  updateLeavePolicySettings: (patch: Partial<LeavePolicySettings>) => Promise<void>;
  upsertAnnouncement: (input: Omit<Announcement, "id" | "createdAtISO"> & { id?: string }) => Promise<Announcement>;
  deleteAnnouncement: (id: string) => Promise<void>;
  upsertTask: (input: Omit<TaskItem, "id" | "createdAtISO"> & { id?: string }) => Promise<TaskItem>;
  deleteTask: (id: string) => Promise<void>;
  submitTaskCompletion: (taskId: string, userId: string, submittedAtISO?: string) => Promise<void>;
  reviewTaskCompletion: (taskId: string, reviewerId: string, action: "confirm" | "return", reason?: string) => Promise<void>;
  updatePerformanceSettings: (patch: Partial<PerformanceSettings>) => Promise<void>;
  evaluateSameDayTasksOnClockOut: (
    userId: string,
    dateISO: string,
    clockOutAtISO?: string,
  ) => Promise<{
    event: PerformanceEventItem;
    warnings: PerformanceWarningItem[];
  }>;
  generatePerformanceMonthlySummary: (month: string) => Promise<PerformanceMonthlySummaryItem[]>;
  loadPerformanceSummary: (month: string) => Promise<{
    month: string;
    settings: PerformanceSettings;
    events: PerformanceEventItem[];
    warnings: PerformanceWarningItem[];
    summaries: PerformanceMonthlySummaryItem[];
  }>;
  toggleTaskDone: (taskId: string) => Promise<void>;
};

export type DbStore = AppDb & DbActions;

async function verifyPassword(stored: string, input: string) {
  if (stored.length === 64 && /^[a-f0-9]+$/i.test(stored)) {
    return (await sha256Hex(input)) === stored;
  }
  return stored === input;
}

async function hashIfNeeded(input: string) {
  try {
    return await sha256Hex(input);
  } catch {
    // HTTP/IP deployments may lack crypto.subtle; keep a plaintext fallback so employee saves still persist.
    return input;
  }
}

export const useDbStore = create<DbStore>()((set, get) => {
  const syncDbFromCommand = async <T>(command: unknown, fallbackMessage = "共享命令执行失败") => {
    const result = await runSharedCommand<T>(command);
    if (!result.ok) {
      throw new Error(("message" in result ? result.message : undefined) ?? fallbackMessage);
    }

    set(() => result.db);
    return result.result;
  };

  return {
      ...createSeedDb(),

      resetDb: () => set(() => ({ ...createSeedDb() })),
      clearBuiltInDemoData: () => set(state => clearBuiltInDemoUserData(state)),
      loadSharedSnapshot: async () => {
        const snapshot = await loadSharedSnapshotFromApi();
        if (!snapshot.ok) {
          throw new Error(("message" in snapshot ? snapshot.message : undefined) ?? "共享数据未初始化");
        }
        set(() => snapshot.db);
      },

      login: async (username, password) => {
        const user = get().users.find(u => u.username === username && u.status === "active");
        if (!user) return null;
        const ok = await verifyPassword(user.passwordHash, password);
        return ok ? user : null;
      },

      updateAdminCredentials: async input => {
        const res = await runSharedCommand<null>({
          type: "updateAdminCredentials",
          payload: input,
        });
        if (!res.ok) {
          return { ok: false, code: ("code" in res ? res.code : undefined) ?? "invalid_input" };
        }
        set(() => res.db);
        return { ok: true };
      },

      getUserById: (userId: string) => get().users.find(u => u.id === userId),

      listEmployees: () => get().users.filter(u => u.role === "employee"),

      upsertEmployee: async input => {
        const passwordHash = input.password ? await hashIfNeeded(input.password) : undefined;

        const existing = get().users.find(u => u.id === input.id);
        if (existing) {
          const updated: User = {
            ...existing,
            username: input.username,
            name: input.name,
            department: input.department,
            title: input.title,
            baseSalaryCents: input.baseSalaryCents,
            overtimeHourlyRateCents: input.overtimeHourlyRateCents,
            employmentType: input.employmentType,
            monthlyPaidLeaveDays: input.monthlyPaidLeaveDays,
            status: input.status,
            passwordHash: passwordHash ?? existing.passwordHash,
          };
          return syncDbFromCommand<User>(
            {
              type: "upsertEmployee",
              payload: updated,
            },
            "员工保存失败",
          );
        }

        const created: User = {
          id: input.id,
          username: input.username,
          name: input.name,
          department: input.department,
          title: input.title,
          baseSalaryCents: input.baseSalaryCents,
          overtimeHourlyRateCents: input.overtimeHourlyRateCents,
          employmentType: input.employmentType,
          monthlyPaidLeaveDays: input.monthlyPaidLeaveDays,
          status: input.status,
          role: "employee",
          passwordHash: passwordHash ?? (await hashIfNeeded("123456")),
          createdAtISO: nowISO(),
        };

        return syncDbFromCommand<User>(
          {
            type: "upsertEmployee",
            payload: created,
          },
          "员工保存失败",
        );
      },

      setUserWeeklyOffDays: async (userId, weeklyOffDays) => {
        await syncDbFromCommand<null>(
          {
            type: "setUserWeeklyOffDays",
            payload: { userId, weeklyOffDays },
          },
          "休息日更新失败",
        );
      },

      setUserStatus: async (userId, status) => {
        await syncDbFromCommand<null>(
          {
            type: "setUserStatus",
            payload: { userId, status },
          },
          "员工状态更新失败",
        );
      },

      clock: (userId, type, payload) =>
        syncDbFromCommand<DailyAttendance>(
          {
            type: "clock",
            payload: { userId, type, payload },
          },
          "打卡失败",
        ),

      submitLeave: input =>
        syncDbFromCommand<LeaveRequest>(
          {
            type: "submitLeave",
            payload: input,
          },
          "请假提交失败",
        ),

      submitOvertime: input =>
        syncDbFromCommand<OvertimeRequest>(
          {
            type: "submitOvertime",
            payload: input,
          },
          "加班提交失败",
        ),

      reviewLeave: async (id, reviewerId, status, note) => {
        await syncDbFromCommand<null>(
          {
            type: "reviewLeave",
            payload: { id, reviewerId, status, note },
          },
          "请假审批失败",
        );
      },

      reviewOvertime: async (id, reviewerId, status, note, override) => {
        await syncDbFromCommand<null>(
          {
            type: "reviewOvertime",
            payload: { id, reviewerId, status, note, override },
          },
          "加班审批失败",
        );
      },

      confirmAttendance: async (attendanceId, patch) => {
        await syncDbFromCommand<null>(
          {
            type: "confirmAttendance",
            payload: { attendanceId, patch },
          },
          "考勤确认失败",
        );
      },

      upsertDeductionRule: async rule => {
        await syncDbFromCommand<null>(
          {
            type: "upsertDeductionRule",
            payload: rule,
          },
          "扣款规则保存失败",
        );
      },

      deleteDeductionRule: async id => {
        await syncDbFromCommand<null>(
          {
            type: "deleteDeductionRule",
            payload: { id },
          },
          "扣款规则删除失败",
        );
      },

      updatePayrollItem: async (id, patch) => {
        await syncDbFromCommand<null>(
          {
            type: "updatePayrollItem",
            payload: { id, patch },
          },
          "工资项更新失败",
        );
      },

      generatePayroll: monthISO =>
        syncDbFromCommand<PayrollItem[]>(
          {
            type: "generatePayroll",
            payload: { monthISO },
          },
          "工资生成失败",
        ),

      markAnnouncementRead: async (announcementId, userId) => {
        await syncDbFromCommand<null>(
          {
            type: "markAnnouncementRead",
            payload: { announcementId, userId },
          },
          "公告已读状态更新失败",
        );
      },

      markNotificationRead: async (userId, id) => {
        await syncDbFromCommand<null>(
          {
            type: "markNotificationRead",
            payload: { userId, id },
          },
          "消息已读状态更新失败",
        );
      },

      markAllNotificationsRead: async userId => {
        await syncDbFromCommand<null>(
          {
            type: "markAllNotificationsRead",
            payload: { userId },
          },
          "全部消息已读状态更新失败",
        );
      },

      updateApprovalSettings: async patch => {
        await syncDbFromCommand<null>(
          {
            type: "updateApprovalSettings",
            payload: patch,
          },
          "审批设置更新失败",
        );
      },

      updateLeavePolicySettings: async patch => {
        await syncDbFromCommand<null>(
          {
            type: "updateLeavePolicySettings",
            payload: patch,
          },
          "假期策略更新失败",
        );
      },

      upsertAnnouncement: input =>
        syncDbFromCommand<Announcement>(
          {
            type: "upsertAnnouncement",
            payload: input,
          },
          "公告保存失败",
        ),

      deleteAnnouncement: async id => {
        await syncDbFromCommand<null>(
          {
            type: "deleteAnnouncement",
            payload: { id },
          },
          "公告删除失败",
        );
      },

      upsertTask: input =>
        syncDbFromCommand<TaskItem>(
          {
            type: "upsertTask",
            payload: input,
          },
          "任务保存失败",
        ),

      deleteTask: async id => {
        await syncDbFromCommand<null>(
          {
            type: "deleteTask",
            payload: { id },
          },
          "任务删除失败",
        );
      },

      submitTaskCompletion: async (taskId, userId, submittedAtISO) => {
        await syncDbFromCommand<null>(
          {
            type: "submitTaskCompletion",
            payload: { taskId, userId, submittedAtISO },
          },
          "任务提交失败",
        );
      },

      reviewTaskCompletion: async (taskId, reviewerId, action, reason) => {
        await syncDbFromCommand<null>(
          {
            type: "reviewTaskCompletion",
            payload: { taskId, reviewerId, action, reason },
          },
          "任务审核失败",
        );
      },

      updatePerformanceSettings: async patch => {
        await syncDbFromCommand<PerformanceSettings>(
          {
            type: "updatePerformanceSettings",
            payload: patch,
          },
          "绩效规则更新失败",
        );
      },

      evaluateSameDayTasksOnClockOut: async (userId, dateISO, clockOutAtISO) =>
        syncDbFromCommand<{
          event: PerformanceEventItem;
          warnings: PerformanceWarningItem[];
        }>(
          {
            type: "evaluateSameDayTasksOnClockOut",
            payload: { userId, dateISO, clockOutAtISO },
          },
          "下班绩效评估失败",
        ),

      generatePerformanceMonthlySummary: async month =>
        syncDbFromCommand<PerformanceMonthlySummaryItem[]>(
          {
            type: "generatePerformanceMonthlySummary",
            payload: { month },
          },
          "绩效月汇总生成失败",
        ),

      loadPerformanceSummary: async month =>
        syncDbFromCommand<{
          month: string;
          settings: PerformanceSettings;
          events: PerformanceEventItem[];
          warnings: PerformanceWarningItem[];
          summaries: PerformanceMonthlySummaryItem[];
        }>(
          {
            type: "loadPerformanceSummary",
            payload: { month },
          },
          "绩效汇总加载失败",
        ),

      toggleTaskDone: async taskId => {
        await syncDbFromCommand<null>(
          {
            type: "toggleTaskDone",
            payload: { taskId },
          },
          "任务状态更新失败",
        );
      },
    };
});

export function canAccess(role: UserRole, path: string) {
  if (path.startsWith("/admin")) return role === "admin";
  if (path.startsWith("/app")) return role === "employee";
  return true;
}
