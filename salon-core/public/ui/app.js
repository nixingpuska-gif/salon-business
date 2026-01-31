const healthPill = document.getElementById("healthPill");
const timePill = document.getElementById("timePill");
const envPill = document.getElementById("envPill");
const tenantInput = document.getElementById("tenantInput");
const periodSelect = document.getElementById("periodSelect");
const refreshBtn = document.getElementById("refreshBtn");
const openHealthBtn = document.getElementById("openHealth");
const openKpiBtn = document.getElementById("openKpi");

const automationScore = document.getElementById("automationScore");
const automationFill = document.getElementById("automationFill");
const deliveryScore = document.getElementById("deliveryScore");
const deliveryFill = document.getElementById("deliveryFill");

const percentKeys = new Set([
  "cancellationRate",
  "rescheduleRate",
  "noShowRate",
  "repeatVisitRate",
  "messageDeliveryRate",
  "adminInterventionRate",
]);

const numberFormatter = new Intl.NumberFormat("en-US");

const readLocal = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value || fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const formatMetric = (key, value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "--";
  }
  const numeric = Number(value);
  if (percentKeys.has(key)) {
    return `${numeric.toFixed(1)}%`;
  }
  if (key === "feedbackAvg") {
    return numeric.toFixed(2);
  }
  return numberFormatter.format(numeric);
};

const setHealthStatus = (status, ok) => {
  healthPill.textContent = `Health: ${status}`;
  healthPill.style.background = ok ? "rgba(15, 118, 110, 0.18)" : "rgba(249, 115, 22, 0.2)";
  healthPill.style.color = ok ? "#0f3d3a" : "#7a2e0c";
};

const setLoading = (loading) => {
  refreshBtn.disabled = loading;
  refreshBtn.textContent = loading ? "Refreshing..." : "Refresh live data";
};

const updateScore = (value, labelNode, fillNode) => {
  const clamped = clamp(value, 0, 100);
  labelNode.textContent = `${clamped.toFixed(1)}%`;
  fillNode.style.width = `${clamped}%`;
};

const updateMetricCards = (metrics) => {
  Object.entries(metrics).forEach(([key, value]) => {
    const node = document.getElementById(`kpi-${key}`);
    if (node) {
      node.textContent = formatMetric(key, value);
    }
  });
};

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
};

const buildKpiUrl = (tenantId, period) => {
  const params = new URLSearchParams();
  params.set("tenantId", tenantId || "default");
  params.set("period", period || "day");
  return `/kpi/summary?${params.toString()}`;
};

const refresh = async () => {
  const tenantId = tenantInput.value.trim() || "default";
  const period = periodSelect.value || "day";
  writeLocal("tenantId", tenantId);
  writeLocal("period", period);

  setLoading(true);

  try {
    const [health, kpi] = await Promise.all([
      fetchJson("/health").catch(() => null),
      fetchJson(buildKpiUrl(tenantId, period)),
    ]);

    if (health && health.status === "ok") {
      setHealthStatus("ok", true);
    } else {
      setHealthStatus("offline", false);
    }

    const metrics = (kpi && kpi.metrics) || {};
    updateMetricCards(metrics);

    const adminRate = Number(metrics.adminInterventionRate || 0);
    const automation = clamp(100 - adminRate, 0, 100);
    updateScore(automation, automationScore, automationFill);

    const delivery = Number(metrics.messageDeliveryRate || 0);
    updateScore(delivery, deliveryScore, deliveryFill);

    const now = new Date();
    timePill.textContent = `Updated: ${now.toLocaleTimeString()}`;
  } catch (error) {
    setHealthStatus("error", false);
  } finally {
    setLoading(false);
  }
};

const init = () => {
  tenantInput.value = readLocal("tenantId", "default");
  periodSelect.value = readLocal("period", "day");
  envPill.textContent = "Mode: api";

  refreshBtn.addEventListener("click", () => refresh());
  openHealthBtn.addEventListener("click", () => window.open("/health", "_blank"));
  openKpiBtn.addEventListener("click", () => {
    const tenantId = tenantInput.value.trim() || "default";
    const period = periodSelect.value || "day";
    window.open(buildKpiUrl(tenantId, period), "_blank");
  });

  refresh();
};

init();
