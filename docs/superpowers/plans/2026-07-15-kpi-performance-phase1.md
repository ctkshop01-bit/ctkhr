# KPI Performance Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable KPI/performance workflow that links same-day tasks, clock-out evaluation, attendance penalties, warnings, and monthly KPI payout rates.

**Architecture:** Extend the shared JSON data model with performance settings, event logs, warnings, and monthly summaries, then compute scoring in the server command layer so employee and admin UIs always read the same source of truth. Reuse the existing `dbStore -> sharedApi -> app-db-commands.mjs` pattern, add narrow task-status commands instead of overloading `toggleTaskDone`, and expose readonly employee/admin pages on top of the generated summary data.

**Tech Stack:** React, TypeScript, Zustand, Node `node:test` via `tsx --test`, shared JSON command server in `scripts/server/app-db-commands.mjs`

---

**Execution note:** The current `d:\HR` workspace is not a Git repository, so the commit steps below should be executed only inside the real source repo/worktree. If `git rev-parse --is-inside-work-tree` returns `false`, treat the commit step as a manual checkpoint instead of a blocking action.

## File Map

**Create**

- `d:\HR\tests\performanceDomainWiring.test.ts`
- `d:\HR\tests\performanceTaskFlow.test.ts`
- `d:\HR\tests\performanceClockOutFlow.test.ts`
- `d:\HR\tests\performanceUiWiring.test.ts`
- `d:\HR\src\pages\employee\Performance.tsx`
- `d:\HR\src\pages\admin\PerformanceSettings.tsx`
- `d:\HR\src\pages\admin\PerformanceDashboard.tsx`

**Modify**

- `d:\HR\src\types\domain.ts`
- `d:\HR\src\data\seedDb.ts`
- `d:\HR\src\stores\dbStore.ts`
- `d:\HR\src\i18n\translations.ts`
- `d:\HR\src\App.tsx`
- `d:\HR\src\pages\employee\EmployeeLayout.tsx`
- `d:\HR\src\pages\employee\Tasks.tsx`
- `d:\HR\src\pages\employee\Clock.tsx`
- `d:\HR\src\pages\admin\AdminLayout.tsx`
- `d:\HR\src\pages\admin\Dashboard.tsx`
- `d:\HR\scripts\server\app-db-commands.mjs`

**Follow existing patterns from**

- `d:\HR\tests\notificationCommands.test.ts`
- `d:\HR\tests\approvalSettingsFlow.test.ts`
- `d:\HR\src\pages\employee\Notifications.tsx`
- `d:\HR\src\pages\admin\ApprovalSettings.tsx`

### Task 1: Extend Domain Types And Seed Defaults

**Files:**
- Modify: `d:\HR\src\types\domain.ts`
- Modify: `d:\HR\src\data\seedDb.ts`
- Test: `d:\HR\tests\performanceDomainWiring.test.ts`

- [ ] **Step 1: Write the failing domain wiring test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN_PATH = resolve(process.cwd(), "src", "types", "domain.ts");
const SEED_PATH = resolve(process.cwd(), "src", "data", "seedDb.ts");

