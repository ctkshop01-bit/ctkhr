import type { AppDb, DeductionRule, User } from "../types/domain.js";
import { createId, nowISO } from "../utils/core.js";
import { getSeedUserId } from "./seedUserIds.js";

function seedUsers(): User[] {
  const createdAtISO = nowISO();
  return [
    {
      id: getSeedUserId("admin")!,
      username: "admin",
      passwordHash: "admin123",
      name: "ผู้ดูแลระบบ",
      role: "admin",
      department: "HR",
      title: "แอดมิน",
      baseSalaryCents: 0,
      status: "active",
      createdAtISO,
    },
    {
      id: getSeedUserId("e001")!,
      username: "e001",
      passwordHash: "123456",
      name: "สมชาย",
      role: "employee",
      department: "แผนกไอที",
      title: "นักพัฒนา Frontend",
      baseSalaryCents: 1800000,
      overtimeHourlyRateCents: 12000,
      weeklyOffDays: [0, 6],
      employmentType: "regular",
      monthlyPaidLeaveDays: 4,
      status: "active",
      createdAtISO,
    },
    {
      id: getSeedUserId("e002")!,
      username: "e002",
      passwordHash: "123456",
      name: "สุดา",
      role: "employee",
      department: "แผนกปฏิบัติการ",
      title: "เจ้าหน้าที่ปฏิบัติการ",
      baseSalaryCents: 1500000,
      overtimeHourlyRateCents: 10000,
      weeklyOffDays: [6],
      employmentType: "regular",
      monthlyPaidLeaveDays: 4,
      status: "active",
      createdAtISO,
    },
  ];
}

function seedDeductionRules(): DeductionRule[] {
  return [
    {
      id: createId("rule"),
      name: "หักเงินมาสาย",
      reason: "มาสาย/ออกก่อนเวลา",
      type: "late",
      amountCents: 5000,
      enabled: true,
    },
    {
      id: createId("rule"),
      name: "หักเงินขาดตอกบัตร",
      reason: "ขาดตอกบัตร",
      type: "missing",
      amountCents: 20000,
      enabled: true,
    },
  ];
}

export function createSeedDb(): AppDb {
  const users = seedUsers();

  return {
    users,
    clockEvents: [],
    attendanceDaily: [],
    leaveRequests: [],
    overtimeRequests: [],
    deductionRules: seedDeductionRules(),
    payrollItems: [],
    notifications: [],
    leaveBalances: [],
    leavePolicySettings: {
      carryoverMode: "none",
      carryoverCapDays: 0,
      monthlyGrantMode: "employee_field",
    },
    approvalSettings: {
      leaveReviewerUserId: null,
      overtimeReviewerUserId: null,
      attendanceReviewerUserId: null,
    },
    approvalLogs: [],
    taskReviewLogs: [],
    performanceEvents: [],
    performanceMonthlySummaries: [],
    performanceWarnings: [],
    performanceSettings: {
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
    },
    announcements: [
      {
        id: createId("ann"),
        title: "ยินดีต้อนรับสู่ระบบเข้างาน",
        content: "ระบบนี้รองรับการตอกบัตร, คำขอลา/ล่วงเวลา, คำนวณเงินเดือน และการอนุมัติจากผู้ดูแล แนะนำให้ตรวจสอบข้อมูลส่วนตัวหลังเข้าสู่ระบบครั้งแรก",
        pinned: true,
        createdAtISO: nowISO(),
      },
    ],
    announcementReads: [],
    tasks: [
      {
        id: createId("tsk"),
        title: "ตรวจสอบข้อมูลส่วนตัว",
        description: "ตรวจสอบชื่อ แผนก และตำแหน่งให้ถูกต้อง",
        dueAtISO: undefined,
        status: "open",
        createdAtISO: nowISO(),
      },
      {
        id: createId("tsk"),
        title: "ส่งรายงานประจำสัปดาห์",
        description: "ส่งรายงานภายในวันศุกร์ 18:00 ผ่านระบบภายใน",
        dueAtISO: undefined,
        status: "open",
        createdAtISO: nowISO(),
      },
    ],
    taskAssignees: [
      { id: createId("ta"), taskId: "all", userId: "all" },
    ],
  };
}
