import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUESTS_PATH = resolve(process.cwd(), "src", "pages", "employee", "Requests.tsx");
const TRANSLATIONS_PATH = resolve(process.cwd(), "src", "i18n", "translations.ts");

test("employee requests page surfaces submit errors instead of failing silently", () => {
  const requestsSource = readFileSync(REQUESTS_PATH, "utf8");

  assert.match(requestsSource, /const \[submitError, setSubmitError\] = useState<string \| null>\(null\)/);
  assert.match(requestsSource, /setSubmitError\(null\)/);
  assert.match(requestsSource, /catch \(error\)/);
  assert.match(requestsSource, /setSubmitError\(getRequestSubmitErrorKey\(error\)\)/);
  assert.match(requestsSource, /submitError \? <div className="text-sm text-rose-300">\{t\(submitError\)\}<\/div> : null/);
});

test("employee request translations include reviewer-not-configured feedback", () => {
  const translationsSource = readFileSync(TRANSLATIONS_PATH, "utf8");

  assert.match(translationsSource, /"employee\.requests\.submitErrorReviewerNotConfigured": "当前审批人未配置，请联系管理员"/);
  assert.match(translationsSource, /"employee\.requests\.submitErrorGeneric": "提交失败，请稍后重试"/);
  assert.match(translationsSource, /"employee\.requests\.submitErrorReviewerNotConfigured": "ยังไม่ได้ตั้งค่าผู้อนุมัติ โปรดติดต่อผู้ดูแลระบบ"/);
  assert.match(translationsSource, /"employee\.requests\.submitErrorGeneric": "ส่งคำขอไม่สำเร็จ โปรดลองอีกครั้ง"/);
});
