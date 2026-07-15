# Admin Payroll Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在后台工资核算页面的编辑弹窗中新增只读的考勤扣款明细区，展示带薪假、无薪假和缺卡相关拆分信息，同时保持现有 4 个工资输入项的人工编辑能力不变。

**Architecture:** 直接复用 `PayrollItem` 已有的明细字段，不新增数据结构，不改工资生成逻辑。先用源码级轻量测试锁定后台页面和翻译键，再在 `src/pages/admin/Payroll.tsx` 的现有弹窗中补一块只读明细区，并用 `?? 0` 兼容历史工资数据。

**Tech Stack:** React 18 + TypeScript + Zustand + node:test + Vite

---

## Files & Responsibilities

- Create: `d:\HR\tests\adminPayrollBreakdown.test.ts`
  - 后台工资弹窗明细展示的源码级回归测试
- Modify: `d:\HR\src\i18n\translations.ts`
  - 新增后台工资弹窗明细区的中泰翻译键
- Modify: `d:\HR\src\pages\admin\Payroll.tsx`
  - 在现有编辑弹窗中新增只读明细展示区

---

### Task 1: 新增后台工资明细红灯测试

**Files:**
- Create: `d:\HR\tests\adminPayrollBreakdown.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `d:\HR\tests\adminPayrollBreakdown.test.ts`，写入以下完整内容：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ADMIN_PAYROLL_PAGE_PATH = resolve(process.cwd(), "src", "pages", "admin", "Payroll.tsx");
const TRANSLATIONS_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("admin payroll edit dialog source includes payroll breakdown fields", () => {
  const source = readFileSync(ADMIN_PAYROLL_PAGE_PATH, "utf8");

  assert.match(source, /admin\.payroll\.breakdown/);
  assert.match(source, /admin\.payroll\.breakdownDesc/);
  assert.match(source, /admin\.payroll\.paidLeaveDays/);
  assert.match(source, /admin\.payroll\.unpaidLeaveDays/);
  assert.match(source, /admin\.payroll\.unpaidLeaveDeduction/);
  assert.match(source, /admin\.payroll\.missingDays/);
  assert.match(source, /admin\.payroll\.missingDeduction/);
  assert.match(source, /openItem\?\.paidLeaveDays \?\? 0/);
  assert.match(source, /openItem\?\.unpaidLeaveDays \?\? 0/);
  assert.match(source, /openItem\?\.unpaidLeaveDeductionCents \?\? 0/);
  assert.match(source, /openItem\?\.missingDays \?\? 0/);
  assert.match(source, /openItem\?\.missingDeductionCents \?\? 0/);
});

test("translations define admin payroll breakdown labels in both languages", () => {
  const source = readFileSync(TRANSLATIONS_PATH, "utf8");

  assert.match(source, /"admin\.payroll\.breakdown":/);
  assert.match(source, /"admin\.payroll\.breakdownDesc":/);
  assert.match(source, /"admin\.payroll\.paidLeaveDays":/);
  assert.match(source, /"admin\.payroll\.unpaidLeaveDays":/);
  assert.match(source, /"admin\.payroll\.unpaidLeaveDeduction":/);
  assert.match(source, /"admin\.payroll\.missingDays":/);
  assert.match(source, /"admin\.payroll\.missingDeduction":/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/adminPayrollBreakdown.test.ts
```

Expected: FAIL，提示后台工资页源码里还没有 `admin.payroll.breakdown` 等键，且翻译文件也还没有这些后台键。

- [ ] **Step 3: Commit the red test**

```bash
git add tests/adminPayrollBreakdown.test.ts
git commit -m "test: add admin payroll breakdown regression"
```

Expected: commit succeeds and only includes the new failing test file.

---

### Task 2: 补齐后台工资明细翻译键

**Files:**
- Modify: `d:\HR\src\i18n\translations.ts`
- Test: `d:\HR\tests\adminPayrollBreakdown.test.ts`

- [ ] **Step 1: Add the minimal translation keys**

在 `zh` 字典的 `admin.payroll.*` 区域新增以下键：

```ts
"admin.payroll.breakdown": "考勤扣款明细",
"admin.payroll.breakdownDesc": "展示带薪假、无薪假与缺卡对本月工资的影响。",
"admin.payroll.paidLeaveDays": "带薪假天数",
"admin.payroll.unpaidLeaveDays": "无薪假天数",
"admin.payroll.unpaidLeaveDeduction": "无薪假扣款",
"admin.payroll.missingDays": "缺卡天数",
"admin.payroll.missingDeduction": "缺卡扣款",
```

在 `th` 字典的 `admin.payroll.*` 区域新增以下键：

