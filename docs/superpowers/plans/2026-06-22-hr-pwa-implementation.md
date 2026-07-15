# HR 系统 PWA 手机安装版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 HR 网页系统增加标准 PWA 能力，让员工可在 Android Chrome 和 iPhone Safari 中安装到手机桌面，同时保留现有局域网共享与便携发布流程。

**Architecture:** 通过 `vite-plugin-pwa` 为当前 `React + Vite` 项目增加 `manifest.webmanifest`、Service Worker 和安装元信息；把易测试的 PWA 配置抽到 `src/pwa/`；继续沿用现有 `scripts/make-portable-release.mjs` 打包流程，并把中泰双语安装说明一并纳入发布版。

**Tech Stack:** React 18、TypeScript、Vite 6、vite-plugin-pwa、Node `node:test`、sharp、PowerShell、便携版发布脚本

---

## File Structure

### Create

- `src/pwa/pwaConfig.ts`
  - 统一保存 PWA 名称、颜色、描述、图标清单与 manifest 生成函数。
- `src/pwa/registerServiceWorker.ts`
  - 单独负责在生产环境注册 Service Worker。
- `scripts/generate-pwa-icons.mjs`
  - 从现有 `public/favicon.svg` 生成 `apple-touch-icon.png`、`pwa-192x192.png`、`pwa-512x512.png`、`maskable-512x512.png`。
- `tests/pwaConfig.test.ts`
  - 验证 manifest 配置的关键字段。
- `tests/pwaBuildArtifacts.test.ts`
  - 验证构建后会生成 `manifest.webmanifest` 和 `sw.js`。
- `tests/pwaIconFiles.test.ts`
  - 验证图标生成脚本会生成所需 PNG 文件。
- `tests/portableReleaseInstallDocs.test.ts`
  - 验证便携发布包中包含手机安装说明文档。
- `docs/mobile-install-zh.md`
  - 中文员工手机安装说明。
- `docs/mobile-install-th.md`
  - 泰文员工手机安装说明。

### Modify

- `package.json`
  - 新增 `vite-plugin-pwa`、`sharp` 依赖和 `generate:pwa-icons` 脚本。
- `vite.config.ts`
  - 接入 `VitePWA` 并复用 `src/pwa/pwaConfig.ts` 的 manifest 配置。
- `src/main.tsx`
  - 注册 Service Worker。
- `src/vite-env.d.ts`
  - 增加 `vite-plugin-pwa/client` 类型引用。
- `index.html`
  - 增加 PWA 元信息、Apple 启动能力和图标声明。
- `tsconfig.tests.json`
  - 纳入 `src/pwa/pwaConfig.ts`。
- `scripts/make-portable-release.mjs`
  - 把中泰双语手机安装说明复制到发布版，并在说明里提醒员工查看。

---

### Task 1: 抽离可测试的 PWA 配置

**Files:**
- Create: `tests/pwaConfig.test.ts`
- Create: `src/pwa/pwaConfig.ts`
- Modify: `tsconfig.tests.json`

- [ ] **Step 1: 写失败测试，先锁定 manifest 关键字段**

在 `tests/pwaConfig.test.ts` 写入：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createWebManifest, PWA_THEME_COLOR } from "../src/pwa/pwaConfig.js";

test("creates standalone thai manifest metadata for the HR app", () => {
  const manifest = createWebManifest();

  assert.equal(manifest.name, "企业员工考勤系统");
  assert.equal(manifest.short_name, "HR考勤");
  assert.equal(manifest.lang, "th");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.theme_color, PWA_THEME_COLOR);
  assert.deepEqual(
    manifest.icons.map(icon => icon.src),
    [
      "pwa-192x192.png",
      "pwa-512x512.png",
      "maskable-512x512.png",
    ],
  );
});
```

- [ ] **Step 2: 把新源文件纳入测试编译配置**

把 `tsconfig.tests.json` 的 `include` 改成：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2020", "DOM"],
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    },
    "outDir": "./.tmp-tests"
  },
  "include": [
    "tests/**/*.ts",
    "src/pages/employee/clockPunchState.ts",
    "src/components/common/photoUpload.ts",
    "src/stores/persistClockEvents.ts",
    "src/types/domain.ts",
    "src/pwa/pwaConfig.ts"
  ]
}
```

