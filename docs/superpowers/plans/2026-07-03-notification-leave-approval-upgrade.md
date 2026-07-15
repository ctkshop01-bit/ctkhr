# Notification, Leave Balance, and Approval Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an employee-facing in-app notification center, monthly leave balance with configurable carryover, and configurable single-reviewer approval routing with audit logs on top of the current shared-data HR system.

**Architecture:** Extend the shared JSON database and command handlers with four additive structures: `notifications`, `leaveBalances`, `leavePolicySettings`, and `approvalSettings`/`approvalLogs`. Keep existing employee/admin pages and shared API flow intact, then layer new behavior into current commands (`submitLeave`, `reviewLeave`, `submitOvertime`, `reviewOvertime`, `confirmAttendance`, `createAnnouncement`, `createTask`, `generatePayroll`) so UI changes stay thin and most rules remain centralized in the shared server path.

**Tech Stack:** React, TypeScript, Zustand, Node shared command server, JSON database, node:test, tsx

---

## File Structure

**Create**
- `d:\HR\src\pages\employee\Notifications.tsx` - employee notification center page
- `d:\HR\src\pages\admin\ApprovalSettings.tsx` - admin page for reviewer configuration and leave carryover settings
- `d:\HR\src\stores\leaveBalancePolicy.ts` - pure helpers for monthly grant, carryover, and paid/unpaid leave allocation
- `d:\HR\tests\notificationCommands.test.ts` - server-side notification generation and read-state tests
- `d:\HR\tests\leaveBalancePolicyFlow.test.ts` - leave balance grant/carryover/allocation tests
- `d:\HR\tests\approvalSettingsFlow.test.ts` - reviewer configuration and submission blocking tests
- `d:\HR\tests\employeeNotificationsRoute.test.ts` - route/layout/message-center source assertions
- `d:\HR\tests\adminApprovalSettingsRoute.test.ts` - admin settings route/layout/source assertions

**Modify**
- `d:\HR\src\types\domain.ts` - add new domain types and DB shape
- `d:\HR\src\data\seedDb.ts` - seed defaults for new collections/settings
- `d:\HR\src\stores\dbStore.ts` - add new actions and wire shared commands
- `d:\HR\src\App.tsx` - add employee/admin routes
- `d:\HR\src\pages\employee\EmployeeLayout.tsx` - add notification entry and unread badge
- `d:\HR\src\pages\employee\Dashboard.tsx` - add unread summary and leave balance summary
- `d:\HR\src\pages\employee\Requests.tsx` - show paid leave balance/consumption hints and handle reviewer-not-configured errors
- `d:\HR\src\pages\admin\AdminLayout.tsx` - add approval settings nav entry
- `d:\HR\src\pages\admin\Approvals.tsx` - show reviewer info and approval log summary
- `d:\HR\src\pages\admin\Employees.tsx` - show leave balance summary
- `d:\HR\src\pages\admin\Payroll.tsx` - display paid/unpaid leave results based on leave balance outputs
- `d:\HR\src\i18n\translations.ts` - add translation keys for notifications, leave balances, approval settings, and error messages
- `d:\HR\scripts\server\app-db-commands.mjs` - add new commands and extend current shared mutations
- `d:\HR\tests\sharedServerApi.test.ts` - cover shared API command behavior for new flows
- `d:\HR\tests\dbStorePayroll.test.ts` - expand payroll integration tests
- `d:\HR\tests\authRefreshSharedSnapshot.test.ts` - keep existing refresh guard intact if route/layout changes require updates

---

### Task 1: Extend Domain Types and Seed Defaults

**Files:**
- Create: `d:\HR\tests\leaveBalancePolicyFlow.test.ts`
- Modify: `d:\HR\src\types\domain.ts`
- Modify: `d:\HR\src\data\seedDb.ts`
- Test: `d:\HR\tests\leaveBalancePolicyFlow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN_PATH = resolve(process.cwd(), "src", "types", "domain.ts");
const SEED_PATH = resolve(process.cwd(), "src", "data", "seedDb.ts");

test("domain defines notification, leave balance, and approval settings structures", () => {
  const source = readFileSync(DOMAIN_PATH, "utf8");

  assert.match(source, /export type NotificationType = "leave_reviewed" \| "overtime_reviewed" \| "attendance_confirmed" \| "announcement_published" \| "task_created"/);
  assert.match(source, /export interface NotificationItem/);
  assert.match(source, /export interface LeaveBalanceItem/);
  assert.match(source, /export interface LeavePolicySettings/);
  assert.match(source, /export interface ApprovalSettings/);
  assert.match(source, /export interface ApprovalLogItem/);
  assert.match(source, /notifications: NotificationItem\[\]/);
  assert.match(source, /leaveBalances: LeaveBalanceItem\[\]/);
  assert.match(source, /leavePolicySettings: LeavePolicySettings/);
  assert.match(source, /approvalSettings: ApprovalSettings/);
  assert.match(source, /approvalLogs: ApprovalLogItem\[\]/);
});

test("seed db initializes additive defaults for notifications, leave balances, and approval settings", () => {
  const source = readFileSync(SEED_PATH, "utf8");

  assert.match(source, /notifications: \[\]/);
  assert.match(source, /leaveBalances: \[\]/);
  assert.match(source, /carryoverMode: "none"/);
  assert.match(source, /carryoverCapDays: 0/);
  assert.match(source, /approvalSettings: \{/);
  assert.match(source, /leaveReviewerUserId: null/);
  assert.match(source, /approvalLogs: \[\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test d:\HR\tests\leaveBalancePolicyFlow.test.ts
```

