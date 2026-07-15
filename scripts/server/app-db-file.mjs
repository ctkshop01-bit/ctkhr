import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function withSharedDbDefaults(db) {
  return {
    ...db,
    notifications: db.notifications ?? [],
    leaveBalances: db.leaveBalances ?? [],
    leavePolicySettings: db.leavePolicySettings ?? {
      carryoverMode: "none",
      carryoverCapDays: 0,
      monthlyGrantMode: "employee_field",
    },
    approvalSettings: db.approvalSettings ?? {
      leaveReviewerUserId: null,
      overtimeReviewerUserId: null,
      attendanceReviewerUserId: null,
    },
    approvalLogs: db.approvalLogs ?? [],
  };
}

async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function ensureSharedDbFile(filePath) {
  try {
    return await loadSharedDb(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      await ensureParentDir(filePath);
      return { initialized: false, db: null };
    }
    throw error;
  }
}

export async function loadSharedDb(filePath) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed === null) {
    return { initialized: false, db: null };
  }
  return { initialized: true, db: withSharedDbDefaults(parsed) };
}

export async function saveSharedDb(filePath, db) {
  await ensureParentDir(filePath);
  await writeFile(filePath, JSON.stringify(db, null, 2), "utf8");
}
