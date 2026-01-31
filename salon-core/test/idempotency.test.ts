import assert from "node:assert/strict";
import { test } from "node:test";
import { createIdempotency } from "../src/services/idempotency.js";

test("idempotency rejects duplicate requests", async (t) => {
  let calls = 0;
  const fakeRedis = {
    set: async () => {
      calls += 1;
      return calls === 1 ? "OK" : null;
    },
  };

  const idempotency = createIdempotency(() => fakeRedis);
  const first = await idempotency.checkAndSet("idemp:test", 10);
  const second = await idempotency.checkAndSet("idemp:test", 10);

  assert.equal(first, true);
  assert.equal(second, false);
});
