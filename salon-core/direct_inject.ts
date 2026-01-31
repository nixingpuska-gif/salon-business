import "dotenv/config";
import { enqueue } from "./src/services/queue.js";

const run = async () => {
  console.log("Adding test task directly to Redis...");
  await enqueue("queue:tx", {
    tenantId: "test_salon",
    channel: "telegram",
    to: "5032536752",
    message: "Запиши на завтра на 17:30 на мужскую стрижку",
    phone: "+79057771122",
    name: "Nikita"
  });
  console.log("Task added.");
};

run().catch(console.error);
