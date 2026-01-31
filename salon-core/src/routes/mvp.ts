import { Request, Response, Router } from "express";
import multer from "multer";
import { suggestSlots } from "../services/slots.js";
import {
  cancelBookingForService,
  createBookingForService,
  rescheduleBookingForService,
} from "../services/booking.js";
import { config } from "../config.js";
import { getTenantConfig } from "../services/tenantConfig.js";
import { resolveTenantId } from "../services/tenantResolve.js";
import { logEvent } from "../services/logger.js";
import { storeVoiceFile, loadVoiceMetadata } from "../services/voiceStorage.js";
import { detectVoiceIntent } from "../services/voiceIntent.js";
import { transcribeVoiceFile } from "../services/voiceStt.js";
import {
  confirmInventoryDraft,
  consumeInventory,
  createInventoryDraft,
  reconcileInventory,
} from "../services/inventory.js";
import { requestFeedback, submitFeedback } from "../services/feedback.js";
import { getKpiStaff, getKpiSummary } from "../services/kpi.js";
import { createBookingFromVoice } from "../services/voiceBooking.js";
import type {
  BookingCancelRequest,
  BookingCreateRequest,
  BookingRescheduleRequest,
  BookingResponse,
  FeedbackRequest,
  FeedbackSubmitRequest,
  InventoryConfirmRequest,
  InventoryConsumeRequest,
  InventoryIntakeRequest,
  InventoryItemDraft,
  InventoryIntakeResponse,
  InventoryReconcileRequest,
  InventoryReconcileResponse,
  KpiStaffResponse,
  KpiSummaryResponse,
  SendRequest,
  SendResponse,
  SlotSuggestRequest,
  SlotSuggestResponse,
  VoiceBookingRequest,
  VoiceBookingResponse,
  VoiceIntentRequest,
  VoiceIntentResponse,
  VoiceUploadResponse,
} from "../contracts/mvp.js";

export const mvpRouter = Router();

const allowStub = process.env.STUB_MVP_ENDPOINTS === "1";
const uploadVoice = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(1, config.voice.maxSizeMb || 20) * 1024 * 1024,
  },
});
const uploadInventory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(1, config.inventory.maxSizeMb || 20) * 1024 * 1024,
  },
});

const stubOrNotImplemented = <T>(res: Response, body: T) => {
  if (!allowStub) {
    return res.status(501).json({ error: "Not implemented" });
  }
  return res.status(200).json({ ...body, stub: true });
};

