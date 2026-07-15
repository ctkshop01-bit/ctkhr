import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN_PATH = resolve(process.cwd(), "src", "types", "domain.ts");
const SEED_PATH = resolve(process.cwd(), "src", "data", "seedDb.ts");

test("task review log types and seed defaults are wired", () => {
  const domain = readFileSync(DOMAIN_PATH, "utf8");
  const seed = readFileSync(SEED_PATH, "utf8");

  assert.match(domain, /export interface TaskReviewLogItem/);
  assert.match(domain, /action:\s*"submit" \| "confirm" \| "return";/);
  assert.match(domain, /taskReviewLogs: TaskReviewLogItem\[];/);
  assert.match(seed, /taskReviewLogs:\s*\[\]/);
});
