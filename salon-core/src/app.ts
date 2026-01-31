import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { integrationsRouter } from "./routes/integrations.js";
import { queueRouter } from "./routes/queue.js";
import { sendRouter } from "./routes/send.js";
import { tenantsRouter } from "./routes/tenants.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { mvpRouter } from "./routes/mvp.js";

export const createApp = () => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  }));

  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as { rawBody?: string }).rawBody = buf.toString("utf8");
      },
    }),
  );

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uiDir = path.join(__dirname, "../public/ui");

  app.use("/ui", express.static(uiDir));
  app.get("/ui", (_req, res) => res.sendFile(path.join(uiDir, "index.html")));

  app.use("/health", healthRouter);
  app.use("/webhooks", webhooksRouter);
  app.use("/integrations", integrationsRouter);
  app.use("/queue", queueRouter);
  app.use("/send", sendRouter);
  app.use("/tenants", tenantsRouter);
  app.use("/", mvpRouter);

  return app;
};
