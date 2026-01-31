import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN;

/**
 * Middleware для проверки API-ключа.
 * Требует заголовок X-API-Key с валидным токеном.
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  if (!ADMIN_TOKEN) {
    console.error("ADMIN_API_TOKEN not configured");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // Timing-safe сравнение для защиты от timing attacks
  try {
    const apiKeyBuffer = Buffer.from(apiKey);
    const tokenBuffer = Buffer.from(ADMIN_TOKEN);

    if (apiKeyBuffer.length !== tokenBuffer.length) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    const isValid = crypto.timingSafeEqual(apiKeyBuffer, tokenBuffer);

    if (!isValid) {
      return res.status(403).json({ error: "Invalid API key" });
    }
  } catch {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};
