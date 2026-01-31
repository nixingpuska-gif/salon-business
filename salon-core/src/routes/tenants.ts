import { Request, Response, Router } from "express";
import {
  deleteTenantConfig,
  getTenantConfig,
  getTenantConfigExact,
  isTenantConfigDb,
  setTenantConfig,
} from "../services/tenantConfig.js";
import { ensureTenant, upsertTenantMapping } from "../services/coreDb.js";

export const tenantsRouter = Router();

type Role = "admin" | "owner" | "staff" | null;

const extractToken = (req: Request) => {
  const header = req.header("x-admin-token") || "";
  const auth = req.header("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return header || bearer || "";
};

const resolveRole = async (tenantId: string, req: Request): Promise<Role> => {
  const token = extractToken(req);
  if (!token) return null;

  const adminToken = process.env.ADMIN_API_TOKEN;
  if (adminToken && token === adminToken) {
    return "admin";
  }

  const config = await getTenantConfigExact(tenantId);
  const access = config?.access;
  if (!access) return null;
  if (access.ownerTokens?.includes(token)) return "owner";
  if (access.staffTokens?.includes(token)) return "staff";
  return null;
};

const maskConfig = (config: Record<string, unknown>) => {
  const cloned = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  const access = cloned.access as { ownerTokens?: string[]; staffTokens?: string[] } | undefined;
  const maskList = (values?: string[]) =>
    values?.map((value) => (value.length <= 4 ? "***" : `***${value.slice(-4)}`)) || values;
  if (access) {
    access.ownerTokens = maskList(access.ownerTokens);
    access.staffTokens = maskList(access.staffTokens);
  }
  return cloned;
};

tenantsRouter.get("/:tenantId/config", async (req: Request, res: Response) => {
  const tenantId = req.params.tenantId;
  const role = await resolveRole(tenantId, req);
  if (!role) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const config = await getTenantConfigExact(tenantId);
  if (!config) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(200).json({ tenantId, config: role === "staff" ? maskConfig(config) : config });
});

tenantsRouter.put("/:tenantId/config", async (req: Request, res: Response) => {
  if (!isTenantConfigDb()) {
    return res.status(501).json({ error: "Tenant config source is not db" });
  }
  const tenantId = req.params.tenantId;
  const role = await resolveRole(tenantId, req);
  if (!role) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (role === "staff") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const body = req.body as Record<string, unknown>;
  await setTenantConfig(tenantId, body);
  await ensureTenant(tenantId);
  const erxesBrandId =
    ((body.erxes as Record<string, unknown> | undefined)?.brandId as string | undefined) || undefined;
  const calcomTeamId =
    ((body.calcom as Record<string, unknown> | undefined)?.teamId as string | undefined) || undefined;
  await upsertTenantMapping(tenantId, erxesBrandId, calcomTeamId);
  return res.status(200).json({ ok: true });
});

tenantsRouter.delete("/:tenantId/config", async (req: Request, res: Response) => {
  if (!isTenantConfigDb()) {
    return res.status(501).json({ error: "Tenant config source is not db" });
  }
  const tenantId = req.params.tenantId;
  const role = await resolveRole(tenantId, req);
  if (!role) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (role === "staff") {
    return res.status(403).json({ error: "Forbidden" });
  }
  await deleteTenantConfig(tenantId);
  return res.status(200).json({ ok: true });
});