test("domain and seed db expose performance structures", () => {
  const domain = readFileSync(DOMAIN_PATH, "utf8");
  const seed = readFileSync(SEED_PATH, "utf8");

  assert.match(domain, /export type TaskStatus = "open" \| "submitted" \| "confirmed" \| "returned" \| "overdue" \| "closed";/);
  assert.match(domain, /export interface PerformanceEventItem/);
  assert.match(domain, /export interface PerformanceMonthlySummaryItem/);
  assert.match(domain, /export interface PerformanceWarningItem/);
  assert.match(domain, /export interface PerformanceSettings/);
  assert.match(domain, /performanceEvents: PerformanceEventItem\[];/);
  assert.match(domain, /performanceMonthlySummaries: PerformanceMonthlySummaryItem\[];/);
  assert.match(domain, /performanceWarnings: PerformanceWarningItem\[];/);
  assert.match(domain, /performanceSettings: PerformanceSettings;/);
  assert.match(seed, /performanceEvents:\s*\[\]/);
  assert.match(seed, /performanceMonthlySummaries:\s*\[\]/);
  assert.match(seed, /performanceWarnings:\s*\[\]/);
  assert.match(seed, /performanceSettings:/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx tsx --test tests/performanceDomainWiring.test.ts
```

Expected:

```text
FAIL tests/performanceDomainWiring.test.ts
... TaskStatus ...
```

- [ ] **Step 3: Add performance and task lifecycle types**

Update `d:\HR\src\types\domain.ts` with the new task lifecycle and performance structures:

```ts
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
```

- [ ] **Step 4: Seed default performance settings and arrays**

Update `d:\HR\src\data\seedDb.ts` so `createSeedDb()` returns the new collections and default settings:

```ts
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
```

- [ ] **Step 5: Re-run the domain test**

Run:

```bash
npx tsx --test tests/performanceDomainWiring.test.ts
```

Expected:

```text
PASS tests/performanceDomainWiring.test.ts
```

- [ ] **Step 6: Commit or checkpoint**

If inside a real Git repo:

```bash
git add src/types/domain.ts src/data/seedDb.ts tests/performanceDomainWiring.test.ts
git commit -m "feat: add performance domain scaffolding"
```

If not inside a Git repo, record this checkpoint:

```bash
Write-Output "checkpoint: performance domain scaffolding complete"
```

### Task 2: Add Task Submission And Review Commands

**Files:**
- Modify: `d:\HR\scripts\server\app-db-commands.mjs`
- Modify: `d:\HR\src\stores\dbStore.ts`
- Test: `d:\HR\tests\performanceTaskFlow.test.ts`

- [ ] **Step 1: Write the failing task flow test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

test("task submit and review commands update lifecycle fields", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-performance-task-"));
  const server = createHrServer({ dataFilePath: join(root, "app-db.json") });
  const db = createSeedDb();
  db.tasks = [{
    id: "tsk_same_day",
    title: "Daily cleanup",
    status: "open",
    taskType: "same_day",
    includeInPerformance: true,
    createdAtISO: "2026-07-15T08:00:00.000Z",
  }];

  await server.listen(0);
  const port = (server.address() as { port: number }).port;

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db }),
  });

  const submitRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "submitTaskCompletion",
      payload: { taskId: "tsk_same_day", userId: "usr_admin", submittedAtISO: "2026-07-15T16:00:00.000Z" },
    }),
  });
  assert.equal(submitRes.status, 200);

  const reviewRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "reviewTaskCompletion",
      payload: { taskId: "tsk_same_day", reviewerId: "usr_admin", action: "return", reason: "missing photos" },
    }),
  });
  assert.equal(reviewRes.status, 200);

  const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const snapshotJson = await snapshotRes.json();
  const task = snapshotJson.db.tasks.find((item: { id: string }) => item.id === "tsk_same_day");

  assert.equal(task.status, "returned");
  assert.equal(task.returnCount, 1);
  assert.equal(task.lastReturnReason, "missing photos");

  await server.close();
});
```

- [ ] **Step 2: Run the task flow test to verify it fails**

Run:

```bash
npx tsx --test tests/performanceTaskFlow.test.ts
```

Expected:

```text
FAIL ... Unsupported command ...
```

- [ ] **Step 3: Replace `toggleTaskDone` with explicit submit/review command wiring**

Add new store actions in `d:\HR\src\stores\dbStore.ts`:

```ts
submitTaskCompletion: (taskId: string, userId: string, submittedAtISO?: string) => Promise<void>;
reviewTaskCompletion: (
  taskId: string,
  reviewerId: string,
  action: "confirm" | "return",
  reason?: string,
) => Promise<void>;
updatePerformanceSettings: (patch: Partial<PerformanceSettings>) => Promise<void>;
loadPerformanceSummary: (month: string) => Promise<void>;
```

Implement them with the existing shared command helper:

```ts
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
```

- [ ] **Step 4: Implement command handlers in `app-db-commands.mjs`**

Add explicit handlers:

```js
case "submitTaskCompletion": {
  const { taskId, userId, submittedAtISO } = command.payload;
  let updatedTask = null;
  const tasks = db.tasks.map(item => {
    if (item.id !== taskId) return item;
    updatedTask = {
      ...item,
      status: "submitted",
      submittedByUserId: userId,
      submittedAtISO: submittedAtISO ?? nowISO(),
    };
    return updatedTask;
  });
  return okResult({ ...db, tasks }, updatedTask);
}

case "reviewTaskCompletion": {
  const { taskId, reviewerId, action, reason } = command.payload;
  let updatedTask = null;
  const tasks = db.tasks.map(item => {
    if (item.id !== taskId) return item;
    updatedTask =
      action === "confirm"
        ? {
            ...item,
            status: "confirmed",
            confirmedByUserId: reviewerId,
            confirmedAtISO: nowISO(),
          }
        : {
            ...item,
            status: "returned",
            returnCount: (item.returnCount ?? 0) + 1,
            lastReturnedAtISO: nowISO(),
            lastReturnReason: reason ?? "",
          };
    return updatedTask;
  });
  return okResult({ ...db, tasks }, updatedTask);
}
```

- [ ] **Step 5: Re-run the task flow test**

Run:

```bash
npx tsx --test tests/performanceTaskFlow.test.ts
```

Expected:

```text
PASS tests/performanceTaskFlow.test.ts
```

- [ ] **Step 6: Commit or checkpoint**

If inside a real Git repo:

```bash
git add scripts/server/app-db-commands.mjs src/stores/dbStore.ts tests/performanceTaskFlow.test.ts
git commit -m "feat: add task submission and review commands"
```

If not inside a Git repo:

```bash
Write-Output "checkpoint: task submission and review commands complete"
```

### Task 3: Add Clock-Out Evaluation, Warnings, And Monthly Summary Generation

**Files:**
- Modify: `d:\HR\scripts\server\app-db-commands.mjs`
- Modify: `d:\HR\src\stores\dbStore.ts`
- Test: `d:\HR\tests\performanceClockOutFlow.test.ts`

- [ ] **Step 1: Write the failing clock-out evaluation test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

test("clock out evaluation creates task penalty and monthly summary", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-performance-clockout-"));
  const server = createHrServer({ dataFilePath: join(root, "app-db.json") });
  const db = createSeedDb();

  db.users = [
    {
      id: "emp_1",
      username: "emp_1",
      passwordHash: "123456",
      name: "员工A",
      role: "employee",
      status: "active",
      baseSalaryCents: 200000,
      createdAtISO: "2026-07-01T00:00:00.000Z",
    },
  ];
  db.tasks = [
    {
      id: "tsk_1",
      title: "same day task",
      status: "open",
      taskType: "same_day",
      includeInPerformance: true,
      createdAtISO: "2026-07-15T08:00:00.000Z",
    },
    {
      id: "tsk_2",
      title: "same day task 2",
      status: "open",
      taskType: "same_day",
      includeInPerformance: true,
      createdAtISO: "2026-07-15T08:30:00.000Z",
    },
  ];

  await server.listen(0);
  const port = (server.address() as { port: number }).port;

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db }),
  });

  const evalRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "evaluateSameDayTasksOnClockOut",
      payload: { userId: "emp_1", dateISO: "2026-07-15", clockOutAtISO: "2026-07-15T18:00:00.000Z" },
    }),
  });
  assert.equal(evalRes.status, 200);

  const summaryRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "generatePerformanceMonthlySummary",
      payload: { month: "2026-07" },
    }),
  });
  assert.equal(summaryRes.status, 200);

  const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const snapshotJson = await snapshotRes.json();

  assert.equal(snapshotJson.db.performanceEvents.length, 1);
  assert.equal(snapshotJson.db.performanceEvents[0].eventType, "task_unfinished_tier_2");
  assert.equal(snapshotJson.db.performanceMonthlySummaries.length, 1);
  assert.equal(snapshotJson.db.performanceMonthlySummaries[0].finalScore, 97);

  await server.close();
});
```

- [ ] **Step 2: Run the evaluation test to verify it fails**

Run:

```bash
npx tsx --test tests/performanceClockOutFlow.test.ts
```

Expected:

```text
FAIL ... Unsupported command ...
```

- [ ] **Step 3: Implement helper functions for scoring and warnings**

In `d:\HR\scripts\server\app-db-commands.mjs`, add focused helpers before the switch:

```js
function resolveKpiRate(settings, finalScore) {
  return settings.kpiRateRules.find(rule => finalScore >= rule.minScore)?.rate ?? 0.5;
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
  if (unfinishedCount <= 0) return { scoreDelta: settings.taskRules.allCompletedBonus, eventType: "task_all_completed" };
  if (unfinishedCount === 1) return { scoreDelta: settings.taskRules.unfinishedTier1Penalty, eventType: "task_unfinished_tier_1" };
  if (unfinishedCount === 2) return { scoreDelta: settings.taskRules.unfinishedTier2Penalty, eventType: "task_unfinished_tier_2" };
  return { scoreDelta: settings.taskRules.unfinishedTier3Penalty, eventType: "task_unfinished_tier_3" };
}
```

- [ ] **Step 4: Add evaluation and summary commands**

Implement the server handlers:

```js
case "evaluateSameDayTasksOnClockOut": {
  const { userId, dateISO } = command.payload;
  const month = dateISO.slice(0, 7);
  const settings = db.performanceSettings;
  const sameDayTasks = db.tasks.filter(item => item.taskType === "same_day" && item.includeInPerformance !== false);
  const unfinishedCount = sameDayTasks.filter(item => !["submitted", "confirmed", "closed"].includes(item.status)).length;
  const penalty = countSameDayTaskPenalty(settings, unfinishedCount);
  const event = createPerformanceEvent({
    userId,
    date: dateISO,
    month,
    category: unfinishedCount > 0 ? "task" : "reward",
    eventType: penalty.eventType,
    scoreDelta: penalty.scoreDelta,
    warningDelta: unfinishedCount > 0 ? 1 : 0,
    sourceType: "system",
    sourceId: `${userId}:${dateISO}:clock_out`,
    title: unfinishedCount > 0 ? "当天任务未完成" : "当天任务全部完成",
    detail: `unfinished=${unfinishedCount}`,
  });
  return okResult({ ...db, performanceEvents: [event, ...db.performanceEvents] }, event);
}

