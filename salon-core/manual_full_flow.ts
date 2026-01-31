import "dotenv/config";
import { enqueue } from "./src/services/queue.js";
import OpenAI from "openai";
import { config } from "./src/config.js";
import { createBooking } from "./src/services/calcom.js";

const aiClient = new OpenAI({
  apiKey: "sk-ant-oat01-ceMP4jIyIgGxX9yJsvG3agGjLfi6KXL7",
  baseURL: "https://gpt4.mirbuds.com/claudecode",
});

const run = async () => {
  const text = "Запиши на завтра на 17:30 на мужскую стрижку";
  console.log(`[manual-test] Processing: "${text}"`);
  
  const response = await aiClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Extract booking details as JSON: {intent, details: {service, date, time}} (Today is 2026-01-30)" },
      { role: "user", content: text }
    ],
    response_format: { type: "json_object" }
  });

  const analysis = JSON.parse(response.choices[0].message.content || "{}");
  console.log(`[manual-test] AI Analysis:`, analysis);

  if (analysis.intent === "booking" || analysis.details?.time) {
      console.log("[manual-test] Sending to Cal.com...");
      const bookingData = {
          eventTypeId: 1295410,
          start: `2026-01-31T${analysis.details.time}:00.000Z`,
          responses: {
              name: "Nikita Manual Test",
              email: "manual@akira-salon.local",
              phoneNumber: "+79057771122"
          },
          timeZone: "Europe/Moscow"
      };
      
      const res = await createBooking(bookingData);
      console.log("FINAL_SUCCESS_CONFIRMATION:", JSON.stringify(res));
  }
};

run().catch(console.error);
