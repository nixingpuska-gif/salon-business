import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const TENANT_ID = __ENV.TENANT_ID || "demo";
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || "";
const CHANNEL = __ENV.CHANNEL || "telegram";

const jsonHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (ADMIN_TOKEN) headers["x-admin-token"] = ADMIN_TOKEN;
  return headers;
};

export const options = {
  scenarios: {
    availability: {
      executor: "constant-vus",
      vus: 50,
      duration: "2m",
      exec: "availability",
    },
    booking: {
      executor: "constant-vus",
      vus: 30,
      duration: "2m",
      exec: "booking",
    },
    inbound: {
      executor: "constant-vus",
      vus: 30,
      duration: "2m",
      exec: "inbound",
    },
    outbound: {
      executor: "constant-vus",
      vus: 30,
      duration: "2m",
      exec: "outbound",
    },
    inventory: {
      executor: "constant-vus",
      vus: 10,
      duration: "2m",
      exec: "inventory",
    },
    dashboard: {
      executor: "constant-vus",
      vus: 20,
      duration: "2m",
      exec: "dashboard",
    },
  },
};

export function availability() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { "health 200": (r) => r.status === 200 });

  const suggestPayload = {
    tenantId: TENANT_ID,
    serviceId: "svc-demo",
    preferredTime: new Date().toISOString(),
  };
  const suggest = http.post(
    `${BASE_URL}/slots/suggest`,
    JSON.stringify(suggestPayload),
    { headers: jsonHeaders() },
  );
  check(suggest, { "slots suggest ok": (r) => r.status < 500 });
  sleep(1);
}

export function booking() {
  const payload = {
    tenantId: TENANT_ID,
    serviceId: "svc-demo",
    start: new Date().toISOString(),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    client: { name: "Test", phone: "+79000000000" },
  };
  const res = http.post(
    `${BASE_URL}/bookings/create`,
    JSON.stringify(payload),
    { headers: jsonHeaders() },
  );
  check(res, { "booking ok": (r) => r.status < 500 });
  sleep(1);
}

export function inbound() {
  const payload = {
    tenantId: TENANT_ID,
    channel: CHANNEL,
    from: "user-1",
    message: "Хочу записаться завтра утром",
  };
  const res = http.post(
    `${BASE_URL}/webhooks/${CHANNEL}/${TENANT_ID}`,
    JSON.stringify(payload),
    { headers: jsonHeaders() },
  );
  check(res, { "inbound ok": (r) => r.status < 500 });
  sleep(1);
}

export function outbound() {
  const payload = {
    tenantId: TENANT_ID,
    channel: CHANNEL,
    to: "user-1",
    message: "Подтвердите запись" ,
    idempotencyKey: `lt-${__VU}-${__ITER}`,
  };
  const res = http.post(
    `${BASE_URL}/send/${CHANNEL}`,
    JSON.stringify(payload),
    { headers: jsonHeaders() },
  );
  check(res, { "outbound ok": (r) => r.status < 500 });
  sleep(1);
}

export function inventory() {
  const payload = {
    tenantId: TENANT_ID,
    fileId: "file-demo",
    items: [{ sku: "demo", qty: 1 }],
  };
  const res = http.post(
    `${BASE_URL}/inventory/intake/confirm`,
    JSON.stringify(payload),
    { headers: jsonHeaders() },
  );
  check(res, { "inventory ok": (r) => r.status < 500 });
  sleep(1);
}

export function dashboard() {
  const res = http.get(`${BASE_URL}/kpi/summary?tenantId=${TENANT_ID}`);
  check(res, { "kpi ok": (r) => r.status < 500 });
  sleep(1);
}