Expected: FAIL because the new domain types and seed defaults do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add these types to `d:\HR\src\types\domain.ts`:

```ts
export type NotificationType =
  | "leave_reviewed"
  | "overtime_reviewed"
  | "attendance_confirmed"
  | "announcement_published"
  | "task_created";

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
```

Extend the database shape in `d:\HR\src\types\domain.ts`:

```ts
notifications: NotificationItem[];
leaveBalances: LeaveBalanceItem[];
leavePolicySettings: LeavePolicySettings;
approvalSettings: ApprovalSettings;
approvalLogs: ApprovalLogItem[];
```

Seed defaults in `d:\HR\src\data\seedDb.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test d:\HR\tests\leaveBalancePolicyFlow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\src\types\domain.ts d:\HR\src\data\seedDb.ts d:\HR\tests\leaveBalancePolicyFlow.test.ts
git commit -m "feat: add notification and leave balance domain models"
```

---

### Task 2: Add Pure Leave Balance Policy Helpers

**Files:**
- Create: `d:\HR\src\stores\leaveBalancePolicy.ts`
- Modify: `d:\HR\tests\leaveBalancePolicyFlow.test.ts`
- Test: `d:\HR\tests\leaveBalancePolicyFlow.test.ts`

- [ ] **Step 1: Write the failing test**

Append these tests to `d:\HR\tests\leaveBalancePolicyFlow.test.ts`:

```ts
import { allocateLeaveUsage, buildNextLeaveBalance } from "../src/stores/leaveBalancePolicy";

test("allocateLeaveUsage consumes paid leave before unpaid leave", () => {
  assert.deepEqual(
    allocateLeaveUsage({ requestedDays: 5, availablePaidDays: 3 }),
    { usedPaidDays: 3, usedUnpaidDays: 2 }
  );
});

test("buildNextLeaveBalance applies capped carryover", () => {
  assert.deepEqual(
    buildNextLeaveBalance({
      month: "2026-08",
      grantDays: 4,
      previousClosingBalanceDays: 6,
      carryoverMode: "capped",
      carryoverCapDays: 2,
      usedPaidDays: 1,
      usedUnpaidDays: 0,
    }),
    {
      month: "2026-08",
      grantedDays: 4,
      carriedDays: 2,
      usedPaidDays: 1,
      usedUnpaidDays: 0,
      expiredDays: 4,
      closingBalanceDays: 5,
    }
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test d:\HR\tests\leaveBalancePolicyFlow.test.ts
```

Expected: FAIL because `leaveBalancePolicy.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `d:\HR\src\stores\leaveBalancePolicy.ts`:

```ts
export function allocateLeaveUsage({ requestedDays, availablePaidDays }: { requestedDays: number; availablePaidDays: number }) {
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
}: {
  month: string;
  grantDays: number;
  previousClosingBalanceDays: number;
  carryoverMode: "none" | "full" | "capped";
  carryoverCapDays: number;
  usedPaidDays: number;
  usedUnpaidDays: number;
}) {
  const rawCarry = carryoverMode === "none"
    ? 0
    : carryoverMode === "full"
      ? previousClosingBalanceDays
      : Math.min(previousClosingBalanceDays, carryoverCapDays);
  const expiredDays = Math.max(0, previousClosingBalanceDays - rawCarry);
  const closingBalanceDays = Math.max(0, rawCarry + grantDays - usedPaidDays);

  return {
    month,
    grantedDays: grantDays,
    carriedDays: rawCarry,
    usedPaidDays,
    usedUnpaidDays,
    expiredDays,
    closingBalanceDays,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test d:\HR\tests\leaveBalancePolicyFlow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\src\stores\leaveBalancePolicy.ts d:\HR\tests\leaveBalancePolicyFlow.test.ts
git commit -m "feat: add leave balance policy helpers"
```

---

### Task 3: Add Approval Settings Validation and Approval Logs in Shared Commands

**Files:**
- Create: `d:\HR\tests\approvalSettingsFlow.test.ts`
- Modify: `d:\HR\scripts\server\app-db-commands.mjs`
- Modify: `d:\HR\tests\sharedServerApi.test.ts`
- Test: `d:\HR\tests\approvalSettingsFlow.test.ts`

- [ ] **Step 1: Write the failing test**

Create `d:\HR\tests\approvalSettingsFlow.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHrServer } from "../scripts/serve-dist.mjs";

async function startServer(db: any) {
  const root = await mkdtemp(join(tmpdir(), "hr-approval-"));
  const dataFilePath = join(root, "app-db.json");
  writeFileSync(dataFilePath, JSON.stringify(db, null, 2));
  const server = createHrServer({ dataFilePath });
  await server.listen(0);
  const port = server.address().port;
  return { server, port, dataFilePath };
}

test("submitLeave rejects when leave reviewer is not configured", async () => {
  const db = JSON.parse(readFileSync("d:/HR/data/app-db.json", "utf8"));
  db.approvalSettings = { leaveReviewerUserId: null, overtimeReviewerUserId: null, attendanceReviewerUserId: null };
  const { server, port } = await startServer(db);

  const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      command: {
        type: "submitLeave",
        payload: {
          userId: db.users.find((u: any) => u.role === "employee").id,
          leaveType: "annual",
          startISO: "2026-07-03T09:00:00.000Z",
          endISO: "2026-07-03T18:00:00.000Z",
          hours: 8,
          reason: "Need leave",
        },
      },
    }),
  });

  assert.equal(res.status, 400);
  assert.match(await res.text(), /reviewer/i);
  await server.close();
});

