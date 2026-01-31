import "dotenv/config";
import { z } from "zod";

// Для dev режима используем дефолтные значения если переменные не установлены
const isDev = process.env.NODE_ENV !== "production";

// Устанавливаем дефолты для dev если переменные не заданы
if (isDev) {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      "mysql://root:password@localhost:3306/booking_saas";
    console.warn(
      "⚠️  DATABASE_URL не установлен, используется дефолтное значение для dev"
    );
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET =
      "dev-jwt-secret-key-minimum-32-characters-long-123456789";
    console.warn(
      "⚠️  JWT_SECRET не установлен, используется дефолтное значение для dev"
    );
  }
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  OAUTH_CLIENT_ID: z.string().optional(),
  OAUTH_CLIENT_SECRET: z.string().optional(),
  OAUTH_REDIRECT_URI: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  TELEGRAM_BOOKING_BOT_TOKEN: z.string().optional(),
  BOOKING_TENANT_ID: z.coerce.number().optional(),
  TELEGRAM_BOOKING_BOT_USERNAME: z.string().optional(),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .default("3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
