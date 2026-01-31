import assert from "node:assert/strict";
import { test } from "node:test";

const { _test } = await import("../src/services/slots.js");

test("isAlignedToGrid enforces grid minutes", () => {
  const aligned = new Date("2026-01-01T10:00:00Z");
  const off = new Date("2026-01-01T10:07:00Z");
  assert.equal(_test.isAlignedToGrid(aligned, 15), true);
  assert.equal(_test.isAlignedToGrid(off, 15), false);
});

test("normalizeSlots fills end time using duration and buffer", () => {
  const input = {
    "2026-01-01": ["2026-01-01T10:00:00Z"],
  };
  const slots = _test.normalizeSlots(input, 60, 10);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].start, "2026-01-01T10:00:00.000Z");
  assert.equal(slots[0].end, "2026-01-01T11:10:00.000Z");
});

test("scoreSlots prefers off-peak windows", () => {
  const slots = [
    { start: "2026-01-01T08:00:00Z", end: "2026-01-01T09:00:00Z" },
  ];
  const preferred = new Date("2026-01-01T12:00:00Z");
  const scored = _test.scoreSlots(slots, preferred, "UTC", 15, 11, 19);
  assert.equal(scored.length, 1);
  assert.ok(scored[0].reason.includes("offpeak"));
});
