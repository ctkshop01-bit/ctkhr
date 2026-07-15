# LAN Shared Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把账号和业务数据从各设备浏览器本地存储切换到主机统一保存的共享 JSON 主数据，让手机、电脑和 PWA 共用同一套账号与同一份业务数据。

**Architecture:** 继续保留当前单机 Node 启动方式，但把 `scripts/serve-dist.mjs` 从纯静态文件服务升级为“静态资源 + API + 主机共享数据文件”的一体化服务。前端不再把 `am_db_v1` 作为主数据库，而是通过 `/api/bootstrap`、`/api/auth/login`、`/api/db/snapshot` 和 `/api/db/command` 与主机共享库通信；首次升级时，由主机浏览器把当前 `am_db_v1` 上传并初始化 `data/app-db.json`。

**Tech Stack:** React 18 + TypeScript + Zustand + Node.js HTTP server + JSON file storage + node:test + tsx

---

## Files & Responsibilities

- Create: `d:\HR\scripts\server\app-db-file.mjs`
  - 共享数据文件读写、初始化与落盘
- Create: `d:\HR\scripts\server\app-db-commands.mjs`
  - 服务端业务命令处理，接管登录和业务写入
- Create: `d:\HR\scripts\server\http-api.mjs`
  - API 路由：bootstrap、import、auth、snapshot、command
- Modify: `d:\HR\scripts\serve-dist.mjs`
  - 升级为统一服务入口，复用静态文件服务并挂载 API
- Modify: `d:\HR\scripts\make-portable-release.mjs`
  - 复制 `scripts/server` 和共享数据目录到发布版
- Create: `d:\HR\src\lib\sharedApi.ts`
  - 前端请求共享服务的最小 API 客户端
- Modify: `d:\HR\src\stores\dbStore.ts`
  - 从本地持久化主库改为共享快照 + 远端命令驱动
- Modify: `d:\HR\src\stores\authStore.ts`
  - 登录改为调用共享登录 API
- Modify: `d:\HR\src\pages\Login.tsx`
  - 增加首次共享库初始化导入入口
- Create: `d:\HR\tests\sharedAppDbFile.test.ts`
  - 共享数据文件逻辑测试
- Create: `d:\HR\tests\sharedServerApi.test.ts`
  - 服务端 API 集成测试
- Create: `d:\HR\tests\sharedBootstrapUi.test.ts`
  - 首次导入入口与前端接线源码回归测试
- Modify: `d:\HR\tsconfig.tests.json`
  - 纳入新增测试与服务端模块依赖

---

### Task 1: 建立主机共享数据文件层

**Files:**
- Create: `d:\HR\scripts\server\app-db-file.mjs`
- Create: `d:\HR\tests\sharedAppDbFile.test.ts`

- [ ] **Step 1: Write the failing tests**

创建 `d:\HR\tests\sharedAppDbFile.test.ts`，写入以下完整内容：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import {
  ensureSharedDbFile,
  loadSharedDb,
  saveSharedDb,
} from "../scripts/server/app-db-file.mjs";

test("ensureSharedDbFile creates an uninitialized shared db file when missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-shared-db-"));
  const filePath = join(root, "app-db.json");

  const state = await ensureSharedDbFile(filePath);

  assert.equal(state.initialized, false);
  assert.equal(state.db, null);
});

test("saveSharedDb then loadSharedDb preserves the shared db payload", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-shared-db-"));
  const filePath = join(root, "app-db.json");
  const seed = createSeedDb();

  await saveSharedDb(filePath, seed);
  const loaded = await loadSharedDb(filePath);

  assert.equal(loaded.initialized, true);
  assert.equal(loaded.db?.users.length, seed.users.length);
  assert.equal(loaded.db?.deductionRules.length, seed.deductionRules.length);
});

