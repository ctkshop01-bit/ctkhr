import test from "node:test";
import assert from "node:assert/strict";
import { shouldUseOriginalImageFile } from "../src/components/common/photoUpload.js";

test("uses original file for heic and heif uploads", () => {
  assert.equal(shouldUseOriginalImageFile({ type: "image/heic", name: "clock.heic" }), true);
  assert.equal(shouldUseOriginalImageFile({ type: "image/heif", name: "clock.heif" }), true);
  assert.equal(shouldUseOriginalImageFile({ type: "", name: "clock.HEIC" }), true);
});

test("keeps compression path for normal jpg and png uploads", () => {
  assert.equal(shouldUseOriginalImageFile({ type: "image/jpeg", name: "clock.jpg" }), false);
  assert.equal(shouldUseOriginalImageFile({ type: "image/png", name: "clock.png" }), false);
});
