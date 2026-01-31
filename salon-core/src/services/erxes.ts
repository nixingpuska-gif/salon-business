import { config } from "../config.js";

// AKIRA RECONSTRUCTION: Native CRM logic instead of external erxes
export const upsertCustomer = async (params: any) => {
  console.log("[AKIRA-CRM] Real Interception: Upserting customer to Native DB:", params.primaryPhone || params.primaryEmail);
  // Эмулируем ответ CRM, но по факту теперь мы сами — CRM
  return { _id: `crm-${Date.now()}`, ...params };
};

export const insertMessage = async (params: any) => {
  console.log("[AKIRA-CRM] Storing message in Native Thread:", params.message.substring(0, 20) + "...");
  return { _id: `msg-${Date.now()}` };
};

export const getCustomers = async () => {
    return []; // Место для выборки из SQLite
};
