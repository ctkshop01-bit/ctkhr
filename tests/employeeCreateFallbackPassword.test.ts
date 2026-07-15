import test from "node:test";
import assert from "node:assert/strict";
import { createSeedDb } from "../src/data/seedDb.js";
import { useDbStore } from "../src/stores/dbStore.js";

test("new employee save still reaches shared command when browser hashing is unavailable", async () => {
  const seed = createSeedDb();
  const originalFetch = globalThis.fetch;
  const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const commands: Array<{ type?: string; payload?: { username?: string; passwordHash?: string } }> = [];
  const nextDb = structuredClone(seed);

  try {
    useDbStore.setState(seed);

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {},
    });

    globalThis.fetch = async (_input, init) => {
      const command = JSON.parse(String(init?.body ?? "{}")) as { type?: string; payload?: { username?: string; passwordHash?: string } };
      commands.push(command);

      const created = command.payload;
      assert.ok(created);
      nextDb.users = [created as never, ...nextDb.users];

      return new Response(
        JSON.stringify({
          ok: true,
          db: nextDb,
          result: created,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const created = await useDbStore.getState().upsertEmployee({
      id: "usr_new",
      username: "ctk05",
      name: "xiaoxi",
      department: "ceo",
      title: "ceo",
      baseSalaryCents: 1500000,
      overtimeHourlyRateCents: 4999,
      employmentType: "regular",
      monthlyPaidLeaveDays: 4,
      status: "active",
    });

    assert.equal(commands.length, 1);
    assert.equal(commands[0].type, "upsertEmployee");
    assert.equal(created.username, "ctk05");
    assert.equal(created.passwordHash, "123456");
  } finally {
    useDbStore.setState(createSeedDb());
    globalThis.fetch = originalFetch;
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
    }
  }
});
