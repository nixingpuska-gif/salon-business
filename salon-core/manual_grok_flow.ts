import "dotenv/config";
import OpenAI from "openai";
import { createBooking } from "./src/services/calcom.js";

const aiClient = new OpenAI({
  apiKey: "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",
  baseURL: "https://openrouter.ai/api/v1",
});

const run = async () => {
  const text = "Запиши на завтра на 17:30 на мужскую стрижку";
  console.log(`[manual-test-grok] Processing: "${text}"`);
  
  const response = await aiClient.chat.completions.create({
    model: "x-ai/grok-2-1212",
    messages: [
      { role: "system", content: "Extract booking details as JSON: {intent, details: {service, date, time}} (Today is 2026-01-30). Respond ONLY with JSON." },
      { role: "user", content: text }
    ],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content;
  const analysis = JSON.parse(content || "{}");
  console.log(`[manual-test-grok] AI Analysis:`, analysis);

  if (analysis.intent === "booking" || analysis.details?.time) {
      console.log("[manual-test-grok] Connecting to Cal.com...");
      const bookingData = {
          eventTypeId: 1295410,
          start: `2026-01-31T${analysis.details.time}:00.000Z`,
          responses: {
              name: "Nikita Grok Test",
              email: "grok@akira-salon.local",
              phoneNumber: "+79057771122"
          },
          timeZone: "Europe/Moscow"
      };
      
      const res = await createBooking(bookingData);
      console.log("FINAL_SUCCESS_GROK:", JSON.stringify(res, null, 2));
  }
};

run().catch(console.error);
