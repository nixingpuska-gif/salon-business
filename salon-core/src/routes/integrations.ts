import { Request, Response, Router } from "express";
import { createBooking } from "../services/calcom.js";
import { upsertCustomer } from "../services/erxes.js";
import { config } from "../config.js";
import { getTenantConfig } from "../services/tenantConfig.js";
import { resolveTenantId } from "../services/tenantResolve.js";
import { idempotency } from "../services/idempotency.js";
import { rateLimit } from "../services/rateLimit.js";
import { apiKeyAuth } from "../middleware/apiAuth.js";

export const integrationsRouter = Router();

const notImplemented = (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented" });
};

const validateBookingBody = (body: Record<string, unknown>) => {
  const hasEventTypeId = Boolean(body.eventTypeId);
  const hasSlug =
    Boolean(body.eventTypeSlug) && (Boolean(body.username) || Boolean(body.teamSlug));
  if (!hasEventTypeId && !hasSlug) {
    return "eventTypeId or eventTypeSlug + username/teamSlug is required";
  }
  if (!body.start) {
    return "start is required";
  }

  const responses = body.responses as Record<string, unknown> | undefined;
  if (responses && typeof responses !== "object") {
    return "responses must be an object";
  }
  const attendee = body.attendee as Record<string, unknown> | undefined;
  if (attendee && typeof attendee !== "object") {
    return "attendee must be an object";
  }

  const name = (responses?.name as string | undefined) || (attendee?.name as string | undefined);
  const email = (responses?.email as string | undefined) || (attendee?.email as string | undefined);
  const timeZone =
    (body.timeZone as string | undefined) ||
    (responses?.timeZone as string | undefined) ||
    (attendee?.timeZone as string | undefined);

  if (!name || !email) {
    return "attendee or responses must include name and email";
  }
  if (!timeZone) {
    return "timeZone is required";
  }
  return null;
};

integrationsRouter.post("/calcom/bookings", apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const validationError = validateBookingBody(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const tenantId = resolveTenantId(req, body);
    const tenantConfig = await getTenantConfig(tenantId);
    if (config.security.strictTenantConfig && !tenantConfig) {
      return res.status(401).json({ error: "Unknown tenant" });
    }
    const idempotencyKey = (body.idempotencyKey as string) || "";
    if (!idempotencyKey) {
      return res.status(400).json({ error: "idempotencyKey is required" });
    }

    const idempotent = await idempotency.checkAndSet(
      `idemp:${tenantId}:${idempotencyKey}`,
      24 * 60 * 60,
    );
    if (!idempotent) {
      return res.status(409).json({ error: "Duplicate request" });
    }

    const rate = await rateLimit.consume({
      key: `tenant:${tenantId}:tx`,
      limit: 3000,
      windowSeconds: 24 * 60 * 60,
    });
    if (!rate.allowed) {
      return res.status(429).json({ error: "Rate limit exceeded", resetInSeconds: rate.resetInSeconds });
    }

    const result = await createBooking(body as Parameters<typeof createBooking>[0], tenantConfig?.calcom);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ error: message });
  }
});

const validateContactBody = (body: Record<string, unknown>) => {
  if (!body.primaryPhone && !body.primaryEmail) {
    return "primaryPhone or primaryEmail is required";
  }
  return null;
};

integrationsRouter.post("/erxes/contacts", apiKeyAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const validationError = validateContactBody(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const tenantId = resolveTenantId(req, body);
    const tenantConfig = await getTenantConfig(tenantId);
    if (config.security.strictTenantConfig && !tenantConfig) {
      return res.status(401).json({ error: "Unknown tenant" });
    }
    const rate = await rateLimit.consume({
      key: `tenant:${tenantId}:mk`,
      limit: 1500,
      windowSeconds: 24 * 60 * 60,
    });
    if (!rate.allowed) {
      return res.status(429).json({ error: "Rate limit exceeded", resetInSeconds: rate.resetInSeconds });
    }

    const result = await upsertCustomer({
      primaryPhone: body.primaryPhone as string | undefined,
      primaryEmail: body.primaryEmail as string | undefined,
      firstName: body.firstName as string | undefined,
      lastName: body.lastName as string | undefined,
      state: body.state as string | undefined,
      brandId: (body.brandId as string | undefined) || tenantConfig?.erxes?.brandId,
      erxes: tenantConfig?.erxes,
    });

    return res.status(200).json({ customer: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ error: message });
  }
});