test("reviewLeave writes approval log entry", async () => {
  const db = JSON.parse(readFileSync("d:/HR/data/app-db.json", "utf8"));
  const employee = db.users.find((u: any) => u.role === "employee" && u.status === "active");
  const reviewer = db.users.find((u: any) => u.role === "admin");
  db.approvalSettings = {
    leaveReviewerUserId: reviewer.id,
    overtimeReviewerUserId: reviewer.id,
    attendanceReviewerUserId: reviewer.id,
  };
  db.leaveRequests = [{
    id: "leave-1",
    userId: employee.id,
    leaveType: "annual",
    startISO: "2026-07-03T09:00:00.000Z",
    endISO: "2026-07-03T18:00:00.000Z",
    hours: 8,
    reason: "Need leave",
    status: "pending",
  }];
  db.approvalLogs = [];

  const { server, port, dataFilePath } = await startServer(db);

  const res = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      command: {
        type: "reviewLeave",
        payload: {
          id: "leave-1",
          reviewerId: reviewer.id,
          approved: true,
          note: "Approved",
        },
      },
    }),
  });

  assert.equal(res.status, 200);
  const updated = JSON.parse(readFileSync(dataFilePath, "utf8"));
  assert.equal(updated.approvalLogs.length, 1);
  assert.equal(updated.approvalLogs[0].requestType, "leave");
  assert.equal(updated.approvalLogs[0].reviewerUserId, reviewer.id);
  await server.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test d:\HR\tests\approvalSettingsFlow.test.ts
```

Expected: FAIL because approval settings validation and approval logs are not implemented.

- [ ] **Step 3: Write minimal implementation**

In `d:\HR\scripts\server\app-db-commands.mjs`, add helpers:

```js
function getConfiguredReviewer(db, requestType) {
  if (requestType === "leave") return db.approvalSettings?.leaveReviewerUserId ?? null;
  if (requestType === "overtime") return db.approvalSettings?.overtimeReviewerUserId ?? null;
  return db.approvalSettings?.attendanceReviewerUserId ?? null;
}

function ensureReviewerConfigured(db, requestType) {
  const reviewerUserId = getConfiguredReviewer(db, requestType);
  const reviewer = db.users.find(u => u.id === reviewerUserId && u.status === "active");
  if (!reviewer) {
    throw new Error(`${requestType} reviewer is not configured`);
  }
  return reviewer.id;
}

function appendApprovalLog(db, log) {
  db.approvalLogs.push({
    id: crypto.randomUUID(),
    createdAtISO: new Date().toISOString(),
    ...log,
  });
}
```

Use them in existing command handlers:

```js
case "submitLeave": {
  ensureReviewerConfigured(db, "leave");
  // existing submitLeave logic
}

case "submitOvertime": {
  ensureReviewerConfigured(db, "overtime");
  // existing submitOvertime logic
}

case "reviewLeave": {
  // existing mutation
  appendApprovalLog(db, {
    requestType: "leave",
    requestId: req.id,
    submitterUserId: req.userId,
    reviewerUserId: payload.reviewerId,
    decision: payload.approved ? "approved" : "rejected",
    note: payload.note ?? "",
  });
}
```

Also append approval logs in `reviewOvertime` and `confirmAttendance`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test d:\HR\tests\approvalSettingsFlow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\scripts\server\app-db-commands.mjs d:\HR\tests\approvalSettingsFlow.test.ts
git commit -m "feat: add reviewer settings validation and approval logs"
```

