import { DateTime } from "luxon";

export type MailSyncAction =
  | "create"
  | "reschedule"
  | "cancel"
  | "review"
  | "ignore";
export interface MailSyncAnalysis {
  action: MailSyncAction;
  company_name?: string;
  position_name?: string | null;
  round?: string | null;
  interview_time?: string | null;
  end_time?: string | null;
  timezone?: string;
  interview_type?: "视频" | "电话" | "现场" | null;
  meeting_url?: string | null;
  location?: string | null;
  contact?: string | null;
  prior_time?: string | null;
  reason?: string;
  evidence?: { field: string; text: string }[];
  ics_uid?: string;
  organizer?: string;
  sequence?: number;
  target_id?: string;
  target_version?: number;
  current?: Record<string, unknown>;
}
export function latestMailBody(text: string): string {
  return text
    .split(
      /\n(?:On .+wrote:|在.+写道[：:]|[-_]{2,}\s*(?:原始邮件|Original Message)|发件人[：:]|From[：:])/i,
    )[0]
    .replace(/^>.*$/gm, "")
    .trim();
}
export function mailCandidate(
  subject: string,
  body: string,
  calendars: string[] = [],
) {
  return (
    calendars.length > 0 ||
    /面试|interview|面谈|邀约|招聘|日程|会议邀请|meeting invitation|腾讯会议|飞书会议|zoom|teams/i.test(
      subject + "\n" + body,
    )
  );
}
export function localMailTime(
  value: unknown,
  zone = "Asia/Shanghai",
): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(value)
  )
    return null;
  const t = DateTime.fromISO(value, { zone });
  if (
    !t.isValid ||
    t.toFormat("yyyy-MM-dd'T'HH:mm") !== value.slice(0, 16) ||
    t.getPossibleOffsets().length !== 1
  )
    return null;
  return t.toUTC().toISO();
}
export interface CalendarEvent {
  uid: string;
  organizer: string;
  sequence: number;
  start: string | null;
  end: string | null;
  cancelled: boolean;
  zone: string;
  summary: string;
  raw: string;
}
export function parseSingleCalendar(
  raw: string,
  defaultZone = "Asia/Shanghai",
): CalendarEvent | null {
  const source = raw.replace(/\r?\n[ \t]/g, "");
  if (
    (source.match(/BEGIN:VEVENT/g) ?? []).length !== 1 ||
    /\n(?:RRULE|RDATE|RECURRENCE-ID)[;:]/.test(source)
  )
    return null;
  const event = source.split("BEGIN:VEVENT")[1]?.split("END:VEVENT")[0] ?? "";
  const property = (name: string) =>
    event.match(new RegExp(`(?:^|\\n)${name}([^:]*)\\:([^\\r\\n]*)`));
  const dt = (name: string) => {
    const m = property(name);
    if (!m || !/^\d{8}T\d{6}Z?$/.test(m[2])) return null;
    const z = m[2].endsWith("Z")
      ? "UTC"
      : m[1].match(/TZID=([^;]+)/)?.[1] || defaultZone;
    const t = DateTime.fromFormat(m[2].replace(/Z$/, ""), "yyyyMMdd'T'HHmmss", {
      zone: z,
    });
    return t.isValid &&
      t.toFormat("yyyyMMdd'T'HHmmss") === m[2].replace(/Z$/, "") &&
      t.getPossibleOffsets().length === 1
      ? t.toUTC().toISO()
      : null;
  };
  const uid = property("UID")?.[2];
  if (!uid) return null;
  return {
    uid,
    organizer: property("ORGANIZER")?.[2]?.replace(/^mailto:/i, "") || "",
    sequence: Number(property("SEQUENCE")?.[2] || 0),
    start: dt("DTSTART"),
    end: dt("DTEND"),
    cancelled:
      /(?:^|\n)STATUS:CANCELLED/.test(event) ||
      /(?:^|\n)METHOD:CANCEL/.test(source),
    zone: property("DTSTART")?.[1]?.match(/TZID=([^;]+)/)?.[1] || defaultZone,
    summary: property("SUMMARY")?.[2] || "",
    raw: event,
  };
}
const review = (
  reason: string,
  extra: Partial<MailSyncAnalysis> = {},
): MailSyncAnalysis => ({ ...extra, action: "review", reason });
export function validateMailAnalysis(
  raw: unknown,
  source: string,
  defaultZone: string,
  receivedAt: string,
  calendar?: CalendarEvent | null,
): MailSyncAnalysis {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return review("INVALID_AI_RESULT");
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.events)) return review("MULTIPLE_EVENTS_REVIEW");
  if (r.action === "ignore" || r.is_interview === false)
    return { action: "ignore", reason: "NOT_AN_INTERVIEW" };
  const clean = (key: string, max = 200) =>
    typeof r[key] === "string"
      ? (r[key] as string).trim().slice(0, max) || null
      : null;
  const evidence = Array.isArray(r.evidence)
    ? r.evidence.filter(
        (e): e is { field: string; text: string } =>
          !!e &&
          typeof e === "object" &&
          typeof (e as { field?: unknown }).field === "string" &&
          typeof (e as { text?: unknown }).text === "string",
      )
    : [];
  const out: MailSyncAnalysis = {
    action: "review",
    company_name: clean("company_name") || "",
    position_name: clean("position_name"),
    round: clean("round"),
    interview_type: ["视频", "电话", "现场"].includes(String(r.interview_type))
      ? (r.interview_type as "视频" | "电话" | "现场")
      : null,
    location: clean("location", 800),
    contact: clean("contact", 300),
    meeting_url: clean("meeting_url", 1200),
    evidence,
    timezone: clean("timezone", 80) || defaultZone,
  };
  const body =
    latestMailBody(source) +
    (calendar
      ? `\n${calendar.summary}\n${calendar.raw}\n${calendar.start || ""}`
      : "");
  if (
    r.action === "review" ||
    r.certainty !== "confirmed" ||
    (Array.isArray(r.ambiguities) && r.ambiguities.length)
  )
    return review("TIME_AMBIGUOUS", out);
  if (
    r.action !== "cancel" &&
    /尚未确定|时间另行通知|暂定|备选|可选|tentative|to be confirmed/i.test(
      latestMailBody(source),
    )
  )
    return review("TIME_AMBIGUOUS", out);
  if (
    !out.company_name ||
    !body.toLowerCase().includes(out.company_name.toLowerCase())
  )
    return review("COMPANY_NOT_VERIFIED", out);
  if (
    out.meeting_url &&
    (!/^https:\/\//i.test(out.meeting_url) || !body.includes(out.meeting_url))
  )
    out.meeting_url = null;
  for (const key of ["location", "contact", "position_name", "round"] as const)
    if (out[key] && !body.includes(out[key]!)) out[key] = null;
  if (!["create", "reschedule", "cancel"].includes(String(r.action)))
    return review("INVALID_ACTION", out);
  if (
    !evidence.length ||
    evidence.some((e) => !body.includes(e.text) || e.text.length < 2)
  )
    return review("EVIDENCE_NOT_VERIFIED", out);
  if (r.action === "cancel") {
    if (
      !calendar?.cancelled &&
      !evidence.some((e) => /取消|撤销|cancel/i.test(e.text))
    )
      return review("CANCEL_NOT_VERIFIED", out);
    if (
      evidence.some((e) =>
        /(?:如果|如需|若|if ).{0,40}(?:取消|cancel)/i.test(e.text),
      )
    )
      return review("CANCEL_NOT_VERIFIED", out);
    out.action = "cancel";
  } else {
    out.interview_time = localMailTime(r.local_start, out.timezone);
    if (calendar?.start) {
      const latest = latestMailBody(source);
      const textEvidence = evidence.filter(
        (e) => /time|start|日期|时间/i.test(e.field) && latest.includes(e.text),
      );
      if (
        textEvidence.length &&
        (!out.interview_time ||
          DateTime.fromISO(out.interview_time).toMillis() !==
            DateTime.fromISO(calendar.start).toMillis())
      )
        return review("CALENDAR_TEXT_CONFLICT", out);
      out.interview_time = calendar.start;
      out.end_time = calendar.end;
      out.action = r.action as MailSyncAction;
      out.ics_uid = calendar.uid;
      out.organizer = calendar.organizer;
      out.sequence = calendar.sequence;
      return out;
    }
    if (
      !out.interview_time ||
      !evidence.some(
        (e) =>
          /\d|明天|后天/.test(e.text) && /time|start|日期|时间/i.test(e.field),
      )
    )
      return review("TIME_NOT_VERIFIED", out);
    const original = evidence
      .filter((e) => /time|start|日期|时间/i.test(e.field))
      .map((e) => e.text)
      .join(" ");
    const explicitDate =
      /(?:20\d\d[年/.-])?\d{1,2}[月/.-]\d{1,2}|明天|后天|tomorrow|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)/i.test(
        original,
      );
    const explicitClock =
      /\d{1,2}[:：]\d{2}|(?:\d{1,2}|[一二三四五六七八九十]{1,3})(?:点|时)|\d{1,2}\s*(?:am|pm)\b/i.test(
        original,
      );
    if (!explicitDate || !explicitClock)
      return review("TIME_NOT_VERIFIED", out);
    const start = DateTime.fromISO(String(r.local_start), {
      zone: out.timezone,
    });
    const reference = DateTime.fromISO(receivedAt).setZone(out.timezone!);
    const years = [...original.matchAll(/\b(20\d\d)[年/.-]/g)].map(
      (m) => +m[1],
    );
    if (years.length && !years.includes(start.year))
      return review("YEAR_CONFLICT", out);
    if (
      !years.length &&
      start.year !== reference.year &&
      !/明天|后天|tomorrow/i.test(original)
    )
      return review("YEAR_AMBIGUOUS", out);
    if (/明天|后天/.test(original)) {
      const d = reference.plus({ days: original.includes("后天") ? 2 : 1 });
      if (start.toISODate() !== d.toISODate())
        return review("RELATIVE_DATE_CONFLICT", out);
    }
    const monthDay = original.match(
      /(?:20\d\d[年/.-])?(\d{1,2})[月/.-](\d{1,2})[日号]?/,
    );
    if (
      monthDay &&
      (start.month !== +monthDay[1] || start.day !== +monthDay[2])
    )
      return review("DATE_CONFLICT", out);
    const time = original.match(/(\d{1,2})[:：](\d{2})/);
    if (time) {
      let h = +time[1];
      if (/下午|晚上/.test(original) && h < 12) h += 12;
      if (start.hour !== h || start.minute !== +time[2])
        return review("CLOCK_CONFLICT", out);
    }
    if (!time) {
      const clock = original.match(/(\d{1,2})(?:点|时)(?:(\d{1,2})分)?(半)?/);
      if (clock) {
        let h = +clock[1];
        if (/下午|晚上/.test(original) && h < 12) h += 12;
        const minute = clock[3] ? 30 : Number(clock[2] || 0);
        if (start.hour !== h || start.minute !== minute)
          return review("CLOCK_CONFLICT", out);
      }
    }
    const weekday = original.match(/(?:周|星期)([一二三四五六日天])/);
    if (
      weekday &&
      start.weekday !==
        "一二三四五六日".indexOf(weekday[1].replace("天", "日")) + 1
    )
      return review("WEEKDAY_CONFLICT", out);
    if (
      calendar?.start &&
      DateTime.fromISO(out.interview_time).toMillis() !==
        DateTime.fromISO(calendar.start).toMillis()
    )
      return review("CALENDAR_TEXT_CONFLICT", out);
    const duration = r.local_end
      ? localMailTime(r.local_end, out.timezone)
      : calendar?.end;
    out.end_time =
      duration &&
      DateTime.fromISO(duration).toMillis() >
        DateTime.fromISO(out.interview_time).toMillis()
        ? duration
        : null;
    out.action = r.action as MailSyncAction;
  }
  out.prior_time = localMailTime(r.prior_start, out.timezone);
  if (calendar) {
    out.ics_uid = calendar.uid;
    out.organizer = calendar.organizer;
    out.sequence = calendar.sequence;
  }
  return out;
}