- [ ] **Step 3: 运行测试并确认当前失败**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
```

Expected:
- 编译失败，报错类似 `Cannot find module '../src/pwa/pwaConfig.js'`

- [ ] **Step 4: 写最小实现**

在 `src/pwa/pwaConfig.ts` 写入：

```ts
export const PWA_THEME_COLOR = "#0A0B0D";
export const PWA_BACKGROUND_COLOR = "#0A0B0D";
export const PWA_APP_NAME = "企业员工考勤系统";
export const PWA_SHORT_NAME = "HR考勤";
export const PWA_DESCRIPTION = "面向企业员工的考勤、请假、加班、审批与工资管理系统";

export const PWA_ICON_ENTRIES = [
  { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
  { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
  {
    src: "maskable-512x512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
] as const;

export function createWebManifest() {
  return {
    name: PWA_APP_NAME,
    short_name: PWA_SHORT_NAME,
    description: PWA_DESCRIPTION,
    lang: "th",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: PWA_THEME_COLOR,
    background_color: PWA_BACKGROUND_COLOR,
    icons: [...PWA_ICON_ENTRIES],
  };
}
```

- [ ] **Step 5: 重新运行测试，确认通过**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/pwaConfig.test.js
```

Expected:
- 编译通过
- 输出中包含 `ok`，`pwaConfig.test.js` 通过

---

### Task 2: 接入 Vite PWA 与 Service Worker 注册

**Files:**
- Create: `src/pwa/registerServiceWorker.ts`
- Create: `tests/pwaBuildArtifacts.test.ts`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/main.tsx`
- Modify: `src/vite-env.d.ts`

- [ ] **Step 1: 写失败测试，锁定构建产物**

在 `tests/pwaBuildArtifacts.test.ts` 写入：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DIST_DIR = resolve(process.cwd(), "dist");

test("build emits manifest and service worker for the PWA shell", () => {
  const manifestPath = resolve(DIST_DIR, "manifest.webmanifest");
  const swPath = resolve(DIST_DIR, "sw.js");

  assert.equal(existsSync(manifestPath), true);
  assert.equal(existsSync(swPath), true);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.lang, "th");
  assert.equal(
    manifest.icons.some((icon: { src: string }) => icon.src === "pwa-192x192.png"),
    true,
  );
});
```

- [ ] **Step 2: 在现状下运行构建验证，确认失败**

Run:

```bash
npm run build
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/pwaBuildArtifacts.test.js
```

Expected:
- `npm run build` 仍可成功
- `pwaBuildArtifacts.test.js` 失败，报错 `manifest.webmanifest` 或 `sw.js` 不存在

- [ ] **Step 3: 安装插件依赖**

Run:

```bash
npm install -D vite-plugin-pwa
```

Expected:
- `package.json` 与锁文件更新
- 控制台出现 `added` / `up to date` 之类的 npm 成功输出

- [ ] **Step 4: 写最小实现，把 PWA 接到构建与入口**

把 `package.json` 调整为：

```json
{
  "name": "trae-project",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "check": "tsc -b --noEmit",
    "serve:dist": "node scripts/serve-dist.mjs",
    "package:portable": "npm run build && node scripts/make-portable-release.mjs"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.3.0",
    "tailwind-merge": "^3.0.2",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@eslint/js": "^9.25.0",
    "@types/node": "^22.15.30",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "babel-plugin-react-dev-locator": "^1.0.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "eslint": "^9.25.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^16.0.0",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.30.1",
    "vite": "^6.3.5",
    "vite-plugin-pwa": "^0.20.5",
    "vite-plugin-trae-solo-badge": "^1.0.0",
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

把 `vite.config.ts` 改成：

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import { traeBadgePlugin } from "vite-plugin-trae-solo-badge";
import { createWebManifest } from "./src/pwa/pwaConfig";

export default defineConfig({
  build: {
    sourcemap: "hidden",
  },
  plugins: [
    react({
      babel: {
        plugins: ["react-dev-locator"],
      },
    }),
    traeBadgePlugin({
      variant: "dark",
      position: "bottom-right",
      prodOnly: true,
      clickable: true,
      clickUrl: "https://www.trae.ai/solo?showJoin=1",
      autoTheme: true,
      autoThemeTarget: "#root",
    }),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: createWebManifest(),
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});
```

在 `src/pwa/registerServiceWorker.ts` 写入：

```ts
export async function registerServiceWorker() {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) {
    return;
  }

  const { registerSW } = await import("virtual:pwa-register");
  registerSW({
    immediate: true,
  });
}
```

把 `src/main.tsx` 改成：

```ts
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./pwa/registerServiceWorker";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

把 `src/vite-env.d.ts` 改成：

```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
```

- [ ] **Step 5: 重新构建并确认产物测试通过**

Run:

```bash
npm run build
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/pwaBuildArtifacts.test.js
```

Expected:
- `dist/manifest.webmanifest` 生成成功
- `dist/sw.js` 生成成功
- `pwaBuildArtifacts.test.js` 通过

---

### Task 3: 生成安装图标并补齐 HTML 元信息

**Files:**
- Create: `scripts/generate-pwa-icons.mjs`
- Create: `tests/pwaIconFiles.test.ts`
- Modify: `package.json`
- Modify: `index.html`

- [ ] **Step 1: 写失败测试，锁定生成的 PNG 图标**

在 `tests/pwaIconFiles.test.ts` 写入：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC_DIR = resolve(process.cwd(), "public");

test("icon generation emits required png files for install surfaces", () => {
  assert.equal(existsSync(resolve(PUBLIC_DIR, "apple-touch-icon.png")), true);
  assert.equal(existsSync(resolve(PUBLIC_DIR, "pwa-192x192.png")), true);
  assert.equal(existsSync(resolve(PUBLIC_DIR, "pwa-512x512.png")), true);
  assert.equal(existsSync(resolve(PUBLIC_DIR, "maskable-512x512.png")), true);
});
```

- [ ] **Step 2: 在实现前运行命令，确认失败**

Run:

```bash
npm run generate:pwa-icons
```

Expected:
- 当前脚本还不存在，npm 报错 `Missing script: "generate:pwa-icons"`

- [ ] **Step 3: 增加图标生成脚本、构建串联和 HTML 元信息**

把 `package.json` 改成：

```json
{
  "name": "trae-project",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "generate:pwa-icons": "node scripts/generate-pwa-icons.mjs",
    "build": "npm run generate:pwa-icons && tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "check": "tsc -b --noEmit",
    "serve:dist": "node scripts/serve-dist.mjs",
    "package:portable": "npm run build && node scripts/make-portable-release.mjs"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.3.0",
    "tailwind-merge": "^3.0.2",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@eslint/js": "^9.25.0",
    "@types/node": "^22.15.30",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "babel-plugin-react-dev-locator": "^1.0.0",
    "postcss": "^8.5.3",
    "sharp": "^0.33.5",
    "tailwindcss": "^3.4.17",
    "eslint": "^9.25.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^16.0.0",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.30.1",
    "vite": "^6.3.5",
    "vite-plugin-pwa": "^0.20.5",
    "vite-plugin-trae-solo-badge": "^1.0.0",
    "vite-tsconfig-paths": "^5.1.4"
  }
}
```

在 `scripts/generate-pwa-icons.mjs` 写入：

```js
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = resolve(PROJECT_ROOT, "public");
const SOURCE_ICON = resolve(PUBLIC_DIR, "favicon.svg");

const targets = [
  { file: "apple-touch-icon.png", size: 180 },
  { file: "pwa-192x192.png", size: 192 },
  { file: "pwa-512x512.png", size: 512 },
  { file: "maskable-512x512.png", size: 512 },
];

const svgBuffer = await readFile(SOURCE_ICON);

await Promise.all(
  targets.map(({ file, size }) =>
    sharp(svgBuffer, { density: size >= 512 ? 384 : 144 })
      .resize(size, size)
      .png()
      .toFile(resolve(PUBLIC_DIR, file)),
  ),
);

console.log(
  `Generated PWA icons: ${targets.map(target => target.file).join(", ")}`,
);
```

把 `index.html` 改成：

```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0A0B0D" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="HR考勤" />
    <title>企业员工考勤系统</title>
    <script type="module">
      if (import.meta.hot?.on) {
        import.meta.hot.on("vite:error", (error) => {
          if (error.err) {
            console.error(
              [error.err.message, error.err.frame].filter(Boolean).join("\n"),
            );
          }
        });
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 运行图标生成与构建验证**

Run:

```bash
npm install -D sharp
npm run generate:pwa-icons
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/pwaIconFiles.test.js
npm run build
```

Expected:
- `public/` 下出现 4 个 PNG 图标
- `pwaIconFiles.test.js` 通过
- `npm run build` 继续通过

---

### Task 4: 把中泰双语安装说明纳入便携发布包

**Files:**
- Create: `docs/mobile-install-zh.md`
- Create: `docs/mobile-install-th.md`
- Create: `tests/portableReleaseInstallDocs.test.ts`
- Modify: `scripts/make-portable-release.mjs`

- [ ] **Step 1: 写失败测试，锁定发布包中的安装说明**

在 `tests/portableReleaseInstallDocs.test.ts` 写入：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE_DIR = resolve(process.cwd(), "发布版", "企业员工考勤系统_局域网共享版");

test("portable release includes chinese and thai mobile install guides", () => {
  const zhPath = resolve(RELEASE_DIR, "mobile-install-zh.md");
  const thPath = resolve(RELEASE_DIR, "mobile-install-th.md");
  const readmePath = resolve(RELEASE_DIR, "使用说明.txt");

  assert.equal(existsSync(zhPath), true);
  assert.equal(existsSync(thPath), true);
  assert.equal(existsSync(readmePath), true);

  const readme = readFileSync(readmePath, "utf8");
  assert.match(readme, /mobile-install-zh\.md/);
  assert.match(readme, /mobile-install-th\.md/);
});
```

- [ ] **Step 2: 先运行打包验证，确认当前失败**

Run:

```bash
npm run package:portable
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/portableReleaseInstallDocs.test.js
```

Expected:
- `package:portable` 可以成功
- `portableReleaseInstallDocs.test.js` 失败，说明文档不存在

- [ ] **Step 3: 添加中文/泰文安装说明并更新打包脚本**

在 `docs/mobile-install-zh.md` 写入：

```md
# HR 系统手机安装说明（中文）

## 使用前提

- 手机和主电脑连接同一个 Wi-Fi 或局域网
- 主电脑已经双击启动局域网共享版
- 使用期间不要关闭主电脑上的黑色窗口

## 打开系统

1. 让管理员提供最新地址，例如 `http://192.168.1.107:5177/`
2. 在手机浏览器打开这个地址
3. 进入登录页后再进行安装

## Android 安装步骤

1. 使用 `Chrome` 打开系统
2. 点击浏览器菜单
3. 选择“安装应用”或“添加到主屏幕”
4. 安装完成后，从手机桌面点击图标进入

## iPhone 安装步骤

1. 使用 `Safari` 打开系统
2. 点击底部“分享”
3. 选择“添加到主屏幕”
4. 回到桌面点击图标进入

## 注意事项

- 如果电脑 IP 或端口变化，需要重新使用最新地址打开一次
- 如果手机拍照打卡，请允许浏览器使用相机
- 如果页面打不开，请先确认网络一致，再联系管理员获取最新地址
```

在 `docs/mobile-install-th.md` 写入：

```md
# คู่มือการติดตั้งระบบ HR บนมือถือ

## เงื่อนไขก่อนใช้งาน

- โทรศัพท์มือถือและคอมพิวเตอร์หลักต้องเชื่อมต่อ Wi-Fi หรือเครือข่ายวงเดียวกัน
- คอมพิวเตอร์หลักต้องเปิดระบบแบบแชร์ในเครือข่ายแล้ว
- ระหว่างใช้งาน ห้ามปิดหน้าต่างสีดำบนคอมพิวเตอร์หลัก

## วิธีเปิดระบบ

1. ขอที่อยู่ล่าสุดจากผู้ดูแล เช่น `http://192.168.1.107:5177/`
2. เปิดลิงก์นี้ในเบราว์เซอร์มือถือ
3. เมื่อเข้าสู่หน้าเข้าสู่ระบบแล้วจึงทำการติดตั้งลงหน้าจอหลัก

## วิธีติดตั้งบน Android

1. เปิดระบบด้วย `Chrome`
2. แตะเมนูของเบราว์เซอร์
3. เลือก “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก”
4. เมื่อติดตั้งเสร็จ ให้แตะไอคอนบนหน้าจอหลักเพื่อเข้าใช้งาน

## วิธีติดตั้งบน iPhone

1. เปิดระบบด้วย `Safari`
2. แตะปุ่ม “แชร์”
3. เลือก “เพิ่มไปยังหน้าจอหลัก”
4. กลับไปที่หน้าจอหลักแล้วแตะไอคอนเพื่อเข้าใช้งาน

## ข้อควรระวัง

- หาก IP หรือพอร์ตของคอมพิวเตอร์เปลี่ยน ต้องเปิดด้วยลิงก์ล่าสุดอีกครั้ง
- หากใช้การตอกบัตรด้วยการถ่ายรูป กรุณาอนุญาตการใช้กล้อง
- หากเปิดหน้าเว็บไม่ได้ ให้ตรวจสอบว่าอยู่ในเครือข่ายเดียวกันก่อน แล้วติดต่อผู้ดูแลเพื่อขอลิงก์ล่าสุด
```

把 `scripts/make-portable-release.mjs` 改成：

```js
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const DIST_DIR = resolve(PROJECT_ROOT, "dist");
const SERVER_SCRIPT = resolve(PROJECT_ROOT, "scripts", "serve-dist.mjs");
const NODE_RUNTIME_DIR = resolve(PROJECT_ROOT, ".tools", "node-v20.20.2-win-x64");
const RELEASE_ROOT = resolve(PROJECT_ROOT, "发布版");
const RELEASE_DIR = resolve(RELEASE_ROOT, "企业员工考勤系统_局域网共享版");
const MOBILE_INSTALL_ZH = resolve(PROJECT_ROOT, "docs", "mobile-install-zh.md");
const MOBILE_INSTALL_TH = resolve(PROJECT_ROOT, "docs", "mobile-install-th.md");

function ensureExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`缺少${label}：${path}`);
  }
}

