import express from "express";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { initializeTelegramBot } from "./telegram/index";
import { initTelegramBookingBot } from "./telegram/bookingBot";
import { startReminderWorker } from "./notifications/worker";
import { env } from "./_core/env";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const PORT = env.PORT;

// Проверка критических переменных при старте
if (!env.DATABASE_URL || env.DATABASE_URL.includes("user:password") || env.DATABASE_URL.includes("localhost:3306/db_name")) {
  console.warn("⚠️  ВНИМАНИЕ: DATABASE_URL не настроен или использует дефолтные значения!");
  console.warn("   Создай файл .env и укажи правильный DATABASE_URL");
}

if (!env.JWT_SECRET || env.JWT_SECRET.includes("dev-jwt-secret") || env.JWT_SECRET.length < 32) {
  console.warn("⚠️  ВНИМАНИЕ: JWT_SECRET не настроен или слишком короткий!");
  console.warn("   Для production используй случайную строку минимум 32 символа");
}

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

initializeTelegramBot();
initTelegramBookingBot(appRouter);
startReminderWorker();

// Используем Vite middleware напрямую для правильной работы с root: "client"
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    root: join(root, "client"),
    appType: "spa",
  });

  app.use(vite.middlewares);

  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}/`);
    console.log(`✅ Frontend should be available at http://localhost:${PORT}/`);
    console.log(`✅ Open http://localhost:${PORT} in your browser`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
