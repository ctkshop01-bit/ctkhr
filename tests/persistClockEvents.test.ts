import test from "node:test";
import assert from "node:assert/strict";
import { prepareClockEventsForPersist } from "../src/stores/persistClockEvents.js";

test("keeps photos only for the latest persisted clock events", () => {
  const events = Array.from({ length: 10 }, (_, index) => ({
    id: `clk_${index + 1}`,
    userId: "u1",
    type: "in" as const,
    timeISO: `2026-06-22T0${index}:00:00+07:00`,
    photoDataUrl: `data:image/jpeg;base64,photo_${index + 1}`,
  }));

  const persisted = prepareClockEventsForPersist(events);

  assert.equal(persisted[0].photoDataUrl, undefined);
  assert.equal(persisted[1].photoDataUrl, undefined);
  assert.equal(persisted[2].photoDataUrl, "data:image/jpeg;base64,photo_3");
  assert.equal(persisted[9].photoDataUrl, "data:image/jpeg;base64,photo_10");
});

test("drops oversized photo payloads but keeps the clock event itself", () => {
  const persisted = prepareClockEventsForPersist([
    {
      id: "clk_1",
      userId: "u1",
      type: "ot_end" as const,
      timeISO: "2026-06-22T03:43:00+07:00",
      photoDataUrl: `data:image/jpeg;base64,${"a".repeat(200_000)}`,
    },
  ]);

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].id, "clk_1");
  assert.equal(persisted[0].photoDataUrl, undefined);
});