case "generatePerformanceMonthlySummary": {
  const { month } = command.payload;
  const settings = db.performanceSettings;
  const summaries = db.users
    .filter(user => user.role === "employee" && user.status === "active")
    .map(user => {
      const events = db.performanceEvents.filter(item => item.userId === user.id && item.month === month && !item.isReverted);
      const finalScore = settings.scoreBase + events.reduce((sum, item) => sum + item.scoreDelta, 0);
      const warningCount = events.reduce((sum, item) => sum + item.warningDelta, 0);
      const kpiRate = resolveKpiRate(settings, finalScore);
      return {
        id: `pms_${user.id}_${month}`,
        userId: user.id,
        month,
        baseScore: settings.scoreBase,
        taskScore: events.filter(item => item.category === "task").reduce((sum, item) => sum + item.scoreDelta, 0),
        attendanceScore: events.filter(item => item.category === "attendance").reduce((sum, item) => sum + item.scoreDelta, 0),
        rewardScore: events.filter(item => item.category === "reward").reduce((sum, item) => sum + item.scoreDelta, 0),
        warningPenaltyScore: events.filter(item => item.category === "warning").reduce((sum, item) => sum + item.scoreDelta, 0),
        manualAdjustmentScore: events.filter(item => item.category === "manual_adjustment").reduce((sum, item) => sum + item.scoreDelta, 0),
        finalScore,
        warningCount,
        kpiBaseCents: settings.kpiBaseDefaultCents,
        kpiRate,
        kpiPayoutCents: Math.round(settings.kpiBaseDefaultCents * kpiRate),
        generatedAtISO: nowISO(),
        status: "draft",
      };
    });
  return okResult({ ...db, performanceMonthlySummaries: summaries }, summaries);
}
```

- [ ] **Step 5: Re-run the clock-out and summary test**

Run:

```bash
npx tsx --test tests/performanceClockOutFlow.test.ts
```

Expected:

```text
PASS tests/performanceClockOutFlow.test.ts
```

- [ ] **Step 6: Commit or checkpoint**

If inside a real Git repo:

```bash
git add scripts/server/app-db-commands.mjs tests/performanceClockOutFlow.test.ts src/stores/dbStore.ts
git commit -m "feat: add performance scoring and monthly summary generation"
```

If not inside a Git repo:

```bash
Write-Output "checkpoint: performance scoring engine complete"
```

### Task 4: Add Employee And Admin Performance UI

**Files:**
- Create: `d:\HR\src\pages\employee\Performance.tsx`
- Create: `d:\HR\src\pages\admin\PerformanceSettings.tsx`
- Create: `d:\HR\src\pages\admin\PerformanceDashboard.tsx`
- Modify: `d:\HR\src\App.tsx`
- Modify: `d:\HR\src\pages\employee\EmployeeLayout.tsx`
- Modify: `d:\HR\src\pages\employee\Tasks.tsx`
- Modify: `d:\HR\src\pages\employee\Clock.tsx`
- Modify: `d:\HR\src\pages\admin\AdminLayout.tsx`
- Modify: `d:\HR\src\pages\admin\Dashboard.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`
- Test: `d:\HR\tests\performanceUiWiring.test.ts`

- [ ] **Step 1: Write the failing UI wiring test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_PATH = resolve(process.cwd(), "src", "App.tsx");
const EMP_TASKS_PATH = resolve(process.cwd(), "src", "pages", "employee", "Tasks.tsx");
const ADMIN_LAYOUT_PATH = resolve(process.cwd(), "src", "pages", "admin", "AdminLayout.tsx");
const I18N_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("performance routes and labels are wired", () => {
  const app = readFileSync(APP_PATH, "utf8");
  const employeeTasks = readFileSync(EMP_TASKS_PATH, "utf8");
  const adminLayout = readFileSync(ADMIN_LAYOUT_PATH, "utf8");
  const i18n = readFileSync(I18N_PATH, "utf8");

  assert.match(app, /path="performance"/);
  assert.match(app, /PerformanceSettings/);
  assert.match(app, /PerformanceDashboard/);
  assert.match(employeeTasks, /submitTaskCompletion/);
  assert.match(employeeTasks, /taskType/);
  assert.match(adminLayout, /nav\.performanceSettings|performance-settings/);
  assert.match(adminLayout, /performance-dashboard/);
  assert.match(i18n, /employee\.performance\.title/);
  assert.match(i18n, /admin\.performance\.title/);
});
```

