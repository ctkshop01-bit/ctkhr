import test from "node:test";
import assert from "node:assert/strict";
import { monthISOFromDateTimeISO } from "../src/utils/core.js";

test("keeps the written month for overtime timestamps with timezone offsets", () => {
  assert.equal(monthISOFromDateTimeISO("2026-06-01T00:30:00+07:00"), "2026-06");
  assert.equal(monthISOFromDateTimeISO("2026-06-30T23:30:00-05:00"), "2026-06");
});
