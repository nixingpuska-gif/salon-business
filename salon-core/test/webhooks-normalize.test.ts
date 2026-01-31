import assert from "node:assert/strict";
import { test } from "node:test";

const { _test } = await import("../src/routes/webhooks.js");

test("normalizeInboundBody marks missing telegram fields", () => {
  const body = { message: { from: { id: 1 } } };
  const result = _test.normalizeInboundBody("telegram", body);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e: string) => e.includes("telegram: missing message.text")));
});

test("normalizeInboundBody extracts whatsapp text and sender", () => {
  const body = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [{ text: { body: "Hi" }, from: "79990001122", id: "msg-1" }],
              contacts: [{ wa_id: "79990001122", profile: { name: "Test User" } }],
            },
          },
        ],
      },
    ],
  };
  const result = _test.normalizeInboundBody("whatsapp", body);
  assert.equal(result.valid, true);
  assert.equal(result.body.message, "Hi");
  assert.equal(result.body.messageId, "msg-1");
  assert.equal(result.body.phone, "79990001122");
});