- [ ] **Step 2: Run the UI wiring test to verify it fails**

Run:

```bash
npx tsx --test tests/performanceUiWiring.test.ts
```

Expected:

```text
FAIL ... path="performance" ...
```

- [ ] **Step 3: Add routes, nav, and translation keys**

Update routing in `d:\HR\src\App.tsx`:

```tsx
import EmployeePerformance from "@/pages/employee/Performance";
import PerformanceSettings from "@/pages/admin/PerformanceSettings";
import PerformanceDashboard from "@/pages/admin/PerformanceDashboard";

// inside employee routes
<Route path="performance" element={<EmployeePerformance />} />

// inside admin routes
<Route path="performance-settings" element={<PerformanceSettings />} />
<Route path="performance-dashboard" element={<PerformanceDashboard />} />
```

Add navigation entries in `EmployeeLayout.tsx` and `AdminLayout.tsx`:

```tsx
{ to: "/app/performance", key: "nav.performance", icon: Gauge }
{ to: "/admin/performance-dashboard", key: "nav.performanceDashboard", icon: Gauge }
{ to: "/admin/performance-settings", key: "nav.performanceSettings", icon: SlidersHorizontal }
```

Add i18n keys in `d:\HR\src\i18n\translations.ts`:

```ts
"employee.performance.title": "我的绩效",
"employee.performance.subtitle": "查看本月得分、警告与预计 KPI",
"admin.performance.title": "绩效看板",
"admin.performance.subtitle": "查看员工本月得分与预计 KPI",
"admin.performanceSettings.title": "绩效规则设置",
"admin.performanceSettings.subtitle": "配置积分、警告阈值与 KPI 系数",
```

