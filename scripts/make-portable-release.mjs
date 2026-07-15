import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const DIST_DIR = resolve(PROJECT_ROOT, "dist");
const SERVER_SCRIPT = resolve(PROJECT_ROOT, "scripts", "serve-dist.mjs");
const SERVER_DIR = resolve(PROJECT_ROOT, "scripts", "server");
const NODE_RUNTIME_DIR = resolve(PROJECT_ROOT, ".tools", "node-v20.20.2-win-x64");
const RELEASE_ROOT = resolve(PROJECT_ROOT, "发布版");
const RELEASE_DIR = resolve(RELEASE_ROOT, "企业员工考勤系统_局域网共享版");
const MOBILE_INSTALL_ZH = resolve(PROJECT_ROOT, "docs", "mobile-install-zh.md");
const MOBILE_INSTALL_TH = resolve(PROJECT_ROOT, "docs", "mobile-install-th.md");
const SHARED_DATA_FILE = resolve(PROJECT_ROOT, "data", "app-db.json");
const UNINITIALIZED_SHARED_DB = "null\n";

function ensureExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`缺少${label}：${path}`);
  }
}

function withCrlf(text) {
  return text.replace(/\n/g, "\r\n");
}

async function copyPortableNodeRuntime() {
  const runtimeTarget = resolve(RELEASE_DIR, "runtime", "node");
  const runtimeNodeExe = resolve(runtimeTarget, "node.exe");

  if (existsSync(runtimeNodeExe)) {
    try {
      await cp(NODE_RUNTIME_DIR, runtimeTarget, { recursive: true });
      return;
    } catch (error) {
      if (error && typeof error === "object" && error.code === "EBUSY") {
        console.warn("发布版运行时正在被占用，保留现有 runtime\\node 内容。");
        return;
      }
      throw error;
    }
  }

  await cp(NODE_RUNTIME_DIR, runtimeTarget, { recursive: true });
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
echo 正在启动考勤系统共享数据服务
echo 本机默认地址: http://localhost:%PORT%/
echo 其他电脑访问: http://你的IPv4:%PORT%/
echo 如果端口被占用，会自动切换到下一个可用端口
echo 首次使用时，请在主机电脑浏览器中导入当前旧数据作为共享主数据
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
发布版已包含共享数据服务脚本（scripts\\server）和共享数据库文件（data\\app-db.json）。

使用方法
1. 双击“启动局域网共享版.bat”
2. 稍等几秒，浏览器会自动打开系统页面
3. 首次使用时，请在主机电脑浏览器中导入当前旧数据作为共享主数据
4. 把窗口里显示的局域网地址发给其他电脑或手机访问
5. 使用期间请不要关闭黑色窗口
6. 停止服务时，关闭黑色窗口或按 Ctrl+C

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
- 共享主数据保存在 data\\app-db.json 中
`);

async function main() {
  ensureExists(DIST_DIR, "正式版 dist 目录");
  ensureExists(SERVER_SCRIPT, "共享服务启动脚本");
  ensureExists(SERVER_DIR, "共享服务脚本目录");
  ensureExists(NODE_RUNTIME_DIR, "便携 Node 目录");
  ensureExists(MOBILE_INSTALL_ZH, "中文手机安装说明");
  ensureExists(MOBILE_INSTALL_TH, "泰文手机安装说明");

  await mkdir(RELEASE_DIR, { recursive: true });
  await mkdir(resolve(RELEASE_DIR, "scripts"), { recursive: true });
  await mkdir(resolve(RELEASE_DIR, "scripts", "server"), { recursive: true });
  await mkdir(resolve(RELEASE_DIR, "runtime"), { recursive: true });
  await mkdir(resolve(RELEASE_DIR, "data"), { recursive: true });

  await cp(DIST_DIR, resolve(RELEASE_DIR, "dist"), { recursive: true });
  await cp(SERVER_SCRIPT, resolve(RELEASE_DIR, "scripts", "serve-dist.mjs"));
  await cp(SERVER_DIR, resolve(RELEASE_DIR, "scripts", "server"), { recursive: true });
  await copyPortableNodeRuntime();
  await cp(MOBILE_INSTALL_ZH, resolve(RELEASE_DIR, "mobile-install-zh.md"));
  await cp(MOBILE_INSTALL_TH, resolve(RELEASE_DIR, "mobile-install-th.md"));
  await writeFile(
    resolve(RELEASE_DIR, "data", "app-db.json"),
    existsSync(SHARED_DATA_FILE) ? await readFile(SHARED_DATA_FILE, "utf8") : UNINITIALIZED_SHARED_DB,
    "utf8",
  );

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
