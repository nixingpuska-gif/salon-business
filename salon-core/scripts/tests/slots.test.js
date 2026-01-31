import assert from "node:assert/strict";
import { _test as slotsTest } from "../../src/services/slots.ts";
const { isAlignedToGrid, normalizeSlots, scoreSlots } = slotsTest;
const t = (iso) => new Date(iso);
// Grid alignment
assert.equal(isAlignedToGrid(t("2026-01-26T09:15:00.000Z"), 15), true);
assert.equal(isAlignedToGrid(t("2026-01-26T09:17:00.000Z"), 15), false);
// Normalize slots
const norm = normalizeSlots({
    "2026-01-26": [
        { start: "2026-01-26T09:00:00.000Z", end: "2026-01-26T10:00:00.000Z" },
        "2026-01-26T11:00:00.000Z",
    ],
}, 60, 0);
assert.equal(norm.length, 2);
// Scoring: offpeak + proximity
const preferred = t("2026-01-26T09:00:00.000Z");
const scored = scoreSlots([
    { start: "2026-01-26T08:00:00.000Z", end: "2026-01-26T09:00:00.000Z" },
    { start: "2026-01-26T12:00:00.000Z", end: "2026-01-26T13:00:00.000Z" },
], preferred, "Europe/Moscow", 15, 11, 19);
assert.equal(scored.length, 2);
const early = scored.find((s) => s.start.includes("08:00"));
const noon = scored.find((s) => s.start.includes("12:00"));
assert.ok(early && noon);
assert.ok(early.score >= noon.score);
console.log("slots.test: ok");
