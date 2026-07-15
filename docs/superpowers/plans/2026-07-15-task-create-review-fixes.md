# Task Create And Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复任务创建时字段丢失，并补齐管理员审核任务的 UI 入口与操作链路。

**Architecture:** 先用服务端和 UI 连线测试锁定两个缺口，再对共享命令处理器和管理员审批页做最小改动。任务创建修复只补 `upsertTask` 的字段保留逻辑；审批 UI 修复只在现有 `AdminApprovals` 页面新增任务 tab、待审核列表与审核弹窗，继续复用既有 `reviewTaskCompletion` 命令。

**Tech Stack:** React 18、TypeScript、Zustand、Node.js test runner、共享 LAN 命令处理器

---

### Task 1: 锁定任务创建字段丢失

**Files:**
- Modify: `d:\HR\tests\sharedServerApi.test.ts`
- Modify: `d:\HR\scripts\server\app-db-commands.mjs`
- Test: `d:\HR\tests\sharedServerApi.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("upsertTask keeps performance task fields", async () => {
  const response = await callCommand({
    type: "upsertTask",
    payload: {
      title: "Daily closing",
      description: "Need same day review",
      status: "open",
      taskType: "same_day",
      includeInPerformance: true,
    },
  });

  assert.equal(response.result.taskType, "same_day");
  assert.equal(response.result.includeInPerformance, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/sharedServerApi.test.ts`
Expected: FAIL because returned task object does not include `taskType` / `includeInPerformance`

- [ ] **Step 3: Write minimal implementation**

```js
const task = {
  id: input.id ?? createId("tsk"),
  title: input.title,
  description: input.description,
  dueAtISO: input.dueAtISO,
  status: input.status,
  taskType: input.taskType,
  includeInPerformance: input.includeInPerformance,
  performanceEvaluated: input.performanceEvaluated,
  createdAtISO: nowISO(),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/sharedServerApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/sharedServerApi.test.ts scripts/server/app-db-commands.mjs
git commit -m "fix: preserve task creation performance fields"
```

### Task 2: 锁定管理员审核任务 UI 缺口

**Files:**
- Modify: `d:\HR\tests\performanceUiWiring.test.ts`
- Modify: `d:\HR\src\pages\admin\Approvals.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`
- Test: `d:\HR\tests\performanceUiWiring.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
assert.match(adminApprovals, /"task"/);
assert.match(adminApprovals, /reviewTaskCompletion/);
assert.match(adminApprovals, /submitted/);
assert.match(i18n, /admin\.approvals\.tasks/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/performanceUiWiring.test.ts`
Expected: FAIL because `AdminApprovals` does not expose task review tab or text wiring

- [ ] **Step 3: Write minimal implementation**

```tsx
const [tab, setTab] = useState<"leave" | "overtime" | "attendance" | "task">("leave");
const pendingTasks = useMemo(() => db.tasks.filter(task => task.status === "submitted"), [db.tasks]);
```

```tsx
{ key: "task", label: `${t("admin.approvals.tasks")} (${pendingTasks.length})` }
```

```tsx
db.reviewTaskCompletion(openTask.id, userId!, "confirm", note.trim() || undefined);
db.reviewTaskCompletion(openTask.id, userId!, "return", note.trim() || undefined);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/performanceUiWiring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/performanceUiWiring.test.ts src/pages/admin/Approvals.tsx src/i18n/translations.ts
git commit -m "feat: add admin task review approvals ui"
```

### Task 3: 关键链路复验

**Files:**
- Test: `d:\HR\tests\sharedServerApi.test.ts`
- Test: `d:\HR\tests\performanceUiWiring.test.ts`
- Test: `d:\HR\tests\performanceTaskFlow.test.ts`

- [ ] **Step 1: Run targeted regression suite**

```bash
npx tsx --test tests/sharedServerApi.test.ts tests/performanceUiWiring.test.ts tests/performanceTaskFlow.test.ts
```

- [ ] **Step 2: Run type and lint verification for touched files**

```bash
npm run check
npm run lint
```

- [ ] **Step 3: Confirm expected results**

```txt
- sharedServerApi: task fields retained
- performanceUiWiring: admin approvals includes task review wiring
- performanceTaskFlow: submit/review lifecycle still passes
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "test: cover task creation and admin review regressions"
```
