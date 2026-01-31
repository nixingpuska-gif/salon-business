import crypto from "crypto";
import { config } from "../config.js";
import { getPool } from "./db.js";
import { ensureTenant, insertAuditLog } from "./coreDb.js";
import { getTenantConfig } from "./tenantConfig.js";
import {
  appendInventoryLedger,
  loadInventoryDraft,
  readInventoryLedger,
  storeInventoryFile,
  writeInventoryDraft,
} from "./inventoryStorage.js";
import { extractInventoryFromFile } from "./inventoryOcr.js";

type DraftItem = { sku?: string; name?: string; qty?: number; unit?: string };
type LedgerItem = { sku: string; name?: string; qty: number; unit?: string };

const shouldWrite = () => process.env.CORE_DB_WRITE === "1";
const hasDb = () => Boolean(process.env.DATABASE_URL);

const safeWrite = async <T>(fn: () => Promise<T>): Promise<T | null> => {
  if (!shouldWrite() || !hasDb()) return null;
  try {
    return await fn();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[inventory] db write failed", error);
    return null;
  }
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeSku = (item: DraftItem) => {
  const sku = item.sku?.trim();
  if (sku) return sku;
  const name = item.name?.trim() || "item";
  const slug = slugify(name);
  if (slug) return slug;
  const hash = crypto.createHash("sha1").update(name).digest("hex").slice(0, 8);
  return `item-${hash}`;
};

const normalizeItems = (items: DraftItem[] | undefined) => {
  if (!items) return [];
  const normalized: LedgerItem[] = [];
  for (const item of items) {
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty === 0) continue;
    normalized.push({
      sku: normalizeSku(item),
      name: item.name?.trim(),
      unit: item.unit?.trim(),
      qty,
    });
  }
  return normalized;
};

const parseItemsFromText = (text?: string) => {
  if (!text) return [] as LedgerItem[];
  const lines = text.split(/\r?\n/);
  const items: LedgerItem[] = [];
  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;
    if (cleaned.includes(",")) {
      const parts = cleaned.split(",").map((part) => part.trim());
      const qty = Number(parts[parts.length - 1]);
      if (!Number.isFinite(qty)) continue;
      const name = parts.length > 2 ? parts.slice(1, -1).join(" ") : parts[0];
      const sku = parts[0] || name;
      items.push({
        sku: normalizeSku({ sku, name }),
        name,
        qty,
      });
      continue;
    }
    const parts = cleaned.split(/\s+/);
    if (parts.length < 2) continue;
    const qty = Number(parts[parts.length - 1]);
    if (!Number.isFinite(qty)) continue;
    const name = parts.slice(0, -1).join(" ");
    items.push({
      sku: normalizeSku({ name }),
      name,
      qty,
    });
  }
  return items;
};

const upsertInventoryItem = async (
  tenantId: string,
  item: LedgerItem,
): Promise<string> => {
  if (!hasDb()) {
    return item.sku;
  }
  const pool = getPool();
  const existing = await pool.query(
    "select id from inventory_item where tenant_id = $1 and sku = $2 limit 1",
    [tenantId, item.sku],
  );
  if (existing.rows[0]?.id) {
    await safeWrite(async () => {
      await pool.query(
        `update inventory_item
         set name = coalesce($3, name),
             unit = coalesce($4, unit),
             updated_at = now()
         where id = $1`,
        [existing.rows[0].id, tenantId, item.name || null, item.unit || null],
      );
      return existing.rows[0].id as string;
    });
    return existing.rows[0].id as string;
  }
  const id = crypto.randomUUID();
  await safeWrite(async () => {
    await pool.query(
      `insert into inventory_item (id, tenant_id, sku, name, unit)
       values ($1, $2, $3, $4, $5)`,
      [id, tenantId, item.sku, item.name || null, item.unit || null],
    );
    return id;
  });
  return id;
};

