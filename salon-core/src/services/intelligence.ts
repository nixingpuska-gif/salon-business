import { config } from "../config.js";
import OpenAI from "openai";

// Настройка через OpenRouter на модель Grok
const aiClient = new OpenAI({
  apiKey: "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", // Ключ OpenRouter из системы
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://akira-salon.ru", // Обязательно для OpenRouter
    "X-Title": "Akira-Salon AGI",
  }
});

export const processAIntent = async (text: string, tenantId: string) => {
  console.log(`[INTELLIGENCE-GROK] Processing: ${text}`);
  
  const systemPrompt = `Ты - AI администратор премиального салона 'Akira-Salon'.
  Твоя задача: извлечь детали записи из сообщения клиента.
  Сегодняшняя дата: 2026-01-30.
  Верни СТРОГО JSON формат: 
  { 
    "intent": "booking" | "query" | "other", 
    "details": { "service": string, "date": string, "time": string, "staff": string } 
  }
  Если данных нет, пиши null.`;

  try {
    const response = await aiClient.chat.completions.create({
      model: "x-ai/grok-2-1212", // Модель Grok через OpenRouter
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content || "{}");
  } catch (e) {
    console.error(`[OPENROUTER-GROK ERROR] ${e.message}`);
    return null;
  }
};
