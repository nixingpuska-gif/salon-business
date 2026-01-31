import "dotenv/config";
import { dequeueBlocking, enqueue } from "../services/queue.js";
import { processAIntent } from "../services/intelligence.js";
import { createBooking } from "../services/calcom.js";

const queueName = "queue:tx";

const run = async () => {
  console.log(`[tx-anthropic] Online and Listening on ${queueName}...`);

  while (true) {
    const job = await dequeueBlocking([queueName]);
    if (!job || !job.payload) continue;

    try {
      const { message, tenantId, phone, name, channel, to } = job.payload;
      
      console.log(`[tx] Processing message from client ${name || 'N/A'}: ${message}`);
      
      const analysis = await processAIntent(String(message), String(tenantId || "default"));
      console.log(`[tx] Anthropic Decision:`, JSON.stringify(analysis, null, 2));

      if (analysis?.intent === "booking" && analysis.details?.time) {
          const bookingStart = `${analysis.details.date || '2026-01-31'}T${analysis.details.time}:00.000Z`;
          
          try {
              console.log("[tx] Submitting Booking to Cal.com...");
              const res = await createBooking({
                  eventTypeId: 1295410,
                  start: bookingStart,
                  responses: {
                      name: name || "Premium Client",
                      phoneNumber: phone || "NoPhone"
                  },
                  timeZone: "Europe/Moscow"
              });
              
              if (channel && to) {
                  await enqueue(`queue:send:${channel}`, {
                      tenantId, channel, to,
                      message: `✨ Превосходно! Вы записаны на ${analysis.details.service}.\n📅 ${analysis.details.date}\n🕒 в ${analysis.details.time}\n\nВаш персональный администратор Akira-Salon. 🦾`
                  });
              }
          } catch (bErr) {
              console.error("[tx] Cal.com Error:", bErr.message);
          }
      }

      await job.ack();
    } catch (error) {
      console.error("[tx] Logic error:", error.message);
      if (job) await job.ack();
    }
  }
};

run().catch(console.error);
