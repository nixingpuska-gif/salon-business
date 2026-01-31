import assert from "node:assert/strict";
import { test } from "node:test";

process.env.QUIET_HOURS_START = "22";
process.env.QUIET_HOURS_END = "9";

const { isQuietHours, shiftOutOfQuietHours } = await import("../src/services/quietHours.js");

test("quiet hours span midnight", () => {
  const late = new Date("2026-01-01T23:00:00Z");
  const morning = new Date("2026-01-01T10:00:00Z");

  assert.equal(isQuietHours(late, "UTC"), true);
  assert.equal(isQuietHours(morning, "UTC"), false);
});

test("shift out of quiet hours moves to end window", () => {
  const late = new Date("2026-01-01T23:30:00Z");
  const shifted = shiftOutOfQuietHours(late, "UTC");
  assert.equal(shifted.getUTCHours(), 9);
});