export const MAIL_SYNC_REASONS: Record<string, string> = {
  PAST_INTERVIEW_REVIEW: "邮件中的面试时间已过，请确认是否补充历史记录",
  AI_NOT_CONFIGURED: "请先配置 AI API",
  AI_AUTH_INVALID: "AI API 无效，请更新密钥",
  AI_QUOTA_EXCEEDED: "AI 额度不足，请检查余额",
  AI_FAILED: "AI 识别暂时失败，稍后会重试",
  MAIL_AUTH_INVALID: "邮箱授权失效，请更新授权码",
  MAIL_FAILED: "暂时无法连接邮箱，稍后会重试",
  TIME_AMBIGUOUS: "日期或时间尚未明确",
  TIME_NOT_VERIFIED: "需要确认面试时间",
  COMPANY_NOT_VERIFIED: "需要确认公司名称",
  MANUAL_EDIT_CONFLICT: "邮件安排与你的手动修改不同",
  POSSIBLE_DUPLICATE: "可能与现有面试重复",
  TARGET_NOT_IDENTIFIED: "无法确定要更新哪一场面试",
  MATCH_AMBIGUOUS: "存在多个可能关联的面试",
  MANUAL_RECORD_REVIEW: "请确认是否更新手动安排",
  MULTIPLE_EVENTS_REVIEW: "邮件包含多个日程，请分别确认",
  BODY_INCOMPLETE: "正文或附件需要人工核对",
  CALENDAR_TEXT_CONFLICT: "邮件正文与日历附件时间不一致",
  YEAR_AMBIGUOUS: "年份存在歧义",
  YEAR_CONFLICT: "年份与原文不一致",
  DATE_CONFLICT: "日期与原文不一致",
  CLOCK_CONFLICT: "时间与原文不一致",
  WEEKDAY_CONFLICT: "日期和星期不一致",
  EVIDENCE_NOT_VERIFIED: "需要核对原邮件内容",
  RELATIVE_DATE_CONFLICT: "相对日期需要核对",
  INVALID_AI_RESULT: "识别结果需要人工核对",
  EXTRACTION_FAILED: "识别多次失败，可手动填写",
};
