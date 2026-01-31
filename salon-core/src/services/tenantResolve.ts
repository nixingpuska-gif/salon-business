import { Request } from "express";

const normalizeHost = (hostHeader: string) => {
  const raw = hostHeader.split(",")[0]?.trim() || "";
  return raw.replace(/:\d+$/, "");
};

const extractFromHost = (req: Request) => {
  const shouldUse =
    process.env.TENANT_FROM_HOST === "1" || Boolean(process.env.TENANT_HOST_SUFFIX);
  if (!shouldUse) return undefined;
  const hostHeader = req.header("x-forwarded-host") || req.header("host") || "";
  if (!hostHeader) return undefined;
  const host = normalizeHost(hostHeader);
  if (!host) return undefined;

  const suffix = process.env.TENANT_HOST_SUFFIX || "";
  let subdomain = "";
  if (suffix) {
    if (!host.endsWith(suffix)) return undefined;
    subdomain = host.slice(0, -suffix.length).replace(/\.$/, "");
  } else if (host.includes(".")) {
    subdomain = host.split(".")[0];
  } else if (process.env.TENANT_HOST_ALLOW_LOCAL === "1") {
    subdomain = host;
  }

  if (!subdomain) return undefined;
  const tenant = subdomain.split(".")[0].trim();
  return tenant || undefined;
};

export const resolveTenantId = (
  req: Request,
  body?: Record<string, unknown>,
): string => {
  const paramsTenant = (req.params as { tenantId?: string }).tenantId;
  const headerTenant = req.header("x-tenant-id");
  const queryTenant = (req.query?.tenantId as string | undefined) || undefined;
  const bodyTenant = (body?.tenantId as string | undefined) || undefined;
  return (
    headerTenant ||
    paramsTenant ||
    queryTenant ||
    bodyTenant ||
    extractFromHost(req) ||
    "default"
  );
};
