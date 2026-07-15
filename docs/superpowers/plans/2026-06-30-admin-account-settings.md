# Admin Account Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理员在后台可修改唯一管理员账号与密码，保存后强制退出并跳回登录页。

**Architecture:** 以“唯一管理员用户（role=admin）”为模型。将账号密码更新逻辑抽成纯函数模块用于单元测试；dbStore 调用该模块更新 users；后台新增“管理员账号”页面与路由入口，保存成功后调用 logout 并跳转 /login。

**Tech Stack:** React 18 + React Router + Zustand + node:test + TypeScript

---

## Files & Responsibilities

- Create: `d:\HR\src\data\adminAccount.ts`
  - 纯函数：查找唯一管理员、校验当前密码、校验 username 唯一、生成新 passwordHash、返回更新后的 `AppDb`
- Create: `d:\HR\tests\adminAccount.test.ts`
  - 单测：正确更新 / 密码不对 / username 冲突
- Modify: `d:\HR\src\stores\dbStore.ts`
  - 新增 action：`updateAdminCredentials(...)`
- Modify: `d:\HR\src\App.tsx`
  - 新增后台路由：`/admin/admin-account`
- Modify: `d:\HR\src\pages\admin\AdminLayout.tsx`
  - 新增菜单项：管理员账号
- Create: `d:\HR\src\pages\admin\AdminAccount.tsx`
  - 页面表单：当前密码 / 新账号 / 新密码 / 确认新密码
  - 保存成功：logout + navigate("/login", { replace: true })
- Modify: `d:\HR\src\i18n\translations.ts`
  - 新增中/泰翻译 key（导航与表单文案/错误提示）

---

### Task 1: Pure Domain Logic (TDD)

**Files:**
- Create: `d:\HR\src\data\adminAccount.ts`
- Test: `d:\HR\tests\adminAccount.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import type { AppDb, User } from "../src/types/domain.js";
import { createAdminAccountUpdater } from "../src/data/adminAccount.js";

function baseDb(adminPasswordHash: string): AppDb {
  const admin: User = {
    id: "usr_admin",
    username: "admin",
    passwordHash: adminPasswordHash,
    name: "admin",
    role: "admin",
    baseSalaryCents: 0,
    status: "active",
    createdAtISO: "2026-06-01T00:00:00Z",
  };
  const e: User = {
    id: "usr_e",
    username: "e1",
    passwordHash: "pw",
    name: "e1",
    role: "employee",
    baseSalaryCents: 0,
    status: "active",
    createdAtISO: "2026-06-01T00:00:00Z",
  };

  return {
    users: [admin, e],
    clockEvents: [],
    attendanceDaily: [],
    leaveRequests: [],
    overtimeRequests: [],
    deductionRules: [],
    payrollItems: [],
    announcements: [],
    announcementReads: [],
    tasks: [],
    taskAssignees: [],
  };
}

test("updates single admin username/password when current password matches", async () => {
  const updater = createAdminAccountUpdater(baseDb("admin123"));
  const res = await updater.update({
    currentPassword: "admin123",
    newUsername: "boss",
    newPassword: "newpw",
  });
  assert.equal(res.ok, true);
  assert.equal(res.db!.users.find(u => u.role === "admin")!.username, "boss");
  assert.notEqual(res.db!.users.find(u => u.role === "admin")!.passwordHash, "admin123");
});

test("rejects update when current password is wrong", async () => {
  const updater = createAdminAccountUpdater(baseDb("admin123"));
  const res = await updater.update({
    currentPassword: "bad",
    newUsername: "boss",
    newPassword: "newpw",
  });
  assert.deepEqual(res, { ok: false, code: "bad_current_password" });
});

test("rejects update when new username conflicts with existing user", async () => {
  const updater = createAdminAccountUpdater(baseDb("admin123"));
  const res = await updater.update({
    currentPassword: "admin123",
    newUsername: "e1",
    newPassword: "newpw",
  });
  assert.deepEqual(res, { ok: false, code: "username_taken" });
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/adminAccount.test.js
```
Expected: FAIL（模块/导出不存在）

- [ ] **Step 3: Minimal implementation**