const parseItems = (value: unknown): InventoryItemDraft[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as InventoryItemDraft[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as InventoryItemDraft[]) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

mvpRouter.post("/slots/suggest", async (req: Request, res: Response) => {
  const payload = req.body as SlotSuggestRequest;
  if (!payload?.tenantId || !payload?.serviceId || !payload?.preferredTime) {
    return res.status(400).json({ error: "tenantId, serviceId, preferredTime are required" });
  }
  if (allowStub) {
    const now = new Date(payload.preferredTime || Date.now());
    const slot: SlotSuggestResponse = {
      slots: [
        {
          start: now.toISOString(),
          end: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
          score: 1,
          reason: "stub",
        },
      ],
    };
    return res.status(200).json({ ...slot, stub: true });
  }
  try {
    const result = await suggestSlots(payload);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("tenant")) {
      return res.status(401).json({ error: message });
    }
    if (message.includes("required") || message.includes("preferredTime")) {
      return res.status(400).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post("/bookings/create", async (req: Request, res: Response) => {
  const payload = req.body as BookingCreateRequest;
  if (!payload?.tenantId || !payload?.serviceId || !payload?.start || !payload?.client) {
    return res.status(400).json({ error: "tenantId, serviceId, start, client are required" });
  }
  if (allowStub) {
    const response: BookingResponse = {
      bookingId: `stub-${Date.now()}`,
      status: "created",
      start: payload.start,
      end: payload.end,
    };
    return res.status(200).json({ ...response, stub: true });
  }
  try {
    const result = await createBookingForService({
      tenantId: payload.tenantId,
      serviceId: payload.serviceId,
      start: payload.start,
      end: payload.end,
      client: payload.client,
      timeZone: payload.timeZone,
      language: payload.language,
      metadata: payload.metadata,
      idempotencyKey: payload.idempotencyKey,
    });
    return res.status(200).json({
      bookingId: result.bookingId || `calcom-${Date.now()}`,
      status: "created",
      start: result.start,
      end: result.end,
      result: result.result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("tenant") || message.includes("serviceId")) {
      return res.status(401).json({ error: message });
    }
    if (message.includes("required") || message.includes("aligned") || message.includes("start")) {
      return res.status(400).json({ error: message });
    }
    if (message.includes("Duplicate")) {
      return res.status(409).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post("/bookings/reschedule", async (req: Request, res: Response) => {
  const payload = req.body as BookingRescheduleRequest;
  if (!payload?.tenantId || !payload?.bookingId || !payload?.start) {
    return res.status(400).json({ error: "tenantId, bookingId, start are required" });
  }
  if (allowStub) {
    const response: BookingResponse = {
      bookingId: payload.bookingId || `stub-${Date.now()}`,
      status: "rescheduled",
      start: payload.start,
      end: payload.end,
    };
    return res.status(200).json({ ...response, stub: true });
  }
  try {
    const result = await rescheduleBookingForService({
      tenantId: payload.tenantId,
      bookingId: payload.bookingId,
      start: payload.start,
      end: payload.end,
      serviceId: payload.serviceId,
      reason: payload.reason,
      rescheduledBy: payload.rescheduledBy,
      emailVerificationCode: payload.emailVerificationCode,
    });
    return res.status(200).json({
      bookingId: result.bookingId,
      status: "rescheduled",
      start: result.start,
      end: result.end,
      result: result.result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("tenant") || message.includes("serviceId")) {
      return res.status(401).json({ error: message });
    }
    if (message.includes("required") || message.includes("aligned") || message.includes("start")) {
      return res.status(400).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post("/bookings/cancel", async (req: Request, res: Response) => {
  const payload = req.body as BookingCancelRequest;
  if (!payload?.tenantId || !payload?.bookingId) {
    return res.status(400).json({ error: "tenantId, bookingId are required" });
  }
  if (allowStub) {
    const response: BookingResponse = {
      bookingId: payload.bookingId || `stub-${Date.now()}`,
      status: "cancelled",
    };
    return res.status(200).json({ ...response, stub: true });
  }
  try {
    const result = await cancelBookingForService({
      tenantId: payload.tenantId,
      bookingId: payload.bookingId,
      reason: payload.reason,
      cancelSubsequentBookings: payload.cancelSubsequentBookings,
    });
    return res.status(200).json({
      bookingId: result.bookingId,
      status: "cancelled",
      result: result.result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("tenant")) {
      return res.status(401).json({ error: message });
    }
    if (message.includes("required")) {
      return res.status(400).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post("/send/:channel", (req: Request, res: Response) => {
  const payload = req.body as SendRequest;
  const response: SendResponse = {
    messageId: `stub-${Date.now()}`,
    status: "queued",
  };
  return stubOrNotImplemented(res, response);
});

mvpRouter.post(
  "/voice/upload",
  uploadVoice.single("file"),
  async (req: Request, res: Response) => {
    if (allowStub) {
      const response: VoiceUploadResponse = {
        fileId: `stub-file-${Date.now()}`,
      };
      return res.status(200).json({ ...response, stub: true });
    }
    try {
      const body = req.body as Record<string, unknown>;
      const tenantId = resolveTenantId(req, body);
      const tenantConfig = await getTenantConfig(tenantId);
      if (config.security.strictTenantConfig && !tenantConfig) {
        return res.status(401).json({ error: "Unknown tenant" });
      }

      let buffer: Buffer | undefined;
      let originalName: string | undefined;
      let contentType: string | undefined;

      if (req.file?.buffer) {
        buffer = req.file.buffer;
        originalName = req.file.originalname;
        contentType = req.file.mimetype;
      } else if (typeof body.fileBase64 === "string" || typeof body.base64 === "string") {
        const raw = String(body.fileBase64 || body.base64 || "");
        const cleaned = raw.includes(",") ? raw.split(",").pop() || "" : raw;
        buffer = Buffer.from(cleaned, "base64");
        originalName = (body.filename as string | undefined) || "voice";
        contentType = (body.contentType as string | undefined) || "application/octet-stream";
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: "file is required" });
      }

      const result = await storeVoiceFile({
        buffer,
        tenantId,
        originalName,
        contentType,
      });

      await logEvent("voice_uploaded", {
        tenantId,
        fileId: result.fileId,
        bytes: result.bytes,
        contentType: result.contentType,
      });

      const response: VoiceUploadResponse = {
        fileId: result.fileId,
      };
      return res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(502).json({ error: message });
    }
  },
);

mvpRouter.post("/voice/intent", async (req: Request, res: Response) => {
  const payload = req.body as VoiceIntentRequest & Record<string, unknown>;
  if (!payload?.tenantId || !payload?.fileId) {
    return res.status(400).json({ error: "tenantId and fileId are required" });
  }
  if (allowStub) {
    const response: VoiceIntentResponse = {
      intent: "booking",
      fields: {},
    };
    return res.status(200).json({ ...response, stub: true });
  }
  try {
    const tenantConfig = await getTenantConfig(payload.tenantId);
    if (config.security.strictTenantConfig && !tenantConfig) {
      return res.status(401).json({ error: "Unknown tenant" });
    }

    const metadata = await loadVoiceMetadata(payload.tenantId, payload.fileId);
    let text =
      (payload.text as string | undefined) ||
      (payload.transcript as string | undefined) ||
      undefined;

    if (!text) {
      const stt = await transcribeVoiceFile(metadata);
      text = stt.text;
    }

    if (!text) {
      return res.status(502).json({ error: "STT returned empty transcript" });
    }

    const { intent, fields } = detectVoiceIntent(text, {
      serviceId: payload.serviceId as string | undefined,
      staffId: payload.staffId as string | undefined,
      preferredTime: payload.preferredTime as string | undefined,
    });

    await logEvent("voice_intent", {
      tenantId: payload.tenantId,
      fileId: payload.fileId,
      intent,
    });

    const response: VoiceIntentResponse = {
      intent,
      fields,
    };
    return res.status(200).json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("ENOENT")) {
      return res.status(404).json({ error: "fileId not found" });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post("/voice/booking", async (req: Request, res: Response) => {
  const payload = req.body as VoiceBookingRequest;
  if (!payload?.tenantId || !payload?.fileId) {
    return res.status(400).json({ error: "tenantId and fileId are required" });
  }
  if (allowStub) {
    const response: VoiceBookingResponse = {
      status: "needs_info",
      missingFields: ["serviceId", "preferredTime"],
    };
    return res.status(200).json({ ...response, stub: true });
  }
  try {
    const result = await createBookingFromVoice(payload);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("tenant")) {
      return res.status(401).json({ error: message });
    }
    if (message.includes("Unsupported") || message.includes("required")) {
      return res.status(400).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post(
  "/inventory/intake",
  uploadInventory.single("file"),
  async (req: Request, res: Response) => {
    if (allowStub) {
      const response: InventoryIntakeResponse = {
        draftId: `stub-draft-${Date.now()}`,
        extractedItems: [],
      };
      return res.status(200).json({ ...response, stub: true });
    }
    try {
      const body = req.body as InventoryIntakeRequest & Record<string, unknown>;
      const tenantId = resolveTenantId(req, body as Record<string, unknown>);
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required" });
      }
      const tenantConfig = await getTenantConfig(tenantId);
      if (config.security.strictTenantConfig && !tenantConfig) {
        return res.status(401).json({ error: "Unknown tenant" });
      }

      let buffer: Buffer | undefined;
      let originalName: string | undefined;
      let contentType: string | undefined;

      if (req.file?.buffer) {
        buffer = req.file.buffer;
        originalName = req.file.originalname;
        contentType = req.file.mimetype;
      } else if (typeof body.fileBase64 === "string") {
        const raw = String(body.fileBase64 || "");
        const cleaned = raw.includes(",") ? raw.split(",").pop() || "" : raw;
        buffer = Buffer.from(cleaned, "base64");
        originalName = body.filename || "intake";
        contentType = body.contentType || "application/octet-stream";
      }

      const items = parseItems(body.items);
      const result = await createInventoryDraft({
        tenantId,
        file: buffer
          ? { buffer, originalName, contentType }
          : undefined,
        fileId: body.fileId,
        items,
        text: body.text as string | undefined,
      });

      return res.status(200).json({
        draftId: result.draftId,
        extractedItems: result.extractedItems,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("tenant")) {
        return res.status(401).json({ error: message });
      }
      if (message.includes("required")) {
        return res.status(400).json({ error: message });
      }
      return res.status(502).json({ error: message });
    }
  },
);

mvpRouter.post("/inventory/intake/confirm", async (req: Request, res: Response) => {
  const payload = req.body as InventoryConfirmRequest;
  if (!payload?.tenantId || !payload?.draftId) {
    return res.status(400).json({ error: "tenantId and draftId are required" });
  }
  if (allowStub) {
    const response = { ledgerIds: [] };
    return res.status(200).json({ ...response, stub: true });
  }
  try {
    const result = await confirmInventoryDraft({
      tenantId: payload.tenantId,
      draftId: payload.draftId,
      items: payload.items,
    });
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("tenant")) {
      return res.status(401).json({ error: message });
    }
    if (message.includes("required") || message.includes("No inventory items")) {
      return res.status(400).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post("/inventory/consume", async (req: Request, res: Response) => {
  const payload = req.body as InventoryConsumeRequest;
  if (!payload?.tenantId || !payload?.bookingId) {
    return res.status(400).json({ error: "tenantId and bookingId are required" });
  }
  if (allowStub) {
    return res.status(200).json({ ok: true, stub: true });
  }
  try {
    const result = await consumeInventory({
      tenantId: payload.tenantId,
      bookingId: payload.bookingId,
      serviceId: payload.serviceId,
      items: payload.items,
    });
    return res.status(200).json({ ok: true, ledgerIds: result.ledgerIds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("tenant")) {
      return res.status(401).json({ error: message });
    }
    if (message.includes("required") || message.includes("items")) {
      return res.status(400).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post("/inventory/reconcile", async (req: Request, res: Response) => {
  const payload = req.body as InventoryReconcileRequest;
  if (!payload?.tenantId || !payload?.items) {
    return res.status(400).json({ error: "tenantId and items are required" });
  }
  if (allowStub) {
    const response: InventoryReconcileResponse = {
      variance: [],
    };
    return res.status(200).json({ ...response, stub: true });
  }
  try {
    const result = await reconcileInventory({
      tenantId: payload.tenantId,
      items: payload.items,
      applyCorrection: payload.applyCorrection,
    });
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("tenant")) {
      return res.status(401).json({ error: message });
    }
    if (message.includes("required")) {
      return res.status(400).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
});

mvpRouter.post("/feedback/request", (req: Request, res: Response) => {
  const payload = req.body as FeedbackRequest;
  if (!payload?.tenantId || !payload?.bookingId) {
    return res.status(400).json({ error: "tenantId and bookingId are required" });
  }
  if (allowStub) {
    return res.status(200).json({ ok: true, stub: true });
  }
  requestFeedback({
    tenantId: payload.tenantId,
    bookingId: payload.bookingId,
    channel: payload.channel,
    to: payload.to,
    message: payload.message,
    idempotencyKey: payload.idempotencyKey,
    metadata: payload.metadata,
  })
    .then(() => res.status(200).json({ ok: true }))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("Duplicate")) {
        return res.status(409).json({ error: message });
      }
      if (message.includes("Unsupported")) {
        return res.status(400).json({ error: message });
      }
      return res.status(502).json({ error: message });
    });
});

mvpRouter.post("/feedback/submit", (req: Request, res: Response) => {
  const payload = req.body as FeedbackSubmitRequest;
  if (!payload?.tenantId || !payload?.bookingId || payload?.rating === undefined) {
    return res.status(400).json({ error: "tenantId, bookingId, rating are required" });
  }
  if (allowStub) {
    return res.status(200).json({ ok: true, stub: true });
  }
  submitFeedback({
    tenantId: payload.tenantId,
    bookingId: payload.bookingId,
    rating: payload.rating,
    comment: payload.comment,
    staffId: payload.staffId,
    serviceId: payload.serviceId,
    channel: payload.channel,
  })
    .then(() => res.status(200).json({ ok: true }))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("rating") || message.includes("Unsupported")) {
        return res.status(400).json({ error: message });
      }
      return res.status(502).json({ error: message });
    });
});

mvpRouter.get("/kpi/summary", (_req: Request, res: Response) => {
  const period = String((_req.query?.period as string | undefined) || "day");
  const tenantId =
    String((_req.query?.tenantId as string | undefined) || "") || "default";
  if (allowStub) {
    const response: KpiSummaryResponse = {
      period,
      metrics: {},
    };
    return res.status(200).json({ ...response, stub: true });
  }
  getKpiSummary(tenantId, period)
    .then((result) => res.status(200).json(result))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(502).json({ error: message });
    });
});

mvpRouter.get("/kpi/staff/:staffId", (req: Request, res: Response) => {
  const staffId = req.params.staffId;
  const period = String((req.query?.period as string | undefined) || "day");
  const tenantId = String((req.query?.tenantId as string | undefined) || "") || "default";
  if (allowStub) {
    const response: KpiStaffResponse = {
      staffId,
      period,
      metrics: {},
    };
    return res.status(200).json({ ...response, stub: true });
  }
  getKpiStaff(tenantId, staffId, period)
    .then((result) => res.status(200).json(result))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(502).json({ error: message });
    });
});

mvpRouter.get("/audit", (_req: Request, res: Response) => {
  return stubOrNotImplemented(res, { items: [] });
});