```ts
"admin.payroll.breakdown": "รายละเอียดการหักเงินจากการเข้างาน",
"admin.payroll.breakdownDesc": "แสดงผลกระทบของวันลามีค่าจ้าง วันลาไม่มีค่าจ้าง และการขาดตอกบัตรต่อเงินเดือนเดือนนี้",
"admin.payroll.paidLeaveDays": "จำนวนวันลามีค่าจ้าง",
"admin.payroll.unpaidLeaveDays": "จำนวนวันลาไม่มีค่าจ้าง",
"admin.payroll.unpaidLeaveDeduction": "หักเงินจากวันลาไม่มีค่าจ้าง",
"admin.payroll.missingDays": "จำนวนวันขาดตอกบัตร",
"admin.payroll.missingDeduction": "หักเงินจากการขาดตอกบัตร",
```

- [ ] **Step 2: Run the test to verify it still fails for the right reason**

Run:

```bash
npx tsx --test tests/adminPayrollBreakdown.test.ts
```

Expected: FAIL，但失败原因应缩小到 `src/pages/admin/Payroll.tsx` 里还没有使用这些后台键和 `openItem?.xxx ?? 0` 展示。

- [ ] **Step 3: Commit the translation groundwork**

```bash
git add src/i18n/translations.ts tests/adminPayrollBreakdown.test.ts
git commit -m "feat: add admin payroll breakdown copy"
```

Expected: commit succeeds and includes the test plus translation keys only.

---

### Task 3: 在后台工资编辑弹窗中接入只读明细区

**Files:**
- Modify: `d:\HR\src\pages\admin\Payroll.tsx`
- Test: `d:\HR\tests\adminPayrollBreakdown.test.ts`

- [ ] **Step 1: Add the breakdown UI below the existing editable inputs**

在 `src/pages/admin/Payroll.tsx` 的编辑弹窗内容中，保留现有 4 个输入块不变，并在它们后面追加以下只读区块：

```tsx
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/20 p-4">
              <div className="text-sm font-medium text-zinc-100">{t("admin.payroll.breakdown")}</div>
              <div className="mt-1 text-xs text-zinc-500">{t("admin.payroll.breakdownDesc")}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.paidLeaveDays")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">{openItem?.paidLeaveDays ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.unpaidLeaveDays")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">{openItem?.unpaidLeaveDays ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.unpaidLeaveDeduction")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">
                    {formatCNYFromCents(openItem?.unpaidLeaveDeductionCents ?? 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.missingDays")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">{openItem?.missingDays ?? 0}</div>
                </div>
                <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/30 p-4 sm:col-span-2">
                  <div className="text-xs text-zinc-500">{t("admin.payroll.missingDeduction")}</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">
                    {formatCNYFromCents(openItem?.missingDeductionCents ?? 0)}
                  </div>
                </div>
              </div>
            </div>
```

放置位置要求：

- 必须在现有 `基础工资 / 加班费 / 扣款 / 实发工资` 输入项之后
- 必须仍位于 `openItem ? (...) : null` 的弹窗正文内部
- 不得把这些明细改成 `Input`

- [ ] **Step 2: Run the focused regression test**

Run:

```bash
npx tsx --test tests/adminPayrollBreakdown.test.ts
```

Expected: PASS

- [ ] **Step 3: Run a second focused safety test**

Run:

```bash
npx tsx --test tests/employeePayrollBreakdown.test.ts
```

Expected: PASS，确保这次后台文案新增没有影响员工端已有工资明细测试。

- [ ] **Step 4: Commit the feature**

```bash
git add src/pages/admin/Payroll.tsx src/i18n/translations.ts tests/adminPayrollBreakdown.test.ts
git commit -m "feat: show payroll breakdown in admin dialog"
```

Expected: commit succeeds and includes the UI plus translation/test updates.

---

### Task 4: 做构建与收尾验证

**Files:**
- Modify: `d:\HR\src\pages\admin\Payroll.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`
- Create: `d:\HR\tests\adminPayrollBreakdown.test.ts`

- [ ] **Step 1: Run both targeted regression tests together**

Run:

```bash
npx tsx --test tests/adminPayrollBreakdown.test.ts tests/employeePayrollBreakdown.test.ts
```

Expected: PASS

- [ ] **Step 2: Build the app**

Run:

```bash
npm run build
```

Expected: PASS。允许出现 Vite chunk size warning，但不能有 TypeScript 或构建失败。

- [ ] **Step 3: Check changed files before handoff**

Run:

```bash
git diff -- src/pages/admin/Payroll.tsx src/i18n/translations.ts tests/adminPayrollBreakdown.test.ts
```

Expected: diff 只包含后台工资弹窗明细展示、本次新增翻译键和新增测试，不包含无关文件。

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add src/pages/admin/Payroll.tsx src/i18n/translations.ts tests/adminPayrollBreakdown.test.ts
git commit -m "test: verify admin payroll breakdown build"
```

Expected: commit succeeds if there are verification-only follow-up edits; if working tree is already clean after Task 3, skip this commit and record that no extra code changes were needed after verification.
