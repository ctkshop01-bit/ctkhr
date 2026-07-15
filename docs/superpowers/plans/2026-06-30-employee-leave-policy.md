# Employee Leave Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在后台员工管理中支持设置员工类型与每月带薪假天数，并让工资生成自动按“正式员工每月固定 4 天带薪假、试用工 0 天、缺卡一次扣 1 天工资、无薪假按日薪扣”规则计算。

**Architecture:** 采用最小规则版实现。员工资料新增 `employmentType` 与 `monthlyPaidLeaveDays` 字段，员工编辑弹窗可维护；工资生成仍集中在 `dbStore.generatePayroll()`，但会引入纯计算 helper 来拆分“带薪/无薪请假天数”和“缺卡扣薪”，避免继续堆大 store 逻辑。月度规则按自然月计算，不做累计结转。

**Tech Stack:** React 18 + TypeScript + Zustand + node:test

---

## Files & Responsibilities

- Modify: `d:\HR\src\types\domain.ts`
  - 为 `User` 增加员工类型与每月带薪假字段
- Modify: `d:\HR\src\data\seedDb.ts`
  - 为种子员工补默认员工类型/带薪假天数
- Modify: `d:\HR\src\pages\admin\Employees.tsx`
  - 在员工新增/编辑弹窗中增加字段与保存逻辑
- Create: `d:\HR\src\stores\payrollPolicy.ts`
  - 纯函数：计算日薪、月度带薪假/无薪假拆分、缺卡扣薪
- Modify: `d:\HR\src\stores\dbStore.ts`
  - 接入新字段、调用 payroll policy helper 生成工资
- Modify: `d:\HR\src\i18n\translations.ts`
  - 补中泰文案
- Create: `d:\HR\tests\payrollPolicy.test.ts`
  - 测月度 4 天带薪假、试用工 0 天、缺卡按 1 天工资扣
- Modify: `d:\HR\tests\seedDb.test.ts`
  - 锁定种子员工默认规则
- Create: `d:\HR\tests\employeeEditorLeaveFields.test.ts`
  - 轻量源码回归，锁定员工编辑弹窗出现新字段
- Modify: `d:\HR\tsconfig.tests.json`
  - 纳入新增测试/纯函数模块

---

### Task 1: 员工资料字段与默认值

**Files:**
- Modify: `d:\HR\src\types\domain.ts`
- Modify: `d:\HR\src\data\seedDb.ts`
- Modify: `d:\HR\tests\seedDb.test.ts`

- [ ] **Step 1: 先写失败测试**

在 `seedDb.test.ts` 增加断言：

```ts
test("seed employees default to the agreed leave policy", () => {
  const db = createSeedDb();
  const e001 = db.users.find(user => user.username === "e001")!;
  const e002 = db.users.find(user => user.username === "e002")!;

  assert.equal(e001.employmentType, "regular");
  assert.equal(e001.monthlyPaidLeaveDays, 4);
  assert.equal(e002.employmentType, "regular");
  assert.equal(e002.monthlyPaidLeaveDays, 4);
});
```

- [ ] **Step 2: 跑测试确认红灯**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/seedDb.test.js
```

Expected: FAIL，提示 `employmentType` / `monthlyPaidLeaveDays` 不存在。

- [ ] **Step 3: 最小实现**

在 `domain.ts` 的 `User` 上新增：

```ts
export type EmploymentType = "regular" | "probation";

export interface User {
  // ...
  employmentType?: EmploymentType;
  monthlyPaidLeaveDays?: number;
}
```

在 `seedDb.ts` 种子员工补默认值：

```ts
employmentType: "regular",
monthlyPaidLeaveDays: 4,
```

- [ ] **Step 4: 重新跑测试确认转绿**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/seedDb.test.js
```

Expected: PASS

---

### Task 2: 员工编辑弹窗新增字段