const insertLedger = async (input: {
  tenantId: string;
  itemId: string;
  qtyDelta: number;
  reason: string;
  sourceDocId?: string;
  bookingId?: string;
}) => {
  const id = crypto.randomUUID();
  await safeWrite(async () => {
    const pool = getPool();
    await pool.query(
      `insert into inventory_ledger (id, tenant_id, item_id, qty_delta, reason, source_doc_id, booking_id)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        input.tenantId,
        input.itemId,
        input.qtyDelta,
        input.reason,
        input.sourceDocId || null,
        input.bookingId || null,
      ],
    );
    return id;
  });

  await appendInventoryLedger(input.tenantId, {
    id,
    itemId: input.itemId,
    qtyDelta: input.qtyDelta,
    reason: input.reason,
    sourceDocId: input.sourceDocId,
    bookingId: input.bookingId,
  });
  return id;
};

const insertIntakeDoc = async (input: {
  draftId: string;
  tenantId: string;
  fileId?: string;
  extractedItems: DraftItem[];
  status: string;
}) => {
  await safeWrite(async () => {
    const pool = getPool();
    await pool.query(
      `insert into intake_doc (id, tenant_id, file_id, status, extracted_items)
       values ($1, $2, $3, $4, $5)`,
      [
        input.draftId,
        input.tenantId,
        input.fileId || null,
        input.status,
        JSON.stringify(input.extractedItems || []),
      ],
    );
    return input.draftId;
  });
};

const updateIntakeDoc = async (input: {
  draftId: string;
  tenantId: string;
  status?: string;
  extractedItems?: DraftItem[];
}) => {
  await safeWrite(async () => {
    const pool = getPool();
    await pool.query(
      `update intake_doc
       set status = coalesce($3, status),
           extracted_items = coalesce($4, extracted_items),
           updated_at = now()
       where id = $1 and tenant_id = $2`,
      [
        input.draftId,
        input.tenantId,
        input.status || null,
        input.extractedItems ? JSON.stringify(input.extractedItems) : null,
      ],
    );
    return input.draftId;
  });
};

const readIntakeDoc = async (tenantId: string, draftId: string) => {
  if (!hasDb()) return null;
  const pool = getPool();
  const result = await pool.query(
    "select id, tenant_id, file_id, status, extracted_items from intake_doc where id = $1 and tenant_id = $2",
    [draftId, tenantId],
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0] as {
    id: string;
    tenant_id: string;
    file_id: string | null;
    status: string;
    extracted_items: DraftItem[];
  };
  return {
    draftId: row.id,
    tenantId: row.tenant_id,
    fileId: row.file_id || undefined,
    status: row.status,
    extractedItems: row.extracted_items || [],
  };
};

const insertStockSnapshot = async (input: {
  tenantId: string;
  itemId: string;
  qtyPhysical: number;
  qtyExpected: number;
  variance: number;
}) => {
  await safeWrite(async () => {
    const pool = getPool();
    const id = crypto.randomUUID();
    await pool.query(
      `insert into stock_snapshot (id, tenant_id, item_id, qty_physical, qty_expected, variance)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        input.tenantId,
        input.itemId,
        input.qtyPhysical,
        input.qtyExpected,
        input.variance,
      ],
    );
    return id;
  });
};

const getExpectedBySku = async (tenantId: string, skus: string[]) => {
  const expected = new Map<string, number>();
  if (hasDb()) {
    const pool = getPool();
    const query = `
      select i.sku, coalesce(sum(l.qty_delta), 0) as qty_expected
      from inventory_item i
      left join inventory_ledger l
        on l.item_id = i.id and l.tenant_id = i.tenant_id
      where i.tenant_id = $1
        and i.sku = any($2)
      group by i.sku
    `;
    const result = await pool.query(query, [tenantId, skus]);
    for (const row of result.rows) {
      expected.set(String(row.sku), Number(row.qty_expected) || 0);
    }
    return expected;
  }

  try {
    const entries = await readInventoryLedger(tenantId);
    for (const entry of entries) {
      const sku = String(entry.itemId || entry.sku || "");
      const qty = Number(entry.qtyDelta || 0);
      if (!sku) continue;
      expected.set(sku, (expected.get(sku) || 0) + qty);
    }
  } catch {
    // ignore missing ledger
  }
  return expected;
};