function withCrlf(text) {
  return text.replace(/\n/g, "\r\n");
}

function createLauncher({
  title,
  port = 5175,
  firewallMessage = "",
  firewallRule = "",
}) {
  return withCrlf(`@echo off
setlocal
title ${title}
cd /d "%~dp0"
set "PORT=${port}"
set "HOST=0.0.0.0"
set "OPEN_BROWSER=1"

if not exist "runtime\\node\\node.exe" (
  echo 未找到便携 Node 运行环境，请确认整个发布文件夹已完整复制。
  goto end
)

if not exist "dist\\index.html" (
  echo 未找到正式版网页文件，请确认 dist 目录完整。
  goto end
)

echo.
echo ==========================================
echo 正在启动考勤系统正式版
echo 本机默认地址: http://localhost:%PORT%/
echo 其他电脑访问: http://你的IPv4:%PORT%/
echo 如果端口被占用，会自动切换到下一个可用端口
echo ==========================================
echo.
${firewallMessage ? `${firewallMessage}\n` : ""}${firewallRule ? `${firewallRule}\n` : ""}echo 当前电脑 IPv4 地址如下：
ipconfig | findstr /i "IPv4"
echo.

call "runtime\\node\\node.exe" "scripts\\serve-dist.mjs"

:end
pause
endlocal
`);
}

