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

test("db store routes announcement and task actions through shared commands", () => {
  const source = readFileSync(DB_STORE_PATH, "utf8");
  assert.match(source, /type:\s*"markAnnouncementRead"/);
  assert.match(source, /type:\s*"upsertAnnouncement"/);
  assert.match(source, /type:\s*"deleteAnnouncement"/);
  assert.match(source, /type:\s*"upsertTask"/);
  assert.match(source, /type:\s*"deleteTask"/);
  assert.match(source, /type:\s*"toggleTaskDone"/);
});

test("shared api client exists", () => {
  const source = readFileSync(API_PATH, "utf8");
  assert.match(source, /export async function sharedApiLogin/);
  assert.match(source, /export async function loadSharedSnapshot/);
  assert.match(source, /export async function importLocalDbToServer/);
});

test("shared api reads always bypass browser cache", () => {
  const source = readFileSync(API_PATH, "utf8");
  assert.match(source, /fetch\("\/api\/bootstrap",\s*\{[\s\S]*cache:\s*"no-store"/);
  assert.match(source, /fetch\("\/api\/db\/snapshot",\s*\{[\s\S]*cache:\s*"no-store"/);
});