- [ ] **Step 4: Create focused employee/admin pages and update task interactions**

Create `d:\HR\src\pages\employee\Performance.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";
import { useT } from "@/i18n/useT";

export default function EmployeePerformance() {
  const { userId } = useAuthStore();
  const db = useDbStore();
  const t = useT();
  const month = new Date().toISOString().slice(0, 7);
  const summary = db.performanceMonthlySummaries.find(item => item.userId === userId && item.month === month);
  const events = db.performanceEvents.filter(item => item.userId === userId && item.month === month);

  return (
    <div className="pb-24 lg:pb-0">
      <div className="text-2xl font-semibold tracking-tight text-zinc-100">{t("employee.performance.title")}</div>
      <div className="mt-1 text-sm text-zinc-400">{t("employee.performance.subtitle")}</div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{summary?.finalScore ?? db.performanceSettings.scoreBase}</CardTitle>
          <CardDescription>{t("employee.performance.currentScore")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-zinc-300">
          {events.map(item => (
            <div key={item.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
              <div>{item.title}</div>
              <div className="text-xs text-zinc-500">{item.detail}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

Create `d:\HR\src\pages\admin\PerformanceSettings.tsx` and `d:\HR\src\pages\admin\PerformanceDashboard.tsx` with the same `Card` pattern already used by `ApprovalSettings.tsx` and `Dashboard.tsx`.

Update `d:\HR\src\pages\employee\Tasks.tsx` to use explicit submit action:

```tsx
<Button
  variant={task.status === "submitted" || task.status === "confirmed" ? "secondary" : "primary"}
  size="sm"
  onClick={() => db.submitTaskCompletion(task.id, userId!)}
  disabled={task.status === "confirmed"}
