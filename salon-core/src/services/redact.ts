import crypto from "crypto";

const maskEnabled = () => process.env.MASK_PII_LOGS === "1";
const maskMessageContent = () => process.env.MASK_MESSAGE_CONTENT === "1";

const partials = ["token", "secret", "password", "authorization", "api_key", "apikey", "bearer"];
const directKeys = new Set([
  "phone",
  "primaryphone",
  "phonenumber",
  "mobile",
  "tel",
  "email",
  "primaryemail",
  "firstname",
  "lastname",
  "name",
  "to",
]);

const messageKeys = new Set(["message", "text", "content"]);

const isSensitiveKey = (key: string) => {
  const k = key.toLowerCase();
  if (directKeys.has(k)) return true;
  return partials.some((p) => k.includes(p));
};

const maskEmail = (value: string) => {
  const [user, domain] = value.split("@");
  if (!domain) return "[REDACTED]";
  const u = user ? `${user[0]}***` : "***";
  const d = domain ? `${domain[0]}***` : "***";
  return `${u}@${d}`;
};

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return "***";
  return `***${digits.slice(-4)}`;
};

const maskName = (value: string) => {
  if (!value) return "***";
  return `${value[0]}***`;
};

const maskGeneric = (value: string) => {
  const hash = crypto.createHash("sha256").update(value).digest("hex").slice(0, 8);
  return `[REDACTED:${hash}]`;
};

const maskValue = (key: string, value: string) => {
  const k = key.toLowerCase();
  if (k.includes("email")) return maskEmail(value);
  if (k.includes("phone") || k.includes("tel")) return maskPhone(value);
  if (k.includes("name")) return maskName(value);
  return maskGeneric(value);
};

const redactInner = (input: unknown, keyHint?: string): unknown => {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => redactInner(item));
  }
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (maskMessageContent() && messageKeys.has(key.toLowerCase())) {
        output[key] = "[REDACTED]";
        continue;
      }
      if (isSensitiveKey(key) && typeof value === "string") {
        output[key] = maskValue(key, value);
        continue;
      }
      output[key] = redactInner(value, key);
    }
    return output;
  }
  if (typeof input === "string" && keyHint && isSensitiveKey(keyHint)) {
    return maskValue(keyHint, input);
  }
  return input;
};

export const redactPayload = (payload: Record<string, unknown>) => redactInner(payload) as Record<string, unknown>;

export const maybeRedact = (payload: Record<string, unknown>) => {
  if (!maskEnabled()) return payload;
  return redactPayload(payload);
};