test("loadSharedDb rejects invalid json instead of silently resetting to seed data", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-shared-db-"));
  const filePath = join(root, "app-db.json");
  await writeFile(filePath, "{ bad json", "utf8");

  await assert.rejects(() => loadSharedDb(filePath));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/sharedAppDbFile.test.ts
```

Expected: FAIL，提示 `scripts/server/app-db-file.mjs` 还不存在，或者缺少 `ensureSharedDbFile / loadSharedDb / saveSharedDb` 导出。

- [ ] **Step 3: Write the minimal shared db file module**

创建 `d:\HR\scripts\server\app-db-file.mjs`，写入以下最小实现：

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

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
  return { initialized: true, db: parsed };
}

export async function saveSharedDb(filePath, db) {
  await ensureParentDir(filePath);
  await writeFile(filePath, JSON.stringify(db, null, 2), "utf8");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsx --test tests/sharedAppDbFile.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/sharedAppDbFile.test.ts scripts/server/app-db-file.mjs
git commit -m "feat: add shared db file storage"
```

---

### Task 2: 建立共享 API 与首次导入链路

**Files:**
- Create: `d:\HR\scripts\server\app-db-commands.mjs`
- Create: `d:\HR\scripts\server\http-api.mjs`
- Modify: `d:\HR\scripts\serve-dist.mjs`
- Create: `d:\HR\tests\sharedServerApi.test.ts`

- [ ] **Step 1: Write the failing API integration test**

创建 `d:\HR\tests\sharedServerApi.test.ts`，写入以下完整内容：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeedDb } from "../src/data/seedDb.js";
import { createHrServer } from "../scripts/serve-dist.mjs";

