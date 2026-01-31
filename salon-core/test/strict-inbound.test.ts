import assert from "node:assert/strict";
import { test } from "node:test";

const { _test } = await import("../src/routes/webhooks.js");
const { config } = await import("../src/config.js");

const createMockRes = () => {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
};

test("strict inbound schema rejects invalid payload", async () => {
  const prevStrict = config.validation.strictInboundSchema;
  const prevTenant = config.security.strictTenantConfig;
  const prevSignature = config.security.strictWebhookSignature;

  config.validation.strictInboundSchema = true;
  config.security.strictTenantConfig = false;
  config.security.strictWebhookSignature = false;

  const req = {
    body: { message: { from: { id: 1 } } },
    header: () => "",
    params: {},
    query: {},
  };
  const res = createMockRes();

  try {
    await _test.handleInbound(req as any, res as any, "telegram");
  } finally {
    config.validation.strictInboundSchema = prevStrict;
    config.security.strictTenantConfig = prevTenant;
    config.security.strictWebhookSignature = prevSignature;
  }

  assert.equal(res.statusCode, 400);
  assert.equal((res as any).body?.error, "Invalid inbound payload");
});