**Files:**
- Modify: `d:\HR\src\pages\admin\Employees.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`
- Create: `d:\HR\tests\employeeEditorLeaveFields.test.ts`

- [ ] **Step 1: 先写源码回归测试**

在 `employeeEditorLeaveFields.test.ts` 断言：

```ts
assert.match(source, /employmentType/);
assert.match(source, /monthlyPaidLeaveDays/);
assert.match(source, /admin\.employees\.employmentType/);
assert.match(source, /admin\.employees\.paidLeaveDays/);
```

- [ ] **Step 2: 跑测试确认红灯**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/employeeEditorLeaveFields.test.js
```

Expected: FAIL

- [ ] **Step 3: 在员工编辑表单做最小实现**

`Employees.tsx` 需要：

```ts
type FormState = {
  // ...
  employmentType: "regular" | "probation";
  monthlyPaidLeaveDays: string;
};
```

默认值：

```ts
employmentType: "regular",
monthlyPaidLeaveDays: "4",
```

编辑已有员工时回填：

```ts
employmentType: u.employmentType ?? "regular",
monthlyPaidLeaveDays: String(u.monthlyPaidLeaveDays ?? (u.employmentType === "probation" ? 0 : 4)),
```

保存时写入：

```ts
employmentType: form.employmentType,
monthlyPaidLeaveDays: Math.max(0, Number(form.monthlyPaidLeaveDays) || 0),
```

新增表单控件：

```tsx
<Select value={form.employmentType} onChange={e => setForm(s => ({ ...s, employmentType: e.target.value as "regular" | "probation" }))}>
  <option value="regular">{t("admin.employees.employmentRegular")}</option>
  <option value="probation">{t("admin.employees.employmentProbation")}</option>
</Select>

<Input
  type="number"
  step="1"
  min="0"
  value={form.monthlyPaidLeaveDays}
  onChange={e => setForm(s => ({ ...s, monthlyPaidLeaveDays: e.target.value }))}
/>
```

翻译键：

```ts
"admin.employees.employmentType"
"admin.employees.employmentRegular"
"admin.employees.employmentProbation"
"admin.employees.paidLeaveDays"
"admin.employees.paidLeaveDaysHint"
```

- [ ] **Step 4: 跑测试确认转绿**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/employeeEditorLeaveFields.test.js
```

Expected: PASS

---

### Task 3: 工资规则纯函数

**Files:**
- Create: `d:\HR\src\stores\payrollPolicy.ts`
- Create: `d:\HR\tests\payrollPolicy.test.ts`

- [ ] **Step 1: 先写失败测试**

核心测试至少包含：

```ts
test("regular employee gets 4 paid leave days per month and excess leave is unpaid", () => {
  const result = computeMonthlyLeaveDeduction({
    baseSalaryCents: 2600000,
    employmentType: "regular",
    monthlyPaidLeaveDays: 4,
    approvedLeaveDays: 6,
    missingDays: 0,
  });
  assert.equal(result.dailySalaryCents, 100000);
  assert.equal(result.paidLeaveDays, 4);
  assert.equal(result.unpaidLeaveDays, 2);
  assert.equal(result.deductionCents, 200000);
});

test("probation employee has no paid leave quota", () => {
  const result = computeMonthlyLeaveDeduction({
    baseSalaryCents: 2600000,
    employmentType: "probation",
    monthlyPaidLeaveDays: 0,
    approvedLeaveDays: 2,
    missingDays: 0,
  });
  assert.equal(result.paidLeaveDays, 0);
  assert.equal(result.unpaidLeaveDays, 2);
  assert.equal(result.deductionCents, 200000);
});

test("missing attendance day deducts one full daily salary each time", () => {
  const result = computeMonthlyLeaveDeduction({
    baseSalaryCents: 2600000,
    employmentType: "regular",
    monthlyPaidLeaveDays: 4,
    approvedLeaveDays: 0,
    missingDays: 3,
  });
  assert.equal(result.missingDeductionCents, 300000);
  assert.equal(result.deductionCents, 300000);
});
```

