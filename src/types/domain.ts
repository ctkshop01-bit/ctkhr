export type UserRole = "employee" | "admin";

export type UserStatus = "active" | "inactive";

export type EmploymentType = "regular" | "probation";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  department?: string;
  title?: string;
  baseSalaryCents: number;
  overtimeHourlyRateCents?: number;
  weeklyOffDays?: number[];
  employmentType?: EmploymentType;
  monthlyPaidLeaveDays?: number;
  status: UserStatus;
  createdAtISO: string;
}

export type ClockType = "in" | "out" | "ot_start" | "ot_end";

export interface GeoLocation {
  lat: number;
  lng: number;
  addressText?: string;
}

export interface ClockEvent {
  id: string;
  userId: string;
  type: ClockType;
  timeISO: string;
  location?: GeoLocation;
  photoDataUrl?: string;
}

export type AttendanceStatus =
  | "normal"
  | "late"
  | "early_leave"
  | "missing"
  | "leave"
  | "overtime";

export interface DailyAttendance {
  id: string;
  userId: string;
  dateISO: string;
  clockInISO?: string;
  clockOutISO?: string;
  status: AttendanceStatus;
  abnormalReason?: string;
  confirmed?: boolean;
}

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: "annual" | "sick" | "personal" | "other";
  startISO: string;
  endISO: string;
  hours: number;
  reason: string;
  status: RequestStatus;
  reviewerId?: string;
  reviewNote?: string;
  createdAtISO: string;
  reviewedAtISO?: string;
}

export interface OvertimeRequest {
  id: string;
  userId: string;
  startISO: string;
  endISO: string;
  hours: number;
  hourlyRateCents: number;
  overtimePayCents: number;
  reason: string;
  status: RequestStatus;
  reviewerId?: string;
  reviewNote?: string;
  createdAtISO: string;
  reviewedAtISO?: string;
}

export interface DeductionRule {
  id: string;
  name: string;
  reason?: string;
  type: "late" | "missing" | "custom";
  amountCents: number;
  enabled: boolean;
}

export interface PayrollItem {
  id: string;
  userId: string;
  monthISO: string;
  baseSalaryCents: number;
  overtimePayCents: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  unpaidLeaveDeductionCents?: number;
  missingDays?: number;
  missingDeductionCents?: number;
  deductionsCents: number;
  netPayCents: number;
  generatedAtISO: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAtISO: string;
}

export interface AnnouncementRead {
  id: string;
  announcementId: string;
  userId: string;
  readAtISO: string;
}

export type TaskStatus = "open" | "submitted" | "confirmed" | "returned" | "overdue" | "closed";

export type TaskType = "same_day" | "normal";

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueAtISO?: string;
  status: TaskStatus;
  taskType?: TaskType;
  submittedAtISO?: string;
  submittedByUserId?: string;
  confirmedAtISO?: string;
  confirmedByUserId?: string;
  returnCount?: number;
  lastReturnedAtISO?: string;
  lastReturnReason?: string;
  includeInPerformance?: boolean;
  performanceEvaluated?: boolean;
  createdAtISO: string;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
}

export type NotificationType = "leave_reviewed" | "overtime_reviewed" | "attendance_confirmed" | "announcement_published" | "task_created";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedType: "leave" | "overtime" | "attendance" | "announcement" | "task";
  relatedId: string;
  isRead: boolean;
  createdAtISO: string;
}

export interface LeaveBalanceItem {
  userId: string;
  month: string;
  grantedDays: number;
  carriedDays: number;
  usedPaidDays: number;
  usedUnpaidDays: number;
  expiredDays: number;
  closingBalanceDays: number;
}

export interface LeavePolicySettings {
  carryoverMode: "none" | "full" | "capped";
  carryoverCapDays: number;
  monthlyGrantMode: "employee_field";
}

export interface ApprovalSettings {
  leaveReviewerUserId: string | null;
  overtimeReviewerUserId: string | null;
  attendanceReviewerUserId: string | null;
}

export interface ApprovalLogItem {
  id: string;
  requestType: "leave" | "overtime" | "attendance";
  requestId: string;
  submitterUserId: string;
  reviewerUserId: string;
  decision: "approved" | "rejected" | "confirmed";
  note: string;
  createdAtISO: string;
}

export interface TaskReviewLogItem {
  id: string;
  taskId: string;
  userId: string;
  action: "submit" | "confirm" | "return";
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  operatorUserId: string;
  operatorRole: UserRole;
  reason?: string;
  createdAtISO: string;
}

export interface PerformanceEventItem {
  id: string;
  userId: string;
  date: string;
  month: string;
  category: "task" | "attendance" | "reward" | "warning" | "manual_adjustment";
  eventType: string;
  scoreDelta: number;
  warningDelta: number;
  sourceType: "task" | "attendance" | "system" | "manual";
  sourceId: string;
  title: string;
  detail: string;
  createdAtISO: string;
  createdBy: string;
  isReverted?: boolean;
  revertedAtISO?: string;
  revertReason?: string;
}

export interface PerformanceWarningItem {
  id: string;
  userId: string;
  month: string;
  warningType: "late" | "early_leave" | "task_unfinished";
  triggerCount: number;
  threshold: number;
  sourceEventIds: string[];
  createdAtISO: string;
  resolved: boolean;
  resolvedAtISO?: string;
  note?: string;
}

export interface PerformanceMonthlySummaryItem {
  id: string;
  userId: string;
  month: string;
  baseScore: number;
  taskScore: number;
  attendanceScore: number;
  rewardScore: number;
  warningPenaltyScore: number;
  manualAdjustmentScore: number;
  finalScore: number;
  warningCount: number;
  kpiBaseCents: number;
  kpiRate: number;
  kpiPayoutCents: number;
  generatedAtISO: string;
  status: "draft" | "finalized";
}

export interface PerformanceSettings {
  enabled: boolean;
  scoreBase: number;
  kpiBaseDefaultCents: number;
  fullAttendanceBonus: number;
  kpiRateRules: Array<{ minScore: number; rate: number }>;
  taskRules: {
    allCompletedBonus: number;
    unfinishedTier1Penalty: number;
    unfinishedTier2Penalty: number;
    unfinishedTier3Penalty: number;
    afterClockOutPenalty: number;
    returnPenalty: number;
    multiReturnExtraPenalty: number;
  };
  attendanceRules: {
    latePenalty: number;
    seriousLatePenalty: number;
    earlyLeavePenalty: number;
    seriousEarlyLeavePenalty: number;
    missingPunchPenalty: number;
  };
  warningRules: {
    lateThreshold: number;
    earlyLeaveThreshold: number;
    taskUnfinishedThreshold: number;
    secondWarningPenalty: number;
    thirdWarningPenalty: number;
  };
}

export interface AppDb {
  users: User[];
  clockEvents: ClockEvent[];
  attendanceDaily: DailyAttendance[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  deductionRules: DeductionRule[];
  payrollItems: PayrollItem[];
  announcements: Announcement[];
  announcementReads: AnnouncementRead[];
  tasks: TaskItem[];
  taskAssignees: TaskAssignee[];
  notifications: NotificationItem[];
  leaveBalances: LeaveBalanceItem[];
  leavePolicySettings: LeavePolicySettings;
  approvalSettings: ApprovalSettings;
  approvalLogs: ApprovalLogItem[];
  taskReviewLogs: TaskReviewLogItem[];
  performanceEvents: PerformanceEventItem[];
  performanceMonthlySummaries: PerformanceMonthlySummaryItem[];
  performanceWarnings: PerformanceWarningItem[];
  performanceSettings: PerformanceSettings;
}