test("bootstrap reports uninitialized shared db before import", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({ distDir: join(process.cwd(), "dist"), dataFilePath: join(root, "app-db.json") });
  await server.listen(0);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/api/bootstrap`);
  const json = await res.json();

  assert.equal(json.initialized, false);
  await server.close();
});

test("import-local initializes the shared db and login uses the imported users", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({ distDir: join(process.cwd(), "dist"), dataFilePath: join(root, "app-db.json") });
  await server.listen(0);
  const port = server.address().port;
  const seed = createSeedDb();

  const importRes = await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db: seed }),
  });
  assert.equal(importRes.status, 200);

  const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginJson = await loginRes.json();

  assert.equal(loginRes.status, 200);
  assert.equal(loginJson.ok, true);
  assert.equal(loginJson.user.username, "admin");
  await server.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/sharedServerApi.test.ts
```

Expected: FAIL，提示 `createHrServer` 或相关 API 路由尚不存在。

- [ ] **Step 3: Add minimal command handling**

创建 `d:\HR\scripts\server\app-db-commands.mjs`，写入以下最小实现：

```js
import { createHash } from "node:crypto";

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

async function verifyPassword(stored, input) {
  if (stored.length === 64 && /^[a-f0-9]+$/i.test(stored)) {
    return sha256Hex(input) === stored;
  }
  return stored === input;
}

export async function loginWithSharedDb(db, username, password) {
  const user = db.users.find(item => item.username === username && item.status === "active");
  if (!user) return null;
  return (await verifyPassword(user.passwordHash, password)) ? user : null;
}
```

- [ ] **Step 4: Add minimal API router and unified server entry**

创建 `d:\HR\scripts\server\http-api.mjs`，写入以下最小实现：

```js
import { ensureSharedDbFile, loadSharedDb, saveSharedDb } from "./app-db-file.mjs";
import { loginWithSharedDb } from "./app-db-commands.mjs";

export async function handleApiRequest(req, res, { dataFilePath }) {
  if (req.url === "/api/bootstrap" && req.method === "GET") {
    const state = await ensureSharedDbFile(dataFilePath);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ initialized: state.initialized }));
    return true;
  }

  if (req.url === "/api/bootstrap/import-local" && req.method === "POST") {
    const body = await readJson(req);
    await saveSharedDb(dataFilePath, body.db);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (req.url === "/api/auth/login" && req.method === "POST") {
    const body = await readJson(req);
    const state = await loadSharedDb(dataFilePath);
    const user = await loginWithSharedDb(state.db, body.username, body.password);
    res.writeHead(user ? 200 : 401, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(user ? { ok: true, user } : { ok: false }));
    return true;
  }

  return false;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
```

把 `d:\HR\scripts\serve-dist.mjs` 重构为可导出的统一服务工厂，至少补以下导出：

```js
export function createHrServer({ distDir = DIST_DIR, dataFilePath = resolve(process.cwd(), "data", "app-db.json") } = {}) {
  const requestHandler = async (req, res) => {
    if (await handleApiRequest(req, res, { dataFilePath })) {
      return;
    }
    return serveStatic(req, res, distDir);
  };

  return createServer(requestHandler);
}
```

并保留现有 CLI 启动逻辑：

```js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(START_PORT);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npx tsx --test tests/sharedServerApi.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tests/sharedServerApi.test.ts scripts/server/app-db-commands.mjs scripts/server/http-api.mjs scripts/serve-dist.mjs
git commit -m "feat: add shared server bootstrap and login api"
```

---

### Task 3: 前端接入 bootstrap、首次导入和共享登录

**Files:**
- Create: `d:\HR\src\lib\sharedApi.ts`
- Modify: `d:\HR\src\stores\authStore.ts`
- Modify: `d:\HR\src\stores\dbStore.ts`
- Modify: `d:\HR\src\pages\Login.tsx`
- Create: `d:\HR\tests\sharedBootstrapUi.test.ts`

- [ ] **Step 1: Write the failing source regression test**

创建 `d:\HR\tests\sharedBootstrapUi.test.ts`，写入以下完整内容：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOGIN_PATH = resolve(process.cwd(), "src", "pages", "Login.tsx");
const AUTH_STORE_PATH = resolve(process.cwd(), "src", "stores", "authStore.ts");
const DB_STORE_PATH = resolve(process.cwd(), "src", "stores", "dbStore.ts");
const API_PATH = resolve(process.cwd(), "src", "lib", "sharedApi.ts");

test("Login page wires shared bootstrap import flow", () => {
  const source = readFileSync(LOGIN_PATH, "utf8");
  assert.match(source, /importLocalDbToServer/);
  assert.match(source, /shared\.bootstrap/);
});

test("auth store delegates login to shared api", () => {
  const source = readFileSync(AUTH_STORE_PATH, "utf8");
  assert.match(source, /sharedApiLogin/);
});

test("db store loads snapshot from shared api instead of persisting business data locally", () => {
  const source = readFileSync(DB_STORE_PATH, "utf8");
  assert.match(source, /loadSharedSnapshot/);
  assert.doesNotMatch(source, /name:\s*"am_db_v1"/);
});

test("shared api client exists", () => {
  const source = readFileSync(API_PATH, "utf8");
  assert.match(source, /export async function sharedApiLogin/);
  assert.match(source, /export async function loadSharedSnapshot/);
  assert.match(source, /export async function importLocalDbToServer/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/sharedBootstrapUi.test.ts
```

Expected: FAIL，提示 `sharedApi.ts` 不存在，且 `authStore.ts` / `dbStore.ts` / `Login.tsx` 还没接共享链路。

- [ ] **Step 3: Create the shared API client**

创建 `d:\HR\src\lib\sharedApi.ts`，写入以下最小实现：

```ts
async function readJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export const shared = {
  bootstrap: () => fetch("/api/bootstrap").then(readJson),
};

export async function importLocalDbToServer(db: unknown) {
  const res = await fetch("/api/bootstrap/import-local", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db }),
  });
  return readJson(res);
}

export async function sharedApiLogin(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return readJson(res);
}

export async function loadSharedSnapshot() {
  const res = await fetch("/api/db/snapshot");
  return readJson(res);
}
```

- [ ] **Step 4: Rewire login and bootstrap entry points**

在 `d:\HR\src\stores\authStore.ts` 中，把当前：

```ts
const user = await useDbStore.getState().login(username, password);
```

替换为：

```ts
const result = await sharedApiLogin(username, password);
if (!result.ok) {
  return { ok: false, message: translate(useI18nStore.getState().lang, "auth.error") };
}
const user = result.user;
```

在 `d:\HR\src\stores\dbStore.ts` 中：

- 删除业务主库 `persist(... { name: "am_db_v1" ... })`
- 增加 `loadSharedSnapshot()` action
- 初始化为 `createSeedDb()` 仅作临时内存初值，真实页面加载后以服务端快照覆盖

最小 action 形态：

```ts
loadSharedSnapshot: async () => {
  const snapshot = await loadSharedSnapshot();
  set(() => snapshot.db);
},
```

在 `d:\HR\src\pages\Login.tsx` 中新增首次导入入口逻辑：

```ts
const [bootstrap, setBootstrap] = useState<{ initialized: boolean } | null>(null);

useEffect(() => {
  shared.bootstrap().then(setBootstrap).catch(() => setBootstrap({ initialized: true }));
}, []);

async function handleImportCurrentBrowserData() {
  const raw = localStorage.getItem("am_db_v1");
  if (!raw) return;
  const parsed = JSON.parse(raw);
  await importLocalDbToServer(parsed.state ?? parsed);
  await useDbStore.getState().loadSharedSnapshot();
  setBootstrap({ initialized: true });
}
```

并在登录页仅当 `bootstrap?.initialized === false` 时显示一个按钮：

```tsx
<Button onClick={handleImportCurrentBrowserData}>
  导入这台电脑当前数据为共享主数据
</Button>
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npx tsx --test tests/sharedBootstrapUi.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/sharedApi.ts src/stores/authStore.ts src/stores/dbStore.ts src/pages/Login.tsx tests/sharedBootstrapUi.test.ts
git commit -m "feat: wire shared bootstrap import and login"
```

---

### Task 4: 把核心业务操作切到共享命令接口

**Files:**
- Modify: `d:\HR\scripts\server\app-db-commands.mjs`
- Modify: `d:\HR\scripts\server\http-api.mjs`
- Modify: `d:\HR\src\lib\sharedApi.ts`
- Modify: `d:\HR\src\stores\dbStore.ts`
- Modify: `d:\HR\tests\sharedServerApi.test.ts`

- [ ] **Step 1: Extend the failing integration test with one real business command**

在 `d:\HR\tests\sharedServerApi.test.ts` 追加以下测试：

```ts
test("db command updates shared users and snapshot returns the new value", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-server-"));
  const server = await createHrServer({ distDir: join(process.cwd(), "dist"), dataFilePath: join(root, "app-db.json") });
  await server.listen(0);
  const port = server.address().port;
  const seed = createSeedDb();

  await fetch(`http://127.0.0.1:${port}/api/bootstrap/import-local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db: seed }),
  });

  const employee = seed.users.find(item => item.role === "employee");
  const commandRes = await fetch(`http://127.0.0.1:${port}/api/db/command`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "upsertEmployee",
      payload: { ...employee, name: "共享版员工A" },
    }),
  });
  assert.equal(commandRes.status, 200);

  const snapshotRes = await fetch(`http://127.0.0.1:${port}/api/db/snapshot`);
  const snapshotJson = await snapshotRes.json();
  assert.equal(snapshotJson.db.users.find(item => item.id === employee.id)?.name, "共享版员工A");
  await server.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/sharedServerApi.test.ts
