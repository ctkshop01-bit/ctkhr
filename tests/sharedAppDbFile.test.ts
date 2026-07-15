import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
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

test("loadSharedDb treats null placeholder file as uninitialized shared db", async () => {
  const root = await mkdtemp(join(tmpdir(), "hr-shared-db-"));
  const filePath = join(root, "app-db.json");
  await writeFile(filePath, "null\n", "utf8");

  const loaded = await loadSharedDb(filePath);

  assert.equal(loaded.initialized, false);
  assert.equal(loaded.db, null);
});