const readmeText = withCrlf(`企业员工考勤系统 - 局域网共享版
================================

这个文件夹已经是可直接拷走使用的发布版。
只要完整复制整个“企业员工考勤系统_局域网共享版”文件夹，到别的 Windows 电脑也可以直接运行。

使用方法
1. 双击“启动局域网共享版.bat”
2. 稍等几秒，浏览器会自动打开系统页面
3. 把窗口里显示的局域网地址发给其他电脑或手机访问
4. 使用期间请不要关闭黑色窗口
5. 停止服务时，关闭黑色窗口或按 Ctrl+C

手机安装说明
- 中文：mobile-install-zh.md
- 泰文：mobile-install-th.md

如果其他设备打不开
1. 先确保所有设备连接的是同一个局域网
2. 试试“启动局域网共享版_自动放行防火墙.bat”
3. 或使用“启动局域网共享版_防火墙提示.bat”，按提示允许访问

说明
- 默认端口从 5175 开始
- 如果端口被占用，会自动切换到下一个可用端口
- 浏览器会自动打开正确端口地址
- 本发布版已内置便携 Node 运行环境，不依赖本机安装 Node 或 npm
`);

async function main() {
  ensureExists(DIST_DIR, "正式版 dist 目录");
  ensureExists(SERVER_SCRIPT, "静态服务脚本");
  ensureExists(NODE_RUNTIME_DIR, "便携 Node 目录");
  ensureExists(MOBILE_INSTALL_ZH, "中文手机安装说明");
  ensureExists(MOBILE_INSTALL_TH, "泰文手机安装说明");

  await rm(RELEASE_DIR, { recursive: true, force: true });
  await mkdir(resolve(RELEASE_DIR, "scripts"), { recursive: true });
  await mkdir(resolve(RELEASE_DIR, "runtime"), { recursive: true });

  await cp(DIST_DIR, resolve(RELEASE_DIR, "dist"), { recursive: true });
  await cp(SERVER_SCRIPT, resolve(RELEASE_DIR, "scripts", "serve-dist.mjs"));
  await cp(NODE_RUNTIME_DIR, resolve(RELEASE_DIR, "runtime", "node"), { recursive: true });
  await cp(MOBILE_INSTALL_ZH, resolve(RELEASE_DIR, "mobile-install-zh.md"));
  await cp(MOBILE_INSTALL_TH, resolve(RELEASE_DIR, "mobile-install-th.md"));

  await writeFile(
    resolve(RELEASE_DIR, "启动局域网共享版.bat"),
    createLauncher({
      title: "考勤系统-局域网共享正式版",
    }),
    "utf8",
  );

  await writeFile(
    resolve(RELEASE_DIR, "启动局域网共享版_自动放行防火墙.bat"),
    createLauncher({
      title: "考勤系统-局域网共享正式版（自动放行防火墙）",
      firewallRule: 'netsh advfirewall firewall add rule name="HR-System-5175" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>nul',
    }),
    "utf8",
  );

  await writeFile(
    resolve(RELEASE_DIR, "启动局域网共享版_防火墙提示.bat"),
    createLauncher({
      title: "考勤系统-局域网共享正式版（防火墙提示）",
      firewallMessage: [
        "echo 如果弹出 Windows 防火墙提示：",
        "echo 请点击“允许访问”",
        "echo 并勾选“专用网络”",
        "echo.",
      ].join("\n"),
    }),
    "utf8",
  );

  await writeFile(
    resolve(RELEASE_DIR, "启动考勤系统.bat"),
    createLauncher({
      title: "考勤系统启动器（正式版）",
    }),
    "utf8",
  );

  await writeFile(resolve(RELEASE_DIR, "使用说明.txt"), readmeText, "utf8");

  console.log("");
  console.log("==========================================");
  console.log("可拷走发布版已生成：");
  console.log(RELEASE_DIR);
  console.log("可直接复制整个文件夹到其他 Windows 电脑使用。");
  console.log("==========================================");
  console.log("");
}