export const createInventoryDraft = async (input: {
  tenantId: string;
  file?: { buffer: Buffer; originalName?: string; contentType?: string };
  fileId?: string;
  items?: DraftItem[];
  text?: string;
}) => {
  await ensureTenant(input.tenantId);
  let fileId = input.fileId;
  if (input.file && input.file.buffer) {
    const stored = await storeInventoryFile({
      buffer: input.file.buffer,
      tenantId: input.tenantId,
      originalName: input.file.originalName,
      contentType: input.file.contentType,
    });
    fileId = stored.fileId;
  }

  let extractedItems = normalizeItems(input.items);
  if (!extractedItems.length && input.text) {
    extractedItems = parseItemsFromText(input.text);
  }

  if (!extractedItems.length && input.file?.buffer) {
    const ocr = await extractInventoryFromFile({
      buffer: input.file.buffer,
      fileName: input.file.originalName,
      contentType: input.file.contentType,
    });
    if (ocr.items && ocr.items.length) {
      extractedItems = normalizeItems(ocr.items);
    }
    if (!extractedItems.length && ocr.text) {
      extractedItems = parseItemsFromText(ocr.text);
    }
  }

  const draftId = crypto.randomUUID();
  const draft = {
    draftId,
    tenantId: input.tenantId,
    fileId,
    extractedItems,
    createdAt: new Date().toISOString(),
  };
  await writeInventoryDraft(draft);
  await insertIntakeDoc({
    draftId,
    tenantId: input.tenantId,
    fileId,
    extractedItems,
    status: "draft",
  });

  await insertAuditLog({
    tenantId: input.tenantId,
    action: "inventory_intake_draft",
    payload: { draftId, fileId, itemCount: extractedItems.length },
  });

  await appendInventoryLedger(input.tenantId, {
    type: "intake_draft",
    draftId,
    fileId,
    itemCount: extractedItems.length,
  });

  return { draftId, extractedItems };
};

export const confirmInventoryDraft = async (input: {
  tenantId: string;
  draftId: string;
  items?: DraftItem[];
}) => {
  await ensureTenant(input.tenantId);
  let draft: { extractedItems: DraftItem[]; fileId?: string } | null = null;
  try {
    const loaded = await loadInventoryDraft(input.tenantId, input.draftId);
    draft = { extractedItems: loaded.extractedItems, fileId: loaded.fileId };
  } catch {
    const dbDraft = await readIntakeDoc(input.tenantId, input.draftId);
    if (dbDraft) {
      draft = { extractedItems: dbDraft.extractedItems, fileId: dbDraft.fileId };
    }
  }

  const primaryItems = normalizeItems(input.items);
  const fallbackItems = primaryItems.length
    ? primaryItems
    : normalizeItems(draft?.extractedItems || []);
  if (!fallbackItems.length) {
    throw new Error("No inventory items to confirm");
  }

  const ledgerIds: string[] = [];
  for (const item of fallbackItems) {
    const itemId = await upsertInventoryItem(input.tenantId, item);
    const ledgerId = await insertLedger({
      tenantId: input.tenantId,
      itemId,
      qtyDelta: item.qty,
      reason: "intake",
      sourceDocId: input.draftId,
    });
    ledgerIds.push(ledgerId);
  }

  await updateIntakeDoc({
    tenantId: input.tenantId,
    draftId: input.draftId,
    status: "confirmed",
    extractedItems: fallbackItems,
  });

  await insertAuditLog({
    tenantId: input.tenantId,
    action: "inventory_intake_confirmed",
    payload: { draftId: input.draftId, itemCount: fallbackItems.length },
  });

  await appendInventoryLedger(input.tenantId, {
    type: "intake_confirmed",
    draftId: input.draftId,
    fileId: draft?.fileId,
    itemCount: fallbackItems.length,
  });

  return { ledgerIds };
};

