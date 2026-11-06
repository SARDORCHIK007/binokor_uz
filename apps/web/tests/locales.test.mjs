import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("..", import.meta.url);

test("public locales exist and verify includes de and rtl arabic", () => {
  for (const locale of ["uz-Latn", "uz-Cyrl", "ru", "en"]) {
    const messages = JSON.parse(readFileSync(new URL(`messages/${locale}.json`, root), "utf8"));
    assert.equal(typeof messages.nav.login, "string");
    assert.ok(messages.nav.login.length > 0);
  }
  const page = readFileSync(new URL("app/verify/[number]/page.tsx", root), "utf8");
  assert.match(page, /de:/);
  assert.match(page, /ar:/);
  assert.match(page, /rtl/);
});

test("offline attendance client keeps an IndexedDB queue and idempotency key", () => {
  const queue = readFileSync(new URL("lib/attendanceQueue.ts", root), "utf8");
  const worker = readFileSync(new URL("public/sw.js", root), "utf8");
  const sheet = readFileSync(new URL("components/cabinet/AttendanceSheet.tsx", root), "utf8");
  assert.match(queue, /indexedDB/);
  assert.match(queue, /Idempotency-Key/);
  assert.match(worker, /fetch/);
  assert.match(sheet, /OfflineBanner/);
  assert.match(sheet, /enqueueAttendance/);
});
