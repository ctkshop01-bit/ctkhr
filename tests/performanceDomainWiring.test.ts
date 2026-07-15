import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN_PATH = resolve(process.cwd(), "src", "types", "domain.ts");
const SEED_PATH = resolve(process.cwd(), "src", "data", "seedDb.ts");

test("domain and seed db expose performance structures", () => {
  const domain = readFileSync(DOMAIN_PATH, "utf8");
  const seed = readFileSync(SEED_PATH, "utf8");

  assert.match(domain, /export type TaskStatus = "open" \| "submitted" \| "confirmed" \| "returned" \| "overdue" \| "closed";/);
  assert.match(domain, /export interface PerformanceEventItem/);
  assert.match(domain, /export interface PerformanceMonthlySummaryItem/);
  assert.match(domain, /export interface PerformanceWarningItem/);
  assert.match(domain, /export interface PerformanceSettings/);
  assert.match(domain, /performanceEvents: PerformanceEventItem\[];/);
  assert.match(domain, /performanceMonthlySummaries: PerformanceMonthlySummaryItem\[];/);
  assert.match(domain, /performanceWarnings: PerformanceWarningItem\[];/);
  assert.match(domain, /performanceSettings: PerformanceSettings;/);
  assert.match(seed, /performanceEvents:\s*\[\]/);
  assert.match(seed, /performanceMonthlySummaries:\s*\[\]/);
  assert.match(seed, /performanceWarnings:\s*\[\]/);
  assert.match(seed, /performanceSettings:/);
});
