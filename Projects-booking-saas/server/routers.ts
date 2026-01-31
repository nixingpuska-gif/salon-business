import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { servicesRouter } from "./routers/services";
import { mastersRouter } from "./routers/masters";
import { appointmentsRouter } from "./routers/appointments";
import { dashboardRouter } from "./routers/dashboard";
import { reportsRouter } from "./routers/reports";
import { assistantRouter } from "./routers/assistant";
import { notificationsRouter } from "./routers/notifications";
import { notificationLogsRouter } from "./routers/notificationLogs";
import { notificationTemplatesRouter } from "./routers/notificationTemplates";
import { notificationStatsRouter } from "./routers/notificationStats";
import { whatsappRouter } from "./routers/whatsapp";
import { clientsRouter } from "./routers/clients";
import { webChatRouter } from "./routers/webChat";
import { assistantChatRouter } from "./routers/assistantChat";
import { contentRouter } from "./routers/content";
import { publicBookingRouter } from "./routers/publicBooking";

export const appRouter = router({
  auth: authRouter,
  dashboard: dashboardRouter,
  reports: reportsRouter,
  assistant: assistantRouter,
  services: servicesRouter,
  masters: mastersRouter,
  appointments: appointmentsRouter,
  notifications: notificationsRouter,
  notificationLogs: notificationLogsRouter,
  notificationTemplates: notificationTemplatesRouter,
  notificationStats: notificationStatsRouter,
  whatsapp: whatsappRouter,
  clients: clientsRouter,
  webChat: webChatRouter,
  assistantChat: assistantChatRouter,
  content: contentRouter,
  publicBooking: publicBookingRouter,
});

export type AppRouter = typeof appRouter;