export const consumeInventory = async (input: {
  tenantId: string;
  bookingId: string;
  items?: DraftItem[];
  serviceId?: string;
}) => {
  await ensureTenant(input.tenantId);
  let items = normalizeItems(input.items);
  if (!items.length) {
    const tenantConfig = await getTenantConfig(input.tenantId);
    const mapped = input.serviceId
      ? (tenantConfig?.inventory?.services as Record<string, unknown> | undefined)?.[
          input.serviceId
        ]
      : undefined;
    const mappedItems = (mapped as { items?: DraftItem[] } | undefined)?.items || [];
    items = normalizeItems(mappedItems);
  }
  if (!items.length) {
    throw new Error("items are required for consumption (or map serviceId in tenant config)");
  }

  const ledgerIds: string[] = [];
  for (const item of items) {
    const itemId = await upsertInventoryItem(input.tenantId, item);
    const ledgerId = await insertLedger({
      tenantId: input.tenantId,
      itemId,
      qtyDelta: -Math.abs(item.qty),
      reason: "consume",
      bookingId: input.bookingId,
    });
    ledgerIds.push(ledgerId);
  }

  await insertAuditLog({
    tenantId: input.tenantId,
    action: "inventory_consumed",
    payload: { bookingId: input.bookingId, itemCount: items.length },
  });

  await appendInventoryLedger(input.tenantId, {
    type: "consume",
    bookingId: input.bookingId,
    itemCount: items.length,
  });

  return { ledgerIds };
};

export const reconcileInventory = async (input: {
  tenantId: string;
  items: Array<{ sku: string; qtyPhysical: number }>;
  applyCorrection?: boolean;
}) => {
  await ensureTenant(input.tenantId);
  const normalized = input.items
    .map((item) => ({
      sku: item.sku.trim(),
      qtyPhysical: Number(item.qtyPhysical),
    }))
    .filter((item) => item.sku && Number.isFinite(item.qtyPhysical));

  if (!normalized.length) {
    throw new Error("items are required for reconciliation");
  }

  const expectedMap = await getExpectedBySku(
    input.tenantId,
    normalized.map((item) => item.sku),
  );

  const variance = [];
  for (const item of normalized) {
    const expected = expectedMap.get(item.sku) || 0;
    const diff = item.qtyPhysical - expected;
    variance.push({
      sku: item.sku,
      qtyExpected: expected,
      qtyPhysical: item.qtyPhysical,
      diff,
    });

    const itemId = await upsertInventoryItem(input.tenantId, {
      sku: item.sku,
      qty: 0,
    });
    await insertStockSnapshot({
      tenantId: input.tenantId,
      itemId,
      qtyPhysical: item.qtyPhysical,
      qtyExpected: expected,
      variance: diff,
    });

    if (input.applyCorrection && diff !== 0) {
      await insertLedger({
        tenantId: input.tenantId,
        itemId,
        qtyDelta: diff,
        reason: "adjustment",
      });
    }
  }

  await insertAuditLog({
    tenantId: input.tenantId,
    action: "inventory_reconciled",
    payload: {
      itemCount: variance.length,
      applyCorrection: Boolean(input.applyCorrection),
    },
  });

  await appendInventoryLedger(input.tenantId, {
    type: "reconcile",
    itemCount: variance.length,
    applyCorrection: Boolean(input.applyCorrection),
  });

  return { variance };
};

export const _test = {
  parseItemsFromText,
  normalizeItems,
  normalizeSku,
};
