export type BookingStep =
  | "idle"
  | "choosing_service"
  | "choosing_master"
  | "choosing_date"
  | "choosing_slot"
  | "collecting_client"
  | "confirming";

export interface BookingContext {
  serviceId?: number;
  serviceName?: string;
  masterId?: number | null;
  masterName?: string | null;
  dateISO?: string;
  slotStart?: string;
  slotEnd?: string;
  clientName?: string;
  clientPhone?: string;
  clientWhatsapp?: string | null;
}

export interface SessionState {
  step: BookingStep;
  data: BookingContext;
}

export type SessionsMap = Map<number, SessionState>;