```

Expected: FAIL，因为 `/api/db/command` 和 `/api/db/snapshot` 还没有业务处理。

- [ ] **Step 3: Add minimal snapshot and command support**

在 `d:\HR\scripts\server\app-db-commands.mjs` 中新增最小命令执行器：

```js
export function applySharedCommand(db, command) {
  if (command.type === "upsertEmployee") {
    const exists = db.users.some(item => item.id === command.payload.id);
    return {
      ...db,
      users: exists
        ? db.users.map(item => (item.id === command.payload.id ? command.payload : item))
        : [command.payload, ...db.users],
    };
  }

  throw new Error(`Unsupported command: ${command.type}`);
}
```

在 `d:\HR\scripts\server\http-api.mjs` 中新增：

```js
if (req.url === "/api/db/snapshot" && req.method === "GET") {
  const state = await loadSharedDb(dataFilePath);
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ db: state.db }));
  return true;
}

if (req.url === "/api/db/command" && req.method === "POST") {
  const body = await readJson(req);
  const state = await loadSharedDb(dataFilePath);
  const nextDb = applySharedCommand(state.db, body);
  await saveSharedDb(dataFilePath, nextDb);
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ ok: true, db: nextDb }));
  return true;
}
```

在 `d:\HR\src\lib\sharedApi.ts` 中新增：

```ts
export async function runSharedCommand(command: unknown) {
  const res = await fetch("/api/db/command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  return readJson(res);
}
```

在 `d:\HR\src\stores\dbStore.ts` 中，把 `upsertEmployee` 先改成共享命令模式：

```ts
const result = await runSharedCommand({
  type: "upsertEmployee",
  payload: createdOrUpdatedUser,
});
set(() => result.db);
return result.db.users.find((u: User) => u.id === createdOrUpdatedUser.id)!;
```

本任务完成标准：

- 先把一条关键链路跑通：`upsertEmployee`
- 其余业务 action 再按同样模式逐步迁移

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx tsx --test tests/sharedServerApi.test.ts
```

Expected: PASS

- [ ] **Step 5: Expand the command migration set**

继续把以下 action 从本地持久化迁移为共享命令：

- `setUserWeeklyOffDays`
- `setUserStatus`
- `clock`
- `submitLeave`
- `submitOvertime`
- `reviewLeave`
- `reviewOvertime`
- `confirmAttendance`
- `upsertDeductionRule`
- `deleteDeductionRule`
- `updatePayrollItem`
- `generatePayroll`
- `markAnnouncementRead`
- `upsertAnnouncement`
- `deleteAnnouncement`
- `upsertTask`
- `deleteTask`
- `toggleTaskDone`
- `updateAdminCredentials`

每迁完一组，采用相同模式：

```ts
const result = await runSharedCommand({ type: "...", payload: ... });
set(() => result.db);
```

服务端对应扩展 `applySharedCommand()` 分支，并继续复用当前业务规则口径。

- [ ] **Step 6: Commit**

```bash
git add scripts/server/app-db-commands.mjs scripts/server/http-api.mjs src/lib/sharedApi.ts src/stores/dbStore.ts tests/sharedServerApi.test.ts
git commit -m "feat: route core business actions through shared commands"
```

---

### Task 5: 升级启动脚本、发布包与最终验证

**Files:**
- Modify: `d:\HR\scripts\make-portable-release.mjs`
- Modify: `d:\HR\package.json`
- Modify: `d:\HR\启动局域网共享版.bat`
- Modify: `d:\HR\启动局域网共享版_自动放行防火墙.bat`
- Modify: `d:\HR\启动局域网共享版_防火墙提示.bat`
- Modify: `d:\HR\tests\portableReleaseInstallDocs.test.ts`
- Modify: `d:\HR\tsconfig.tests.json`

- [ ] **Step 1: Write the failing release regression test**

在 `d:\HR\tests\portableReleaseInstallDocs.test.ts` 追加以下断言：

```ts
assert.match(source, /data[\\/]+app-db\.json/);
assert.match(source, /scripts[\\/]+server/);
assert.match(source, /共享数据|主数据/);
```

并新增一个源码断言，检查根目录启动脚本包含共享服务提示：

```ts
const launcher = readFileSync(resolve(process.cwd(), "启动局域网共享版.bat"), "utf8");
assert.match(launcher, /共享数据/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsx --test tests/portableReleaseInstallDocs.test.ts
```

Expected: FAIL，因为发布脚本还没有把共享数据目录和服务端脚本带入发布包。

- [ ] **Step 3: Upgrade release packaging**

在 `d:\HR\scripts\make-portable-release.mjs` 中补以下复制逻辑：

```js
await mkdir(resolve(RELEASE_DIR, "data"), { recursive: true });
await mkdir(resolve(RELEASE_DIR, "scripts", "server"), { recursive: true });

if (existsSync(resolve(PROJECT_ROOT, "data", "app-db.json"))) {
  await cp(resolve(PROJECT_ROOT, "data", "app-db.json"), resolve(RELEASE_DIR, "data", "app-db.json"));
}

await cp(resolve(PROJECT_ROOT, "scripts", "server"), resolve(RELEASE_DIR, "scripts", "server"), { recursive: true });
```

更新根目录和发布版启动文案，把：

```bat
echo [2/2] 正在启动正式版服务...
```

改为：

```bat
echo [2/2] 正在启动共享数据服务...
echo 首次使用时，请在主机电脑浏览器中导入当前旧数据作为共享主数据
```

- [ ] **Step 4: Run focused tests and build**

Run:

```bash
npx tsx --test tests/sharedAppDbFile.test.ts tests/sharedServerApi.test.ts tests/sharedBootstrapUi.test.ts tests/portableReleaseInstallDocs.test.ts
npm run build
npm run package:portable
```

Expected:

- 所有测试 PASS
- 构建 PASS
- 发布版重新生成成功

- [ ] **Step 5: Manual integration verification**

按以下顺序手工验证：

1. 删除或备份旧 `data/app-db.json`
2. 启动共享版
3. 在主机浏览器中点击“导入这台电脑当前数据为共享主数据”
4. 电脑端使用旧账号登录成功
5. 手机端使用同一账号密码登录成功
6. 电脑端修改管理员账号或密码
7. 手机端使用新密码登录成功

- [ ] **Step 6: Commit**

```bash
git add scripts/make-portable-release.mjs package.json 启动局域网共享版.bat 启动局域网共享版_自动放行防火墙.bat 启动局域网共享版_防火墙提示.bat tests/portableReleaseInstallDocs.test.ts tsconfig.tests.json
git commit -m "feat: package shared lan data release"
```
