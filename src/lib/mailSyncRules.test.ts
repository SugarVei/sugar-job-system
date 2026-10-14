import test from "node:test";
import assert from "node:assert/strict";
import {
  latestMailBody,
  localMailTime,
  mailCandidate,
  parseSingleCalendar,
  validateMailAnalysis,
} from "./mailSyncRules.ts";
const text =
  "星河科技产品经理一面已确定。面试时间：2026年10月16日 09:34（北京时间）。";
const raw = {
  action: "create",
  certainty: "confirmed",
  is_interview: true,
  company_name: "星河科技",
  position_name: "产品经理",
  round: "一面",
  local_start: "2026-10-16T09:34",
  timezone: "Asia/Shanghai",
  interview_type: "视频",
  evidence: [
    { field: "company_name", text: "星河科技" },
    { field: "local_start", text: "2026年10月16日 09:34（北京时间）" },
  ],
  ambiguities: [],
};
const check = (data: unknown, source = text) =>
  validateMailAnalysis(data, source, "Asia/Shanghai", "2026-10-14T06:00:00Z");
test("confirmed arrangement preserves minutes and converts Shanghai to UTC", () => {
  const a = check(raw);
  assert.equal(a.action, "create");
  assert.equal(a.interview_time, "2026-10-16T01:34:00.000Z");
  assert.equal(a.position_name, "产品经理");
  assert.equal(a.end_time, null);
});
test("ambiguous invitation does not become a calendar event", () =>
  assert.equal(check({ ...raw, certainty: "uncertain" }).action, "review"));
test("invented company and evidence are rejected", () => {
  assert.equal(check({ ...raw, company_name: "另一个公司" }).action, "review");
  assert.equal(
    check({ ...raw, evidence: [{ field: "local_start", text: "明天10点" }] })
      .action,
    "review",
  );
});
test("invalid dates, missing time, ambiguous DST and skipped DST are rejected", () => {
  for (const time of ["2026-02-30T10:00", "2026-10-16", "garbage"])
    assert.equal(localMailTime(time), null);
  assert.equal(localMailTime("2026-11-01T01:30", "America/New_York"), null);
  assert.equal(localMailTime("2026-03-08T02:30", "America/New_York"), null);
});
test("quoted older arrangement is not evidence for a new time", () => {
  const source =
    "星河科技：时间另行通知。\n-----Original Message-----\n" + text;
  assert.equal(latestMailBody(source), "星河科技：时间另行通知。");
  assert.equal(check(raw, source).action, "review");
});
test("date, clock, year, weekday and relative date must agree with evidence", () => {
  assert.equal(
    check({ ...raw, local_start: "2026-10-17T09:34" }).reason,
    "DATE_CONFLICT",
  );
  assert.equal(
    check({ ...raw, local_start: "2026-10-16T09:00" }).reason,
    "CLOCK_CONFLICT",
  );
  assert.equal(
    check({ ...raw, local_start: "2027-10-16T09:34" }).reason,
    "YEAR_CONFLICT",
  );
  assert.equal(
    check(
      {
        ...raw,
        evidence: [
          { field: "local_start", text: "2026年10月16日（周四）09:34" },
        ],
      },
      "星河科技 2026年10月16日（周四）09:34",
    ).reason,
    "WEEKDAY_CONFLICT",
  );
  assert.equal(
    check(
      { ...raw, evidence: [{ field: "local_start", text: "明天上午09:34" }] },
      "星河科技 明天上午09:34",
    ).reason,
    "RELATIVE_DATE_CONFLICT",
  );
});
test("ordinary receipts and assessment-only notices do not become interviews", () => {
  assert.equal(mailCandidate("付款收据", "已支付"), false);
  assert.equal(
    check({ is_interview: false, action: "ignore" }, "招聘笔试通知").action,
    "ignore",
  );
});
test("cancellation requires literal cancellation evidence", () => {
  assert.equal(check({ ...raw, action: "cancel" }).action, "review");
  assert.equal(
    check(
      {
        ...raw,
        action: "cancel",
        evidence: [{ field: "action", text: "取消面试" }],
      },
      "星河科技：取消面试",
    ).action,
    "cancel",
  );
});
test("optional fields and URLs are not invented from missing context", () => {
  const a = check({
    ...raw,
    meeting_url: "https://example.com/meeting",
    location: "未知地址",
    contact: "张老师",
  });
  assert.equal(a.meeting_url, null);
  assert.equal(a.location, null);
  assert.equal(a.contact, null);
});
const ics =
  "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:interview-1\r\nSEQUENCE:2\r\nSUMMARY:星河科技产品经理一面\r\nDTSTART;TZID=Asia/Shanghai:20261016T093400\r\nDTEND;TZID=Asia/Shanghai:20261016T103400\r\nORGANIZER:mailto:hr@example.com\r\nEND:VEVENT\r\nEND:VCALENDAR";
test("calendar attachment supplies stable UID, sequence and timezone", () => {
  const c = parseSingleCalendar(ics);
  assert.equal(c?.uid, "interview-1");
  assert.equal(c?.sequence, 2);
  assert.equal(c?.start, "2026-10-16T01:34:00.000Z");
  assert.equal(c?.end, "2026-10-16T02:34:00.000Z");
});
test("recurring and multiple events require review", () => {
  assert.equal(
    parseSingleCalendar(ics.replace("UID:", "RRULE:FREQ=WEEKLY\r\nUID:")),
    null,
  );
  assert.equal(
    parseSingleCalendar(
      ics.replace(
        "END:VCALENDAR",
        "BEGIN:VEVENT\r\nUID:second\r\nEND:VEVENT\r\nEND:VCALENDAR",
      ),
    ),
    null,
  );
});
test("calendar and body disagreement is held for confirmation", () => {
  const c = parseSingleCalendar(ics);
  const a = validateMailAnalysis(
    {
      ...raw,
      local_start: "2026-10-16T10:34",
      evidence: [{ field: "local_start", text: "2026年10月16日 10:34" }],
    },
    "星河科技 2026年10月16日 10:34",
    "Asia/Shanghai",
    "2026-10-14T06:00:00Z",
    c,
  );
  assert.equal(a.reason, "CALENDAR_TEXT_CONFLICT");
});
