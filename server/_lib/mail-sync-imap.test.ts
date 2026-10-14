import test from "node:test";
import assert from "node:assert/strict";
import { parseSyncMail, publicAddress } from "./mail-sync-imap.ts";
test("MIME HTML is parsed and sanitized without executing or loading tracking content", async () => {
  const raw = Buffer.from(
    'From: HR <hr@example.com>\r\nTo: me@example.com\r\nDate: Wed, 14 Oct 2026 14:00:00 +0800\r\nSubject: interview\r\nMessage-ID: <test@example.com>\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>星河科技面试 2026年10月16日09:34</p><script>alert(1)</script><img src="https://tracker.example.com/pixel"><a href="javascript:alert(2)">bad</a><a href="https://meeting.example.com">meet</a>',
  );
  const m = await parseSyncMail(
    {
      uid: 1,
      size: raw.length,
      source: raw,
      flags: new Set(),
      internalDate: new Date("2026-10-14T06:00:00Z"),
    } as Parameters<typeof parseSyncMail>[0],
    "42",
  );
  assert.match(m.body, /星河科技面试/);
  assert.equal(m.messageId, "<test@example.com>");
  assert.equal(m.uidvalidity, "42");
  assert.doesNotMatch(m.html || "", /script|javascript:|tracker.example.com/i);
  assert.match(m.html || "", /noopener noreferrer/);
  assert.equal(m.seen, false);
});
test("large messages are marked incomplete and cannot be auto-parsed from a prefix", async () => {
  const m = await parseSyncMail(
    {
      uid: 2,
      size: 2500000,
      flags: new Set(),
      internalDate: new Date(),
      envelope: { subject: "面试" },
    } as Parameters<typeof parseSyncMail>[0],
    "42",
  );
  assert.equal(m.incomplete, true);
  assert.equal(m.body, "");
});
test("custom IMAP cannot resolve private, loopback or mapped local addresses", () => {
  for (const a of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.1.1",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
  ])
    assert.equal(publicAddress(a), false, a);
  assert.equal(publicAddress("8.8.8.8"), true);
});
