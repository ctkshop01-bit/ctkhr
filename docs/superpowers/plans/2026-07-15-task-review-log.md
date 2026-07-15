# Task Review Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add task review history logging so task submit/confirm/return actions persist auditable records and surface them in admin approvals plus employee task status.

**Architecture:** Extend the shared JSON schema with a dedicated `taskReviewLogs` collection, then write logs inside the existing `submitTaskCompletion` and `reviewTaskCompletion` command handlers so task state changes and history stay in sync. Reuse the current `dbStore -> sharedApi -> app-db-commands.mjs` pattern, keep employee UI lightweight by showing only the latest review outcome, and expose the full timeline only in the admin task approval dialog.

**Tech Stack:** React, TypeScript, Zustand, Node `node:test` via `tsx --test`, shared JSON command server in `scripts/server/app-db-commands.mjs`

---

**Execution note:** The current `d:\HR` workspace is not a Git repository, so the commit steps below should be executed only inside the real source repo/worktree. If `git rev-parse --is-inside-work-tree` returns `false`, treat the commit step as a manual checkpoint instead of a blocking action.

## File Map

**Create**

- `d:\HR\tests\taskReviewLogDomainWiring.test.ts`
- `d:\HR\tests\taskReviewLogCommands.test.ts`
- `d:\HR\tests\taskReviewLogUiWiring.test.ts`

**Modify**

- `d:\HR\src\types\domain.ts`
- `d:\HR\src\data\seedDb.ts`
- `d:\HR\scripts\server\app-db-commands.mjs`
- `d:\HR\src\pages\admin\Approvals.tsx`
- `d:\HR\src\pages\employee\Tasks.tsx`
- `d:\HR\src\i18n\translations.ts`

**Follow existing patterns from**

- `d:\HR\tests\performanceTaskFlow.test.ts`
- `d:\HR\tests\sharedServerApi.test.ts`
- `d:\HR\src\pages\admin\Approvals.tsx`
- `d:\HR\src\pages\employee\Tasks.tsx`

### Task 1: Add Task Review Log Domain Types And Seed Defaults

**Files:**
- Create: `d:\HR\tests\taskReviewLogDomainWiring.test.ts`
- Modify: `d:\HR\src\types\domain.ts`
- Modify: `d:\HR\src\data\seedDb.ts`

- [ ] **Step 1: Write the failing domain wiring test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN_PATH = resolve(process.cwd(), "src", "types", "domain.ts");
const SEED_PATH = resolve(process.cwd(), "src", "data", "seedDb.ts");