---

### Task 4: Add Notification Generation and Read-State Commands

**Files:**
- Create: `d:\HR\tests\notificationCommands.test.ts`
- Modify: `d:\HR\scripts\server\app-db-commands.mjs`
- Modify: `d:\HR\src\stores\dbStore.ts`
- Test: `d:\HR\tests\notificationCommands.test.ts`

- [ ] **Step 1: Write the failing test**

Create `d:\HR\tests\notificationCommands.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHrServer } from "../scripts/serve-dist.mjs";

async function startServer(db: any) {
  const root = await mkdtemp(join(tmpdir(), "hr-notify-"));
  const dataFilePath = join(root, "app-db.json");
  writeFileSync(dataFilePath, JSON.stringify(db, null, 2));
  const server = createHrServer({ dataFilePath });
  await server.listen(0);
  const port = server.address().port;
  return { server, port, dataFilePath };
}

test("reviewLeave creates a notification for the employee", async () => {
  const db = JSON.parse(readFileSync("d:/HR/data/app-db.json", "utf8"));
  const employee = db.users.find((u: any) => u.role === "employee" && u.status === "active");
  const reviewer = db.users.find((u: any) => u.role === "admin");
  db.notifications = [];
  db.leaveRequests = [{
    id: "leave-1",
    userId: employee.id,
    leaveType: "annual",
    startISO: "2026-07-03T09:00:00.000Z",
    endISO: "2026-07-03T18:00:00.000Z",
    hours: 8,
    reason: "Need leave",
    status: "pending",
  }];

  const { server, port, dataFilePath } = await startServer(db);
  await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      command: {
        type: "reviewLeave",
        payload: { id: "leave-1", reviewerId: reviewer.id, approved: true, note: "ok" },
      },
    }),
  });

  const updated = JSON.parse(readFileSync(dataFilePath, "utf8"));
  assert.equal(updated.notifications.length, 1);
  assert.equal(updated.notifications[0].userId, employee.id);
  assert.equal(updated.notifications[0].type, "leave_reviewed");
  assert.equal(updated.notifications[0].isRead, false);
  await server.close();
});

test("markAllNotificationsRead flips unread messages for one employee only", async () => {
  const db = JSON.parse(readFileSync("d:/HR/data/app-db.json", "utf8"));
  const employee = db.users.find((u: any) => u.role === "employee");
  const other = db.users.find((u: any) => u.role === "admin");
  db.notifications = [
    { id: "n1", userId: employee.id, type: "task_created", title: "A", body: "A", relatedType: "task", relatedId: "t1", isRead: false, createdAtISO: "2026-07-03T00:00:00.000Z" },
    { id: "n2", userId: other.id, type: "task_created", title: "B", body: "B", relatedType: "task", relatedId: "t2", isRead: false, createdAtISO: "2026-07-03T00:00:00.000Z" },
  ];

  const { server, port, dataFilePath } = await startServer(db);
  await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      command: {
        type: "markAllNotificationsRead",
        payload: { userId: employee.id },
      },
    }),
  });

  const updated = JSON.parse(readFileSync(dataFilePath, "utf8"));
  assert.equal(updated.notifications.find((n: any) => n.id === "n1").isRead, true);
  assert.equal(updated.notifications.find((n: any) => n.id === "n2").isRead, false);
  await server.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test d:\HR\tests\notificationCommands.test.ts
```

Expected: FAIL because notification generation and read commands do not exist.

- [ ] **Step 3: Write minimal implementation**

In `d:\HR\scripts\server\app-db-commands.mjs`, add helpers:

```js
function appendNotification(db, notification) {
  db.notifications.push({
    id: crypto.randomUUID(),
    createdAtISO: new Date().toISOString(),
    isRead: false,
    ...notification,
  });
}

function appendNotificationForActiveEmployees(db, notificationFactory) {
  for (const user of db.users.filter(u => u.role === "employee" && u.status === "active")) {
    appendNotification(db, notificationFactory(user));
  }
}
```

Call them from existing command handlers:

```js
appendNotification(db, {
  userId: req.userId,
  type: "leave_reviewed",
  title: approved ? "请假已通过" : "请假被驳回",
  body: note || "请查看审批详情",
  relatedType: "leave",
  relatedId: req.id,
});
```

Also add handlers:

```js
case "markNotificationRead": {
  const item = db.notifications.find(n => n.id === payload.id && n.userId === payload.userId);
  if (item) item.isRead = true;
  return db;
}

case "markAllNotificationsRead": {
  db.notifications = db.notifications.map(n =>
    n.userId === payload.userId ? { ...n, isRead: true } : n
  );
  return db;
}
```

In `d:\HR\src\stores\dbStore.ts`, wire actions:

