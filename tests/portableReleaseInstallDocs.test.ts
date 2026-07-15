import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE_DIR = resolve(process.cwd(), "发布版", "企业员工考勤系统_局域网共享版");
const RELEASE_SCRIPT_PATH = resolve(process.cwd(), "scripts", "make-portable-release.mjs");
const ROOT_LAUNCHER_PATH = resolve(process.cwd(), "启动局域网共享版.bat");

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

test("portable release script packages shared server files and shared db", () => {
  const source = readFileSync(RELEASE_SCRIPT_PATH, "utf8");
  assert.match(source, /data[\\/]+app-db\.json/);
  assert.match(source, /scripts[\\/]+server/);
  assert.match(source, /共享数据|共享主数据|主数据/);
});

test("root lan launcher prompts for shared data service startup", () => {
  const launcher = readFileSync(ROOT_LAUNCHER_PATH, "utf8");
  assert.match(launcher, /共享数据服务/);
  assert.match(launcher, /共享主数据/);
});