test("task review log types and seed defaults are wired", () => {
  const domain = readFileSync(DOMAIN_PATH, "utf8");
  const seed = readFileSync(SEED_PATH, "utf8");

  assert.match(domain, /export interface TaskReviewLogItem/);
  assert.match(domain, /action:\s*"submit" \| "confirm" \| "return";/);
  assert.match(domain, /taskReviewLogs: TaskReviewLogItem\[];/);
  assert.match(seed, /taskReviewLogs:\s*\[\]/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx tsx --test tests/taskReviewLogDomainWiring.test.ts
```

Expected:

```text
FAIL tests/taskReviewLogDomainWiring.test.ts
... TaskReviewLogItem ...
```

- [ ] **Step 3: Add the task review log type to `domain.ts`**

Insert this interface after `ApprovalLogItem` in `d:\HR\src\types\domain.ts`:

```ts
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
```

Then add the collection to `AppDb` near `approvalLogs` and the existing performance arrays:

```ts
  approvalLogs: ApprovalLogItem[];
  taskReviewLogs: TaskReviewLogItem[];
  performanceEvents: PerformanceEventItem[];
```

- [ ] **Step 4: Seed the new collection in `seedDb.ts`**

Add the new empty array next to `approvalLogs`:

```ts
    approvalLogs: [],
    taskReviewLogs: [],
    performanceEvents: [],
```

- [ ] **Step 5: Re-run the domain wiring test**

Run:

```bash
npx tsx --test tests/taskReviewLogDomainWiring.test.ts
```

Expected:

```text
PASS tests/taskReviewLogDomainWiring.test.ts
```

- [ ] **Step 6: Commit or checkpoint**

If inside a real Git repo:

```bash
git add src/types/domain.ts src/data/seedDb.ts tests/taskReviewLogDomainWiring.test.ts
git commit -m "feat: add task review log domain types"
```

If not inside a Git repo:

```bash
Write-Output "checkpoint: task review log domain complete"
```

### Task 2: Persist Task Review Logs In Shared Commands

**Files:**
- Create: `d:\HR\tests\taskReviewLogCommands.test.ts`
- Modify: `d:\HR\scripts\server\app-db-commands.mjs`

- [ ] **Step 1: Write the failing command flow test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

test("task submit and review commands append task review logs", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-task-review-log-"));
  const server = createHrServer({ dataFilePath: join(root, "app-db.json") });
  const db = createSeedDb();

  db.users = [
    {
      id: "adm_1",
      username: "admin",
      passwordHash: "123456",
      name: "Admin",
      role: "admin",
      status: "active",
      baseSalaryCents: 0,
      createdAtISO: "2026-07-15T08:00:00.000Z",
    },
    {
      id: "emp_1",
      username: "emp_1",
      passwordHash: "123456",
      name: "员工A",
      role: "employee",
      status: "active",
      baseSalaryCents: 100000,
      createdAtISO: "2026-07-15T08:00:00.000Z",
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
  ];

  await server.listen(0);
  const port = server.address().port;

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db }),
  });

  await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "submitTaskCompletion",
      payload: { taskId: "tsk_1", userId: "emp_1", submittedAtISO: "2026-07-15T16:00:00.000Z" },
    }),
  });

  await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "reviewTaskCompletion",
      payload: { taskId: "tsk_1", reviewerId: "adm_1", action: "return", reason: "missing photos" },
    }),
  });

  const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const snapshotJson = await snapshotRes.json();

  assert.equal(snapshotJson.db.taskReviewLogs.length, 2);
  assert.equal(snapshotJson.db.taskReviewLogs[0].action, "return");
  assert.equal(snapshotJson.db.taskReviewLogs[0].fromStatus, "submitted");
  assert.equal(snapshotJson.db.taskReviewLogs[0].toStatus, "returned");
  assert.equal(snapshotJson.db.taskReviewLogs[0].reason, "missing photos");
  assert.equal(snapshotJson.db.taskReviewLogs[1].action, "submit");
  assert.equal(snapshotJson.db.taskReviewLogs[1].fromStatus, "open");
  assert.equal(snapshotJson.db.taskReviewLogs[1].toStatus, "submitted");

  await server.close();
});
```

- [ ] **Step 2: Run the command flow test to verify it fails**

Run:

```bash
npx tsx --test tests/taskReviewLogCommands.test.ts
```

Expected:

```text
FAIL tests/taskReviewLogCommands.test.ts
... taskReviewLogs ...
```

- [ ] **Step 3: Add a focused helper for task review log creation**

Insert this helper near `appendApprovalLog()` in `d:\HR\scripts\server\app-db-commands.mjs`:

```js
function appendTaskReviewLog(db, log) {
  const taskReviewLogs = db.taskReviewLogs ?? [];
  taskReviewLogs.unshift({
    id: createId("trl"),
    createdAtISO: nowISO(),
    ...log,
  });
  db.taskReviewLogs = taskReviewLogs;
}
```

- [ ] **Step 4: Update `submitTaskCompletion` to write `submit` logs**

Replace the current `submitTaskCompletion` handler body with this version:

```js
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
```

- [ ] **Step 5: Update `reviewTaskCompletion` to write `confirm` and `return` logs**

Replace the current `reviewTaskCompletion` handler body with this version:

```js
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
```

- [ ] **Step 6: Re-run the command flow test**

Run:

```bash
npx tsx --test tests/taskReviewLogCommands.test.ts
```

Expected:

```text
PASS tests/taskReviewLogCommands.test.ts
```

- [ ] **Step 7: Commit or checkpoint**

If inside a real Git repo:

```bash
git add scripts/server/app-db-commands.mjs tests/taskReviewLogCommands.test.ts
git commit -m "feat: persist task review logs in shared commands"
```

If not inside a Git repo:

```bash
Write-Output "checkpoint: task review log commands complete"
```

### Task 3: Show Task Review History In Admin And Latest Result In Employee UI

**Files:**
- Create: `d:\HR\tests\taskReviewLogUiWiring.test.ts`
- Modify: `d:\HR\src\pages\admin\Approvals.tsx`
- Modify: `d:\HR\src\pages\employee\Tasks.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`

- [ ] **Step 1: Write the failing UI wiring test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ADMIN_APPROVALS_PATH = resolve(process.cwd(), "src", "pages", "admin", "Approvals.tsx");
const EMP_TASKS_PATH = resolve(process.cwd(), "src", "pages", "employee", "Tasks.tsx");
const I18N_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("task review log ui is wired for admin and employee pages", () => {
  const adminApprovals = readFileSync(ADMIN_APPROVALS_PATH, "utf8");
  const employeeTasks = readFileSync(EMP_TASKS_PATH, "utf8");
  const i18n = readFileSync(I18N_PATH, "utf8");

  assert.match(adminApprovals, /taskReviewLogs/);
  assert.match(adminApprovals, /admin\.approvals\.taskReviewHistory/);
  assert.match(adminApprovals, /admin\.approvals\.taskReviewEmpty/);
  assert.match(employeeTasks, /taskReviewLogs/);
  assert.match(employeeTasks, /employee\.tasks\.latestReview/);
  assert.match(employeeTasks, /employee\.tasks\.latestReviewedAt/);
  assert.match(i18n, /admin\.approvals\.taskReviewHistory/);
  assert.match(i18n, /admin\.approvals\.taskReviewEmpty/);
  assert.match(i18n, /employee\.tasks\.latestReview/);
});
```

- [ ] **Step 2: Run the UI wiring test to verify it fails**

Run:

```bash
npx tsx --test tests/taskReviewLogUiWiring.test.ts
```

Expected:

```text
FAIL tests/taskReviewLogUiWiring.test.ts
... taskReviewHistory ...
```

- [ ] **Step 3: Add translation keys**

Append these keys to both language maps in `d:\HR\src\i18n\translations.ts`:

```ts
"admin.approvals.taskReviewHistory": "审核记录",
"admin.approvals.taskReviewEmpty": "暂无任务审核记录",
"admin.approvals.taskReviewActionSubmit": "已提交",
"admin.approvals.taskReviewActionConfirm": "已通过",
"admin.approvals.taskReviewActionReturn": "已退回",
"employee.tasks.latestReview": "最近处理结果",
"employee.tasks.latestReviewedAt": "最近处理时间",
```

Thai values can stay semantically direct:

```ts
"admin.approvals.taskReviewHistory": "ประวัติการตรวจงาน",
"admin.approvals.taskReviewEmpty": "ยังไม่มีประวัติการตรวจงาน",
"admin.approvals.taskReviewActionSubmit": "ส่งแล้ว",
"admin.approvals.taskReviewActionConfirm": "อนุมัติแล้ว",
"admin.approvals.taskReviewActionReturn": "ส่งกลับแล้ว",
"employee.tasks.latestReview": "ผลการตรวจล่าสุด",
"employee.tasks.latestReviewedAt": "เวลาตรวจล่าสุด",
```

- [ ] **Step 4: Show full review history in the admin task approval dialog**

Add a memoized list near `openTask` in `d:\HR\src\pages\admin\Approvals.tsx`:

```tsx
  const openTaskReviewLogs = useMemo(
    () =>
      target?.type === "task"
        ? (db.taskReviewLogs ?? [])
            .filter(log => log.taskId === target.id)
            .slice()
            .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
        : [],
    [db.taskReviewLogs, target],
  );
```

Then insert this block inside the task dialog content, before the review note textarea:

```tsx
            <div className="grid gap-2">
              <div className="text-xs font-medium text-zinc-300">{t("admin.approvals.taskReviewHistory")}</div>
              {openTaskReviewLogs.length ? (
                <div className="grid gap-2">
                  {openTaskReviewLogs.map(log => (
                    <div key={log.id} className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-3 text-xs text-zinc-300">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-zinc-100">
                          {log.action === "submit"
                            ? t("admin.approvals.taskReviewActionSubmit")
                            : log.action === "confirm"
                              ? t("admin.approvals.taskReviewActionConfirm")
                              : t("admin.approvals.taskReviewActionReturn")}
                        </div>
                        <div className="text-zinc-500">{new Date(log.createdAtISO).toLocaleString()}</div>
                      </div>
                      <div className="mt-1 text-zinc-400">{userName(log.operatorUserId)}</div>
                      {log.reason ? <div className="mt-2 text-amber-100">{log.reason}</div> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-3 text-xs text-zinc-500">
                  {t("admin.approvals.taskReviewEmpty")}
                </div>
              )}
            </div>
```

- [ ] **Step 5: Show the latest review outcome in employee tasks**

Add this derived lookup near the top of `d:\HR\src\pages\employee\Tasks.tsx`:

```tsx
  const latestReviewByTaskId = new Map(
    (db.taskReviewLogs ?? [])
      .filter(log => log.action === "confirm" || log.action === "return")
      .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
      .map(log => [log.taskId, log] as const),
  );
```

Then inside the task card map, before `return (`, capture the latest log:

```tsx
              list.map(task => {
                const latestReview = latestReviewByTaskId.get(task.id);
                return (
```

And insert this block after the existing return-reason block:

```tsx
                      {latestReview ? (
                        <div className="mt-3 rounded-2xl border border-zinc-900/60 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300">
                          <div className="font-medium text-zinc-100">
                            {t("employee.tasks.latestReview")}: {getStatusLabel(latestReview.toStatus)}
                          </div>
                          <div className="mt-1 text-zinc-500">
                            {t("employee.tasks.latestReviewedAt")}: {new Date(latestReview.createdAtISO).toLocaleString()}
                          </div>
                          {latestReview.reason ? <div className="mt-1 text-amber-100">{latestReview.reason}</div> : null}
                        </div>
                      ) : null}
```

Make sure the `map` closes with `);` instead of the original direct JSX expression.

- [ ] **Step 6: Re-run the UI wiring test**

Run:

```bash
npx tsx --test tests/taskReviewLogUiWiring.test.ts
```

Expected:

```text
PASS tests/taskReviewLogUiWiring.test.ts
```

- [ ] **Step 7: Commit or checkpoint**

If inside a real Git repo:

```bash
git add src/pages/admin/Approvals.tsx src/pages/employee/Tasks.tsx src/i18n/translations.ts tests/taskReviewLogUiWiring.test.ts
git commit -m "feat: show task review logs in admin and employee ui"
```

If not inside a Git repo:

```bash
Write-Output "checkpoint: task review log ui complete"
```

### Task 4: Run Focused Verification And Regressions

**Files:**
- Test: `d:\HR\tests\taskReviewLogDomainWiring.test.ts`
- Test: `d:\HR\tests\taskReviewLogCommands.test.ts`
- Test: `d:\HR\tests\taskReviewLogUiWiring.test.ts`
- Regression: `d:\HR\tests\performanceTaskFlow.test.ts`
- Regression: `d:\HR\tests\performanceUiWiring.test.ts`

- [ ] **Step 1: Run the new focused tests**

Run:

```bash
npx tsx --test tests/taskReviewLogDomainWiring.test.ts tests/taskReviewLogCommands.test.ts tests/taskReviewLogUiWiring.test.ts
```

Expected:

```text
3 tests passed
```

- [ ] **Step 2: Run targeted regressions for existing task flow and UI wiring**

Run:

```bash
npx tsx --test tests/performanceTaskFlow.test.ts tests/performanceUiWiring.test.ts
```

Expected:

```text
PASS tests/performanceTaskFlow.test.ts
PASS tests/performanceUiWiring.test.ts
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
1. Employee submits a task and admin opens the task approval dialog
2. Admin sees a submit log in the new review history block
3. Admin returns the task with a note and the dialog shows the return log
4. Employee task page shows the latest review result and return reason
5. Employee resubmits and admin confirms the task
6. Admin dialog shows submit -> return -> submit -> confirm in reverse chronological order
```

- [ ] **Step 5: Commit or checkpoint**

If inside a real Git repo:

```bash
git add tests/taskReviewLogDomainWiring.test.ts tests/taskReviewLogCommands.test.ts tests/taskReviewLogUiWiring.test.ts
git commit -m "test: cover task review log flow"
```

If not inside a Git repo:

```bash
Write-Output "checkpoint: task review log verification complete"
```

## Self-Review

### Spec coverage

- 新增 `taskReviewLogs` 数据结构：由 Task 1 覆盖
- 在提交 / 通过 / 退回时自动写入日志：由 Task 2 覆盖
- 管理员审批弹窗展示完整历史：由 Task 3 覆盖
- 员工任务页展示最近处理结果：由 Task 3 覆盖
- 自动化验证和人工冒烟：由 Task 4 覆盖

### Placeholder scan

- 没有 `TODO`、`TBD` 或“类似上面”的占位内容
- 每个任务都包含明确文件路径、命令和代码片段
- 每个测试步骤都给出具体命令和预期输出

### Type consistency

- 新类型统一使用 `TaskReviewLogItem`
- 新集合统一使用 `taskReviewLogs`
- 动作名统一使用 `submit | confirm | return`
- 管理员和员工页面都从 `taskReviewLogs` 读取，不引入第二套命名