```ts
import type { AppDb, User } from "../types/domain.js";
import { sha256Hex } from "../utils/core.js";

type UpdateInput = {
  currentPassword: string;
  newUsername: string;
  newPassword: string;
};

type UpdateResult =
  | { ok: true; db: AppDb }
  | { ok: false; code: "bad_current_password" | "username_taken" | "admin_not_found" | "invalid_input" };

async function verifyPassword(stored: string, input: string) {
  if (stored.length === 64 && /^[a-f0-9]+$/i.test(stored)) {
    return (await sha256Hex(input)) === stored;
  }
  return stored === input;
}

async function hashPassword(input: string) {
  return sha256Hex(input);
}

function findSingleAdmin(users: User[]) {
  return users.find(u => u.role === "admin") ?? null;
}

export function createAdminAccountUpdater(db: AppDb) {
  return {
    update: async (input: UpdateInput): Promise<UpdateResult> => {
      const newUsername = input.newUsername.trim();
      if (!newUsername || !input.newPassword) return { ok: false, code: "invalid_input" };

      const admin = findSingleAdmin(db.users);
      if (!admin) return { ok: false, code: "admin_not_found" };

      const ok = await verifyPassword(admin.passwordHash, input.currentPassword);
      if (!ok) return { ok: false, code: "bad_current_password" };

      const conflict = db.users.some(u => u.id !== admin.id && u.username === newUsername);
      if (conflict) return { ok: false, code: "username_taken" };

      const nextAdmin: User = {
        ...admin,
        username: newUsername,
        passwordHash: await hashPassword(input.newPassword),
      };

      return {
        ok: true,
        db: {
          ...db,
          users: db.users.map(u => (u.id === admin.id ? nextAdmin : u)),
        },
      };
    },
  };
}
```

- [ ] **Step 4: Verify GREEN**

Run:
```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/adminAccount.test.js
```
Expected: PASS

---

### Task 2: Wire Into dbStore (TDD)

**Files:**
- Modify: `d:\HR\src\stores\dbStore.ts`
- Test: `d:\HR\tests\adminAccountStoreWiring.test.ts` (optional; only if无需改动 tests 配置)

- [ ] **Step 1: Add action signature**
  - 在 `DbActions` 增加：
    - `updateAdminCredentials: (input: { currentPassword: string; newUsername: string; newPassword: string }) => Promise<{ ok: true } | { ok: false; code: string }>`

- [ ] **Step 2: Implement action**
  - 在 store 内部：
    - `const res = await createAdminAccountUpdater(get()).update(input)`
    - `if (!res.ok) return res`
    - `set(() => res.db)`
    - `return { ok: true }`

- [ ] **Step 3: Verify**
  - Run `npm run build` 确保类型无误

---

### Task 3: Admin UI + Route + Menu (TDD via source regression)

**Files:**
- Create: `d:\HR\src\pages\admin\AdminAccount.tsx`
- Modify: `d:\HR\src\App.tsx`
- Modify: `d:\HR\src\pages\admin\AdminLayout.tsx`
- Modify: `d:\HR\src\i18n\translations.ts`
- Test: `d:\HR\tests\adminAccountRouteWiring.test.ts`

- [ ] **Step 1: Write failing source test**
  - 断言：
    - `App.tsx` 包含 `/admin/admin-account`
    - `AdminLayout.tsx` nav 包含 `/admin/admin-account`

- [ ] **Step 2: Implement UI**
  - 页面结构参考 `AdminEmployees.tsx`（标题/副标题 + Card 表单）
  - 表单字段：当前密码 / 新账号 / 新密码 / 确认新密码
  - 客户端校验：新密码与确认新密码一致，否则展示错误
  - 提交流程：
    - `await useDbStore.getState().updateAdminCredentials(...)`
    - 成功：`useAuthStore.getState().logout(); navigate("/login", { replace: true })`
    - 失败：根据 code 映射到翻译 key 展示一行错误提示

- [ ] **Step 3: Wire route/menu**
  - `App.tsx`：在 admin 子路由新增 `path="admin-account"`
  - `AdminLayout.tsx`：nav 增加一项（`Settings` 图标）

- [ ] **Step 4: Add translations**
  - nav：`nav.adminAccount`
  - 页面：`admin.account.title/subtitle/currentPwd/newUsername/newPwd/confirmPwd/save`
  - 错误：`admin.account.err.badCurrentPwd`, `admin.account.err.usernameTaken`, `admin.account.err.mismatch`

- [ ] **Step 5: Verify**
  - Run:
```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests
npm run build
```

---

### Task 4: Package Release

**Files:**
- (no code) run packaging

- [ ] **Step 1: Generate portable release**

Run:
```bash
npm run package:portable
```

