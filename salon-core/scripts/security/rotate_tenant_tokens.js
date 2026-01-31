#!/usr/bin/env node
import crypto from "crypto";

const baseUrl = process.env.SALON_CORE_URL || "http://localhost:8080";
const tenantId = process.env.TENANT_ID || "";
const adminToken = process.env.ADMIN_API_TOKEN || "";

const rotateOwner = process.env.ROTATE_OWNER !== "0";
const rotateStaff = process.env.ROTATE_STAFF !== "0";
const ownerCount = Number(process.env.OWNER_TOKENS_COUNT || 1);
const staffCount = Number(process.env.STAFF_TOKENS_COUNT || 1);
const dryRun = process.env.DRY_RUN === "1";

const createToken = () => crypto.randomBytes(24).toString("hex");
const createList = (count) => Array.from({ length: count }, createToken);

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!tenantId) fail("TENANT_ID is required");
if (!adminToken) fail("ADMIN_API_TOKEN is required");

const url = `${baseUrl.replace(/\/+$/, "")}/tenants/${encodeURIComponent(tenantId)}/config`;

const headers = {
  "Content-Type": "application/json",
  "x-admin-token": adminToken,
};

const main = async () => {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    fail(`Failed to fetch tenant config: ${response.status} ${text}`);
  }
  const data = await response.json();
  const config = data.config || {};
  const access = config.access || {};

  if (rotateOwner) {
    access.ownerTokens = createList(ownerCount);
  }
  if (rotateStaff) {
    access.staffTokens = createList(staffCount);
  }
  config.access = access;

  if (dryRun) {
    console.log(JSON.stringify({ tenantId, access }, null, 2));
    return;
  }

  const put = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(config),
  });

  if (!put.ok) {
    const text = await put.text();
    fail(`Failed to update tenant config: ${put.status} ${text}`);
  }

  console.log(JSON.stringify({ tenantId, access }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
