type IntentFields = {
  serviceId?: string;
  preferredTime?: string;
  staffId?: string;
};

const extractIsoDate = (text: string) => {
  const iso = text.match(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?/,
  );
  return iso?.[0];
};

const extractLabeledValue = (text: string, labels: string[]) => {
  const pattern = new RegExp(`(?:${labels.join("|")})\\s*[:=]\\s*([\\w-]+)`, "i");
  const match = text.match(pattern);
  return match?.[1];
};

export const detectVoiceIntent = (text?: string, hints?: IntentFields) => {
  const normalized = (text || "").trim();
  const fields: IntentFields = { ...hints };

  if (normalized) {
    fields.preferredTime = fields.preferredTime || extractIsoDate(normalized);
    fields.serviceId =
      fields.serviceId ||
      extractLabeledValue(normalized, ["service", "serviceId", "услуга", "услугаId"]);
    fields.staffId =
      fields.staffId || extractLabeledValue(normalized, ["staff", "master", "мастер"]);
  }

  const intent =
    normalized.includes("запис") ||
    normalized.includes("booking") ||
    normalized.includes("appointment") ||
    Object.values(fields).some((value) => Boolean(value))
      ? "booking"
      : "unknown";

  return { intent, fields };
};
