export interface NotificationChannel {
  send(message: string, recipient: string): Promise<void>;
}