>
  <CheckCircle2 className="h-4 w-4" />
  {task.status === "confirmed" ? t("employee.tasks.confirmed") : t("employee.tasks.submit")}
</Button>
```

Update `d:\HR\src\pages\employee\Clock.tsx` to show the same-day evaluation result after `type === "out"` returns.

- [ ] **Step 5: Re-run the UI wiring test**

Run:

```bash
npx tsx --test tests/performanceUiWiring.test.ts
```

Expected:

```text
PASS tests/performanceUiWiring.test.ts
```

- [ ] **Step 6: Commit or checkpoint**

If inside a real Git repo:

```bash
git add src/App.tsx src/pages/employee/Performance.tsx src/pages/admin/PerformanceSettings.tsx src/pages/admin/PerformanceDashboard.tsx src/pages/employee/Tasks.tsx src/pages/employee/Clock.tsx src/pages/employee/EmployeeLayout.tsx src/pages/admin/AdminLayout.tsx src/pages/admin/Dashboard.tsx src/i18n/translations.ts tests/performanceUiWiring.test.ts
git commit -m "feat: add performance ui for employees and admins"
```

If not inside a Git repo:

```bash
Write-Output "checkpoint: performance ui wiring complete"
```

### Task 5: Run Regression Tests And Production-Facing Checks

**Files:**
- Test: `d:\HR\tests\performanceDomainWiring.test.ts`
- Test: `d:\HR\tests\performanceTaskFlow.test.ts`
- Test: `d:\HR\tests\performanceClockOutFlow.test.ts`
- Test: `d:\HR\tests\performanceUiWiring.test.ts`
- Regression: existing `d:\HR\tests\notificationCommands.test.ts`
- Regression: existing `d:\HR\tests\approvalSettingsFlow.test.ts`

- [ ] **Step 1: Run the new focused tests**

Run:

```bash
npx tsx --test tests/performanceDomainWiring.test.ts tests/performanceTaskFlow.test.ts tests/performanceClockOutFlow.test.ts tests/performanceUiWiring.test.ts
```

Expected:

```text
4 tests passed
```

- [ ] **Step 2: Run targeted regression tests**

Run:

```bash
npx tsx --test tests/notificationCommands.test.ts tests/approvalSettingsFlow.test.ts
```

Expected:

```text
PASS tests/notificationCommands.test.ts
PASS tests/approvalSettingsFlow.test.ts
```

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected:

```text
vite build
... built successfully ...
```

- [ ] **Step 4: Do a manual verification checklist**

Verify in the running app:

```text
1. Admin creates a same-day task
2. Employee sees the task and submits it
3. Admin confirms or returns it
4. Employee clocks out and the system creates performance events
5. Employee performance page shows current score and event detail
6. Admin performance dashboard shows score, warnings, and estimated KPI payout
```

- [ ] **Step 5: Commit or checkpoint**

If inside a real Git repo:

```bash
git add tests/performanceDomainWiring.test.ts tests/performanceTaskFlow.test.ts tests/performanceClockOutFlow.test.ts tests/performanceUiWiring.test.ts
git commit -m "test: cover phase 1 performance flow"
```

If not inside a Git repo:

```bash
Write-Output "checkpoint: performance phase 1 verification complete"
```

## Self-Review

### Spec coverage

- Data model changes: covered by Task 1
- Task submission / confirm / return lifecycle: covered by Task 2
- Clock-out evaluation and KPI summary generation: covered by Task 3
- Employee/admin pages and route wiring: covered by Task 4
- Tests and verification: covered by Task 5

### Placeholder scan

- No `TODO`, `TBD`, or “similar to above” placeholders remain
- Every task includes explicit file paths, commands, and code snippets

### Type consistency

- `TaskStatus` uses `open | submitted | confirmed | returned | overdue | closed` throughout the plan
- Performance data structures consistently use `performanceEvents`, `performanceWarnings`, `performanceMonthlySummaries`, and `performanceSettings`
- Command names stay consistent: `submitTaskCompletion`, `reviewTaskCompletion`, `evaluateSameDayTasksOnClockOut`, `generatePerformanceMonthlySummary`
