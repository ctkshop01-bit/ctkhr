import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPROVAL_SETTINGS_PATH = resolve(process.cwd(), "src", "pages", "admin", "ApprovalSettings.tsx");

test("approval settings page lets admins edit and save active reviewers", () => {
  const source = readFileSync(APPROVAL_SETTINGS_PATH, "utf8");

  assert.match(source, /const activeReviewerOptions = useMemo/);
  assert.match(source, /user\.status === "active"/);
  assert.match(source, /db\.updateApprovalSettings\(/);
  assert.match(source, /<select/);
  assert.match(source, /type="button"/);
  assert.match(source, /admin\.approvalSettings\.save/);
});
