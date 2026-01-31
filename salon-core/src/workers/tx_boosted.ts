import "dotenv/config";
import { dequeueBlocking, enqueue } from "../services/queue.js";
import { logEvent } from "../services/logger.js";
import { upsertJobLog } from "../services/coreDb.js";
import { processAIntent } from "../services/intelligence.js";
import { createBooking } from "../services/calcom.js";

const queueName = "queue:tx";

const run = async () => {
  console.log(`[tx-boosted] System online. Monitoring ${queueName}...`);

  while (true) {
    const job = await dequeueBlocking([queueName]);
    if (!job) continue;

    try {
      const text = String(job.payload.message || "");
      const tenantId = String(job.payload.tenantId || "test_salon");
      const phone = String(job.payload.phone || "+79000000000");
      
      console.log(`[tx] New message received: "${text}"`);
      
      // Степ 1: Распознаем намерение
      const analysis = await processAIntent(text, tenantId);
      console.log(`[tx] AI Decoded intent:`, JSON.stringify(analysis, null, 2));

      if (analysis?.intent === "booking" && analysis.details?.time) {
          console.log("[tx] Executing autonomous booking sequence...");
          
          const bookingData = {
              eventTypeId: 1295410, 
              start: `2026-01-31T${analysis.details.time}:00.000Z`,
              responses: {
                  name: "Nikita Test",
                  email: "nikita@akira-salon.local",
                  phoneNumber: phone
              },
              timeZone: "Europe/Moscow"
          };

          try {
              const res = await createBooking(bookingData);
              console.log("[tx] SUCCESS: Booking confirmed in Cal.com!");
              console.log("[tx] Result ID:", res.id || res.uid || "Created");
              
              // Шлем пруф в консоль, чтобы я мог тебе его показать
              console.log(`PROOF_JSON: ${JSON.stringify(res)}`);
          } catch (err) {
              console.error("[tx] Cal.com request failed:", err.message);
          }
      }

      await job.ack();
    } catch (error) {
      console.error("[tx] Fatal error:", error);
      await job.ack();
    }
  }
};

run().catch(console.error);