main().catch(error => {
  console.error("生成发布版失败：", error);
  process.exit(1);
});
```

- [ ] **Step 4: 重新打包并确认说明文档进入发布版**

Run:

```bash
npm run package:portable
npm exec tsc -- -p tsconfig.tests.json --pretty false
node --test .tmp-tests/tests/portableReleaseInstallDocs.test.js
```

Expected:
- 发布版文件夹重新生成
- `mobile-install-zh.md` 与 `mobile-install-th.md` 出现在发布版根目录
- `portableReleaseInstallDocs.test.js` 通过

---

### Task 5: 做完整验证并形成交付检查表

**Files:**
- No new files
- Reuse: `dist/`, `发布版/企业员工考勤系统_局域网共享版/`

- [ ] **Step 1: 运行完整测试编译**

Run:

```bash
npm exec tsc -- -p tsconfig.tests.json --pretty false
```

Expected:
- 测试编译通过，无 TypeScript 报错

- [ ] **Step 2: 运行全部 node:test 回归**

Run:

```bash
node --test .tmp-tests/tests/clockPunchState.test.js .tmp-tests/tests/overtimeMonth.test.js .tmp-tests/tests/persistClockEvents.test.js .tmp-tests/tests/photoUpload.test.js .tmp-tests/tests/seedDb.test.js .tmp-tests/tests/pwaConfig.test.js .tmp-tests/tests/pwaBuildArtifacts.test.js .tmp-tests/tests/pwaIconFiles.test.js .tmp-tests/tests/portableReleaseInstallDocs.test.js
```

Expected:
- 所有测试通过
- 输出中没有 `FAIL`

- [ ] **Step 3: 重跑正式构建与便携打包**

Run:

```bash
npm run build
npm run package:portable
```

Expected:
- `dist/manifest.webmanifest`、`dist/sw.js` 存在
- `发布版/企业员工考勤系统_局域网共享版/` 更新完成

- [ ] **Step 4: 做手动验收**

按下面顺序人工检查：

1. 在电脑浏览器打开 `http://localhost:<实际端口>/`
2. 访问 `http://localhost:<实际端口>/manifest.webmanifest`，确认返回 JSON
3. Android Chrome：
   - 打开系统
   - 检查菜单中存在“安装应用”或“添加到主屏幕”
   - 安装后从桌面启动
4. iPhone Safari：
   - 打开系统
   - 执行“分享 -> 添加到主屏幕”
   - 从桌面启动
5. 安装后回归以下页面：
   - 员工登录页
   - 员工打卡页
   - 员工请假/加班页
   - 员工工资页
   - 管理员登录页
   - 管理员审批页

Expected:
- Android 与 iPhone 都能把系统添加到桌面
- 桌面启动后以独立窗口打开
- 已有业务页面不回归出错

---

## Self-Review

### Spec coverage

- PWA manifest：Task 1、Task 2 覆盖
- Service Worker：Task 2 覆盖
- 图标与安装元信息：Task 3 覆盖
- 中文/泰文安装说明：Task 4 覆盖
- 发布版保留与增强：Task 4、Task 5 覆盖
- Android / iPhone 验收：Task 5 覆盖

### Placeholder scan

- 无 `TODO` / `TBD`
- 所有任务都给出了明确文件路径、代码或命令

### Type consistency

- `createWebManifest()` 在 Task 1 定义并在 Task 2 复用
- 图标文件名在 Task 1、Task 3、Task 4、Task 5 中保持一致
- 发布版文档文件名在 Task 4 与 Task 5 中保持一致
