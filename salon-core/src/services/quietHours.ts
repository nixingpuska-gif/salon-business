import { config } from "../config.js";

const getLocalHour = (date: Date, timeZone?: string) => {
  if (!timeZone) {
    return date.getHours();
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  });
  const hour = Number(formatter.format(date));
  return Number.isNaN(hour) ? date.getHours() : hour;
};

export const isQuietHours = (date: Date, timeZone?: string) => {
  const hour = getLocalHour(date, timeZone);
  const { start, end } = config.quietHours;
  if (start === end) return false;
  if (start < end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
};

export const shiftOutOfQuietHours = (date: Date, timeZone?: string) => {
  if (!isQuietHours(date, timeZone)) {
    return date;
  }
  // Step hour-by-hour using the target timezone to avoid offset math.
  const adjusted = new Date(date);
  let guard = 0;
  while (isQuietHours(adjusted, timeZone) && guard < 48) {
    adjusted.setHours(adjusted.getHours() + 1, 0, 0, 0);
    guard += 1;
  }
  return adjusted;
};
