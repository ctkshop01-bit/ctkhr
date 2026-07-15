# Employee Payroll Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在员工端工资页显示带薪假/无薪假/缺卡相关的工资明细，并让工资生成时把这些明细字段一并写入工资项。

**Architecture:** 扩展 `PayrollItem` 增加最小必要的明细字段，生成工资时直接复用现有 `computeMonthlyLeaveDeduction()` 结果写入。员工端工资页只做展示，不修改后台工资表结构；老数据缺字段时统一用 `0` 兜底，保证兼容已生成历史工资。

**Tech Stack:** React 18 + TypeScript + Zustand + node:test

---

## Files & Responsibilities

- Modify: `d:\HR\src\types\domain.ts`
  - 给 `PayrollItem` 增加工资拆分字段
- Modify: `d:\HR\src\stores\dbStore.ts`
  - 生成工资时写入带薪假/无薪假/缺卡明细
- Modify: `d:\HR\src\pages\employee\Payroll.tsx`
  - 员工端工资页展示明细卡片
- Modify: `d:\HR\src\i18n\translations.ts`
  - 增加中泰文案
- Create: `d:\HR\tests\employeePayrollBreakdown.test.ts`
  - 源码回归测试：工资页展示新明细项
- Modify: `d:\HR\tests\dbStorePayroll.test.ts`
  - 锁定工资项里明细字段被正确写入
- Modify: `d:\HR\tsconfig.tests.json`
  - 纳入新增测试

---

### Task 1: 扩展 PayrollItem 字段

**Files:**
- Modify: `d:\HR\src\types\domain.ts`
- Modify: `d:\HR\tests\dbStorePayroll.test.ts`

- [ ] **Step 1: Write the failing test**

在 `dbStorePayroll.test.ts` 追加断言：

```ts
assert.equal(item.paidLeaveDays, 1);
assert.equal(item.unpaidLeaveDays, 1);
assert.equal(item.unpaidLeaveDeductionCents, 100000);
assert.equal(item.missingDays, 1);
assert.equal(item.missingDeductionCents, 100000);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/dbStorePayroll.test.js
```

Expected: FAIL，提示 `PayrollItem` 上不存在这些字段或运行结果为 `undefined`。

- [ ] **Step 3: Write minimal implementation**

在 `domain.ts` 的 `PayrollItem` 上新增：

```ts
paidLeaveDays?: number;
unpaidLeaveDays?: number;
unpaidLeaveDeductionCents?: number;
missingDays?: number;
missingDeductionCents?: number;
```

- [ ] **Step 4: Run test to verify it still fails for the correct reason**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/dbStorePayroll.test.js
```

Expected: 仍 FAIL，但失败原因切换为 `item.xxx` 还没写值。

---

### Task 2: 生成工资时写入明细字段

**Files:**
- Modify: `d:\HR\src\stores\dbStore.ts`
- Modify: `d:\HR\tests\dbStorePayroll.test.ts`

- [ ] **Step 1: Confirm RED**

保持上一步测试，确认当前红灯是因为 `generatePayroll()` 返回的 `PayrollItem` 未写入明细字段。

- [ ] **Step 2: Write minimal implementation**

在 `generatePayroll()` 里复用现有 `leavePolicy` 和 `missingDays`，返回工资项时增加：

```ts
paidLeaveDays: leavePolicy.paidLeaveDays,
unpaidLeaveDays: leavePolicy.unpaidLeaveDays,
unpaidLeaveDeductionCents: leavePolicy.unpaidLeaveDeductionCents,
missingDays,
missingDeductionCents: leavePolicy.missingDeductionCents,
```

- [ ] **Step 3: Run test to verify it passes**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/dbStorePayroll.test.js
```

Expected: PASS

---

### Task 3: 员工端工资页显示明细

**Files:**
- Modify: `d:\HR\src\pages\employee\Payroll.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`
- Create: `d:\HR\tests\employeePayrollBreakdown.test.ts`

- [ ] **Step 1: Write the failing source regression test**

在 `employeePayrollBreakdown.test.ts` 断言源码包含：

```ts
assert.match(source, /employee\.payroll\.paidLeaveDays/);
assert.match(source, /employee\.payroll\.unpaidLeaveDays/);
assert.match(source, /employee\.payroll\.unpaidLeaveDeduction/);
assert.match(source, /employee\.payroll\.missingDays/);
assert.match(source, /employee\.payroll\.missingDeduction/);
```

同时检查翻译文件存在这些 key。

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/employeePayrollBreakdown.test.js
```

Expected: FAIL

- [ ] **Step 3: Write minimal UI**

在 `employee/Payroll.tsx` 的工资页新增一块明细卡片，展示：

```tsx
<div>{t("employee.payroll.paidLeaveDays")}</div>
<div>{payroll?.paidLeaveDays ?? 0}</div>

<div>{t("employee.payroll.unpaidLeaveDays")}</div>
<div>{payroll?.unpaidLeaveDays ?? 0}</div>

<div>{t("employee.payroll.unpaidLeaveDeduction")}</div>
<div>{formatCNYFromCents(payroll?.unpaidLeaveDeductionCents ?? 0)}</div>

<div>{t("employee.payroll.missingDays")}</div>
<div>{payroll?.missingDays ?? 0}</div>

<div>{t("employee.payroll.missingDeduction")}</div>
<div>{formatCNYFromCents(payroll?.missingDeductionCents ?? 0)}</div>
```

翻译键新增：

```ts
"employee.payroll.breakdown"
"employee.payroll.breakdownDesc"
"employee.payroll.paidLeaveDays"
"employee.payroll.unpaidLeaveDays"
"employee.payroll.unpaidLeaveDeduction"
"employee.payroll.missingDays"
"employee.payroll.missingDeduction"
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/employeePayrollBreakdown.test.js
```

Expected: PASS

---

### Task 4: 全量验证与打包

**Files:**
- Modify: `d:\HR\tsconfig.tests.json`

- [ ] **Step 1: Include the new test**

确保 `tests/**/*.ts` 已覆盖新增测试；如果需要，确认 `employeePayrollBreakdown.test.ts` 会编译进 `.tmp-tests/tests/`。

- [ ] **Step 2: Run focused regression tests**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/dbStorePayroll.test.js .tmp-tests/tests/employeePayrollBreakdown.test.js
```

Expected: PASS

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS

- [ ] **Step 4: Repackage release**

Run:

```bash
npm run package:portable
```

Expected: PASS，并更新 `d:\HR\发布版\企业员工考勤系统_局域网共享版`