- [ ] **Step 2: 跑测试确认红灯**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/payrollPolicy.test.js
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 最小实现纯函数**

`payrollPolicy.ts` 提供：

```ts
export function computeMonthlyLeaveDeduction(input: {
  baseSalaryCents: number;
  employmentType: "regular" | "probation";
  monthlyPaidLeaveDays: number;
  approvedLeaveDays: number;
  missingDays: number;
}) {
  const dailySalaryCents = Math.round(input.baseSalaryCents / 26);
  const paidQuota = input.employmentType === "regular" ? Math.max(0, input.monthlyPaidLeaveDays) : 0;
  const paidLeaveDays = Math.min(input.approvedLeaveDays, paidQuota);
  const unpaidLeaveDays = Math.max(0, input.approvedLeaveDays - paidLeaveDays);
  const unpaidLeaveDeductionCents = unpaidLeaveDays * dailySalaryCents;
  const missingDeductionCents = input.missingDays * dailySalaryCents;

  return {
    dailySalaryCents,
    paidLeaveDays,
    unpaidLeaveDays,
    unpaidLeaveDeductionCents,
    missingDeductionCents,
    deductionCents: unpaidLeaveDeductionCents + missingDeductionCents,
  };
}
```

- [ ] **Step 4: 跑测试确认转绿**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/payrollPolicy.test.js
```

Expected: PASS

---

### Task 4: 接入工资生成逻辑

**Files:**
- Modify: `d:\HR\src\stores\dbStore.ts`

- [ ] **Step 1: 在 `generatePayroll` 前写一个回归测试**

可在 `payrollPolicy.test.ts` 或新测试中增加源码/行为断言，目标是锁定 `dbStore` 已接入 `computeMonthlyLeaveDeduction`。

- [ ] **Step 2: 在 `generatePayroll()` 中接入新规则**

实现思路：

```ts
const approvedLeaveDays = state.leaveRequests
  .filter(r => r.userId === u.id && r.status === "approved" && monthISOFromDateTimeISO(r.startISO) === monthISO)
  .reduce((sum, r) => sum + r.hours / 8, 0);

const missingDays = state.attendanceDaily
  .filter(a => a.userId === u.id && monthMatchesDate(monthISO, a.dateISO) && a.status === "missing")
  .length;

const leavePolicy = computeMonthlyLeaveDeduction({
  baseSalaryCents: u.baseSalaryCents,
  employmentType: u.employmentType ?? "regular",
  monthlyPaidLeaveDays: u.monthlyPaidLeaveDays ?? 4,
  approvedLeaveDays,
  missingDays,
});
```

并将原本 `deductionsCents` 逻辑改为：

```ts
const ruleBasedDeductions = ... // 保留 late / early_leave / custom
const deductionsCents = ruleBasedDeductions + leavePolicy.deductionCents;
```

- [ ] **Step 3: 跑相关测试**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/payrollPolicy.test.js .tmp-tests/tests/seedDb.test.js .tmp-tests/tests/employeeEditorLeaveFields.test.js
```

Expected: PASS

---

### Task 5: 全量验证与打包

**Files:**
- Modify: `d:\HR\tsconfig.tests.json`

- [ ] **Step 1: 纳入新增测试文件**

确保 `tsconfig.tests.json` 包含：

```json
"tests/**/*.ts",
"src/stores/payrollPolicy.ts"
```

- [ ] **Step 2: 跑全量测试**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests
```

Expected: PASS

- [ ] **Step 3: 跑构建**

Run:

```bash
npm run build
```

Expected: PASS

- [ ] **Step 4: 重新生成发布版**

Run:

```bash
npm run package:portable
```

Expected: PASS，并更新 `d:\HR\发布版\企业员工考勤系统_局域网共享版`