```ts
markNotificationRead: async (userId, id) => {
  const snapshot = await runSharedCommand({ type: "markNotificationRead", payload: { userId, id } });
  set({ ...snapshot });
},
markAllNotificationsRead: async (userId) => {
  const snapshot = await runSharedCommand({ type: "markAllNotificationsRead", payload: { userId } });
  set({ ...snapshot });
},
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test d:\HR\tests\notificationCommands.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\scripts\server\app-db-commands.mjs d:\HR\src\stores\dbStore.ts d:\HR\tests\notificationCommands.test.ts
git commit -m "feat: add notification generation and read actions"
```

---

### Task 5: Integrate Leave Balances into Shared Payroll Generation

**Files:**
- Modify: `d:\HR\scripts\server\app-db-commands.mjs`
- Modify: `d:\HR\src\stores\leaveBalancePolicy.ts`
- Modify: `d:\HR\tests\dbStorePayroll.test.ts`
- Test: `d:\HR\tests\dbStorePayroll.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `d:\HR\tests\dbStorePayroll.test.ts`:

```ts
test("generatePayroll uses leave balance carryover and splits paid vs unpaid leave", () => {
  const db = createSeedDb();
  const employee = db.users.find(u => u.role === "employee" && u.status === "active")!;
  db.leavePolicySettings = {
    carryoverMode: "capped",
    carryoverCapDays: 2,
    monthlyGrantMode: "employee_field",
  };
  db.leaveBalances = [{
    userId: employee.id,
    month: "2026-06",
    grantedDays: 4,
    carriedDays: 0,
    usedPaidDays: 0,
    usedUnpaidDays: 0,
    expiredDays: 0,
    closingBalanceDays: 6,
  }];
  db.leaveRequests = [{
    id: "leave-1",
    userId: employee.id,
    leaveType: "annual",
    startISO: "2026-07-03T09:00:00.000Z",
    endISO: "2026-07-04T18:00:00.000Z",
    hours: 16,
    reason: "leave",
    status: "approved",
  }];

  const next = generatePayroll(db, "2026-07");
  const item = next.payrollItems.find(p => p.userId === employee.id && p.month === "2026-07")!;
  const balance = next.leaveBalances.find(b => b.userId === employee.id && b.month === "2026-07")!;

  assert.equal(balance.carriedDays, 2);
  assert.equal(balance.usedPaidDays, 2);
  assert.equal(balance.usedUnpaidDays, 0);
  assert.equal(item.paidLeaveDays, 2);
  assert.equal(item.unpaidLeaveDays, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test d:\HR\tests\dbStorePayroll.test.ts
```

Expected: FAIL because payroll generation does not currently derive balances from `leaveBalances`.

- [ ] **Step 3: Write minimal implementation**

In `d:\HR\scripts\server\app-db-commands.mjs`, add a helper:

```js
function ensureLeaveBalanceForMonth(db, user, month, approvedLeaveDays) {
  const previousMonth = getPreviousMonthISO(month);
  const previous = db.leaveBalances.find(b => b.userId === user.id && b.month === previousMonth);
  const requestedDays = approvedLeaveDays;
  const previousClosingBalanceDays = previous?.closingBalanceDays ?? 0;
  const grantDays = user.monthlyPaidLeaveDays ?? 0;
  const { usedPaidDays, usedUnpaidDays } = allocateLeaveUsage({
    requestedDays,
    availablePaidDays:
      (db.leavePolicySettings?.carryoverMode === "none"
        ? 0
        : db.leavePolicySettings?.carryoverMode === "full"
          ? previousClosingBalanceDays
          : Math.min(previousClosingBalanceDays, db.leavePolicySettings?.carryoverCapDays ?? 0)) + grantDays,
  });

  return buildNextLeaveBalance({
    month,
    grantDays,
    previousClosingBalanceDays,
    carryoverMode: db.leavePolicySettings?.carryoverMode ?? "none",
    carryoverCapDays: db.leavePolicySettings?.carryoverCapDays ?? 0,
    usedPaidDays,
    usedUnpaidDays,
  });
}
```

Use the helper inside payroll generation:

```js
const leaveBalance = ensureLeaveBalanceForMonth(db, user, month, leaveDays);
upsertLeaveBalance(db, user.id, leaveBalance);

paidLeaveDays: leaveBalance.usedPaidDays,
unpaidLeaveDays: leaveBalance.usedUnpaidDays,
unpaidLeaveDeductionCents: Math.round(leaveBalance.usedUnpaidDays * dailySalaryCents),
```

Also export any pure helpers needed in testable locations.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test d:\HR\tests\dbStorePayroll.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\scripts\server\app-db-commands.mjs d:\HR\src\stores\leaveBalancePolicy.ts d:\HR\tests\dbStorePayroll.test.ts
git commit -m "feat: integrate leave balances into payroll generation"
```

---

### Task 6: Add Employee Notification Center and Leave Balance Hints

**Files:**
- Create: `d:\HR\src\pages\employee\Notifications.tsx`
- Create: `d:\HR\tests\employeeNotificationsRoute.test.ts`
- Modify: `d:\HR\src\App.tsx`
- Modify: `d:\HR\src\pages\employee\EmployeeLayout.tsx`
- Modify: `d:\HR\src\pages\employee\Dashboard.tsx`
- Modify: `d:\HR\src\pages\employee\Requests.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`
- Test: `d:\HR\tests\employeeNotificationsRoute.test.ts`

- [ ] **Step 1: Write the failing test**

Create `d:\HR\tests\employeeNotificationsRoute.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_PATH = resolve(process.cwd(), "src", "App.tsx");
const LAYOUT_PATH = resolve(process.cwd(), "src", "pages", "employee", "EmployeeLayout.tsx");
const DASHBOARD_PATH = resolve(process.cwd(), "src", "pages", "employee", "Dashboard.tsx");
const REQUESTS_PATH = resolve(process.cwd(), "src", "pages", "employee", "Requests.tsx");

test("employee app wires notifications route and layout entry", () => {
  const appSource = readFileSync(APP_PATH, "utf8");
  const layoutSource = readFileSync(LAYOUT_PATH, "utf8");

  assert.match(appSource, /path="notifications"/);
  assert.match(layoutSource, /to: "\/app\/notifications"/);
  assert.match(layoutSource, /notifications\.filter/);
});

test("employee dashboard and requests page show unread and leave balance hints", () => {
  const dashboardSource = readFileSync(DASHBOARD_PATH, "utf8");
  const requestsSource = readFileSync(REQUESTS_PATH, "utf8");

  assert.match(dashboardSource, /notifications\.filter\(n => !n\.isRead\)/);
  assert.match(dashboardSource, /leaveBalances/);
  assert.match(requestsSource, /availablePaidLeaveDays/);
  assert.match(requestsSource, /expectedPaidDays/);
  assert.match(requestsSource, /expectedUnpaidDays/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test d:\HR\tests\employeeNotificationsRoute.test.ts
```

Expected: FAIL because employee notifications route and hints do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `d:\HR\src\pages\employee\Notifications.tsx`:

```tsx
import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import Button from "@/components/ui/Button";

export default function EmployeeNotifications() {
  const { userId } = useAuthStore();
  const db = useDbStore();

  const items = useMemo(
    () => db.notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)),
    [db.notifications, userId]
  );

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold text-zinc-100">消息中心</div>
        <Button onClick={() => db.markAllNotificationsRead(userId!)}>全部已读</Button>
      </div>
      <div className="mt-6 grid gap-3">
        {items.map(item => (
          <button
            key={item.id}
            className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 text-left"
            onClick={() => db.markNotificationRead(userId!, item.id)}
          >
            <div className="text-sm font-semibold text-zinc-100">{item.title}</div>
            <div className="mt-1 text-xs text-zinc-400">{item.body}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

Wire route in `d:\HR\src\App.tsx`:

```tsx
<Route path="notifications" element={<EmployeeNotifications />} />
```

Add layout entry in `d:\HR\src\pages\employee\EmployeeLayout.tsx`:

```tsx
const unreadCount = db.notifications.filter(n => n.userId === userId && !n.isRead).length;
{ to: "/app/notifications", label: t("employee.nav.notifications"), icon: Bell, badge: unreadCount > 0 ? String(unreadCount) : undefined }
```

In `d:\HR\src\pages\employee\Dashboard.tsx`:

```tsx
const unreadNotifications = db.notifications.filter(n => n.userId === userId && !n.isRead);
const currentLeaveBalance = db.leaveBalances.find(b => b.userId === userId && b.month === monthISO);
```

In `d:\HR\src\pages\employee\Requests.tsx`:

```tsx
const currentBalance = db.leaveBalances.find(b => b.userId === userId && b.month === monthISO);
const availablePaidLeaveDays = currentBalance?.closingBalanceDays ?? 0;
const leaveDays = Math.max(0, Math.round(((new Date(endISO).getTime() - new Date(startISO).getTime()) / 36e5) / 8 * 2) / 2);
const expectedPaidDays = Math.min(leaveDays, availablePaidLeaveDays);
const expectedUnpaidDays = Math.max(0, leaveDays - expectedPaidDays);
```

Add translation keys in `d:\HR\src\i18n\translations.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test d:\HR\tests\employeeNotificationsRoute.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\src\App.tsx d:\HR\src\pages\employee\Notifications.tsx d:\HR\src\pages\employee\EmployeeLayout.tsx d:\HR\src\pages\employee\Dashboard.tsx d:\HR\src\pages\employee\Requests.tsx d:\HR\src\i18n\translations.ts d:\HR\tests\employeeNotificationsRoute.test.ts
git commit -m "feat: add employee notifications and leave balance hints"
```

---

### Task 7: Add Admin Approval Settings UI and Approval Context

**Files:**
- Create: `d:\HR\src\pages\admin\ApprovalSettings.tsx`
- Create: `d:\HR\tests\adminApprovalSettingsRoute.test.ts`
- Modify: `d:\HR\src\App.tsx`
- Modify: `d:\HR\src\pages\admin\AdminLayout.tsx`
- Modify: `d:\HR\src\pages\admin\Approvals.tsx`
- Modify: `d:\HR\src\pages\admin\Employees.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`
- Test: `d:\HR\tests\adminApprovalSettingsRoute.test.ts`

- [ ] **Step 1: Write the failing test**

Create `d:\HR\tests\adminApprovalSettingsRoute.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_PATH = resolve(process.cwd(), "src", "App.tsx");
const LAYOUT_PATH = resolve(process.cwd(), "src", "pages", "admin", "AdminLayout.tsx");
const APPROVALS_PATH = resolve(process.cwd(), "src", "pages", "admin", "Approvals.tsx");
const EMPLOYEES_PATH = resolve(process.cwd(), "src", "pages", "admin", "Employees.tsx");

test("admin app wires approval settings route and nav entry", () => {
  const appSource = readFileSync(APP_PATH, "utf8");
  const layoutSource = readFileSync(LAYOUT_PATH, "utf8");

  assert.match(appSource, /path="approval-settings"/);
  assert.match(layoutSource, /to: "\/admin\/approval-settings"/);
});

test("approvals and employees pages show approval and leave balance context", () => {
  const approvalsSource = readFileSync(APPROVALS_PATH, "utf8");
  const employeesSource = readFileSync(EMPLOYEES_PATH, "utf8");

  assert.match(approvalsSource, /approvalSettings/);
  assert.match(approvalsSource, /approvalLogs/);
  assert.match(employeesSource, /leaveBalances/);
  assert.match(employeesSource, /closingBalanceDays/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test d:\HR\tests\adminApprovalSettingsRoute.test.ts
```

Expected: FAIL because approval settings route and UI do not exist.

- [ ] **Step 3: Write minimal implementation**

Create `d:\HR\src\pages\admin\ApprovalSettings.tsx`:

```tsx
import { useDbStore } from "@/stores/dbStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Select from "@/components/ui/Select";

export default function ApprovalSettings() {
  const db = useDbStore();
  const admins = db.users.filter(u => u.role === "admin" && u.status === "active");

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle>审批设置</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Select value={db.approvalSettings.leaveReviewerUserId ?? ""} onChange={e => db.updateApprovalSettings({ leaveReviewerUserId: e.target.value || null })}>
            <option value="">未配置</option>
            {admins.map(admin => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
          </Select>
          <Select value={db.approvalSettings.overtimeReviewerUserId ?? ""} onChange={e => db.updateApprovalSettings({ overtimeReviewerUserId: e.target.value || null })}>
            <option value="">未配置</option>
            {admins.map(admin => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
          </Select>
          <Select value={db.approvalSettings.attendanceReviewerUserId ?? ""} onChange={e => db.updateApprovalSettings({ attendanceReviewerUserId: e.target.value || null })}>
            <option value="">未配置</option>
            {admins.map(admin => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
```

Wire admin route in `d:\HR\src\App.tsx`:

```tsx
<Route path="approval-settings" element={<ApprovalSettings />} />
```

Add nav entry in `d:\HR\src\pages\admin\AdminLayout.tsx`:

```tsx
{ to: "/admin/approval-settings", label: t("admin.nav.approvalSettings"), icon: Settings2 }
```

Add review context to `d:\HR\src\pages\admin\Approvals.tsx`:

```tsx
const reviewerId = tab === "leave"
  ? db.approvalSettings.leaveReviewerUserId
  : tab === "overtime"
    ? db.approvalSettings.overtimeReviewerUserId
    : db.approvalSettings.attendanceReviewerUserId;
const recentLogs = db.approvalLogs.filter(log => log.requestType === tab).slice(-5).reverse();
```

Add leave balance summary to `d:\HR\src\pages\admin\Employees.tsx`:

```tsx
const currentLeaveBalance = db.leaveBalances.find(b => b.userId === u.id && b.month === monthISO);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test d:\HR\tests\adminApprovalSettingsRoute.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\src\App.tsx d:\HR\src\pages\admin\ApprovalSettings.tsx d:\HR\src\pages\admin\AdminLayout.tsx d:\HR\src\pages\admin\Approvals.tsx d:\HR\src\pages\admin\Employees.tsx d:\HR\src\i18n\translations.ts d:\HR\tests\adminApprovalSettingsRoute.test.ts
git commit -m "feat: add admin approval settings and approval context"
```

---

### Task 8: Wire Shared Store Actions and End-to-End Regression Coverage

**Files:**
- Modify: `d:\HR\src\stores\dbStore.ts`
- Modify: `d:\HR\tests\sharedServerApi.test.ts`
- Modify: `d:\HR\tests\authRefreshSharedSnapshot.test.ts`
- Modify: `d:\HR\tests\notificationCommands.test.ts`
- Modify: `d:\HR\tests\approvalSettingsFlow.test.ts`
- Test: `d:\HR\tests\sharedServerApi.test.ts`

- [ ] **Step 1: Write the failing test**

Add this source assertion to `d:\HR\tests\sharedServerApi.test.ts`:

```ts
test("db store wires notification and approval settings commands through shared api", () => {
  const source = readFileSync(resolve(process.cwd(), "src", "stores", "dbStore.ts"), "utf8");

  assert.match(source, /markNotificationRead: async/);
  assert.match(source, /markAllNotificationsRead: async/);
  assert.match(source, /updateApprovalSettings: async/);
  assert.match(source, /updateLeavePolicySettings: async/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test d:\HR\tests\sharedServerApi.test.ts
```

Expected: FAIL because the new store actions are not fully wired.

- [ ] **Step 3: Write minimal implementation**

Add these actions to `d:\HR\src\stores\dbStore.ts`:

```ts
updateApprovalSettings: async patch => {
  const snapshot = await runSharedCommand({ type: "updateApprovalSettings", payload: patch });
  set({ ...snapshot });
},
updateLeavePolicySettings: async patch => {
  const snapshot = await runSharedCommand({ type: "updateLeavePolicySettings", payload: patch });
  set({ ...snapshot });
},
markNotificationRead: async (userId, id) => {
  const snapshot = await runSharedCommand({ type: "markNotificationRead", payload: { userId, id } });
  set({ ...snapshot });
},
markAllNotificationsRead: async userId => {
  const snapshot = await runSharedCommand({ type: "markAllNotificationsRead", payload: { userId } });
  set({ ...snapshot });
},
```

Mirror them in the store interface at the top of the file.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test d:\HR\tests\sharedServerApi.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\src\stores\dbStore.ts d:\HR\tests\sharedServerApi.test.ts
git commit -m "feat: wire store actions for notifications and approval settings"
```

---

### Task 9: Full Regression, Build, and Release Packaging

**Files:**
- Modify: `d:\HR\发布版\hr-cloud.zip`
- Test: `d:\HR\tests\*.test.ts`

- [ ] **Step 1: Run focused feature tests**

Run:

```bash
npx tsx --test d:\HR\tests\leaveBalancePolicyFlow.test.ts d:\HR\tests\approvalSettingsFlow.test.ts d:\HR\tests\notificationCommands.test.ts d:\HR\tests\employeeNotificationsRoute.test.ts d:\HR\tests\adminApprovalSettingsRoute.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run full regression suite**

Run:

```bash
npx tsx --test (Get-ChildItem 'd:\HR\tests' -Filter '*.test.ts' | ForEach-Object { $_.FullName })
```

Expected: all PASS with no feature regressions in refresh, payroll, approvals, and shared server behavior.

- [ ] **Step 3: Build the portable release**

Run:

```bash
npm run package:portable
```

Expected: PASS and `dist/index.html` points at the latest JS hash.

- [ ] **Step 4: Rebuild the release zip**

Run:

```bash
if (Test-Path 'd:\HR\发布版\hr-cloud.zip') { Remove-Item 'd:\HR\发布版\hr-cloud.zip' -Force }
Compress-Archive -Path 'd:\HR\发布版\企业员工考勤系统_局域网共享版\*' -DestinationPath 'd:\HR\发布版\hr-cloud.zip'
```

Expected: zip file recreated successfully.

- [ ] **Step 5: Commit**

```bash
git add d:\HR\src d:\HR\scripts d:\HR\tests d:\HR\docs\superpowers\specs\2026-07-03-notification-leave-approval-upgrade-design.md d:\HR\docs\superpowers\plans\2026-07-03-notification-leave-approval-upgrade.md
git commit -m "feat: add notifications leave balances and approval settings"
```

---

## Self-Review

- Spec coverage:
  - 消息中心：Task 1, Task 4, Task 6
  - 假期余额与结转：Task 1, Task 2, Task 5
  - 审批人配置与审批日志：Task 1, Task 3, Task 7, Task 8
  - 工资联动：Task 5
  - 兼容和回归：Task 8, Task 9
- Placeholder scan:
  - No `TBD`, `TODO`, or “implement later” placeholders remain
  - Every task includes explicit files, code, commands, and expected outcomes
- Type consistency:
  - Consistent names used across plan: `notifications`, `leaveBalances`, `leavePolicySettings`, `approvalSettings`, `approvalLogs`
  - Consistent helper names used across plan: `allocateLeaveUsage`, `buildNextLeaveBalance`, `appendApprovalLog`, `appendNotification`
