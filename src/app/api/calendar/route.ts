import { NextResponse } from "next/server";
import { requireToken } from "@/lib/api-helpers";
import {
  countReminders,
  removeReminders,
  syncReminders,
  type ReminderOptions,
  type SyncScope,
} from "@/lib/google";

const TIME = /^\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/calendar → is the app's reminders currently synced? */
export async function GET() {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const status = await countReminders(token);
    return NextResponse.json(status);
  } catch (err) {
    console.error("calendar status failed", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 502 });
  }
}

/** DELETE /api/calendar?which=all|daily|weekly|quarterly → remove reminders. */
export async function DELETE(req: Request) {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const w = new URL(req.url).searchParams.get("which");
  const which: SyncScope = (["daily", "weekly", "quarterly"] as const).includes(
    w as never
  )
    ? (w as SyncScope)
    : "all";
  try {
    const result = await removeReminders(token, which);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("calendar remove failed", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 502 });
  }
}

/** POST /api/calendar → create/replace recurring reminders in the user's calendar. */
export async function POST(req: Request) {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Partial<ReminderOptions> & { which?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const clampInt = (v: unknown, lo: number, hi: number, dflt: number) =>
    typeof v === "number" && v >= lo && v <= hi ? Math.floor(v) : dflt;

  const which: SyncScope = (["daily", "weekly", "quarterly"] as const).includes(
    body.which as never
  )
    ? (body.which as SyncScope)
    : "all";

  const opts: ReminderOptions = {
    startDate: body.startDate ?? "",
    dailyWeekdaysOnly: body.dailyWeekdaysOnly !== false, // default true
    dailyTime: body.dailyTime ?? "21:00",
    weeklyDay: clampInt(body.weeklyDay, 0, 6, 0),
    weeklyTime: body.weeklyTime ?? "20:00",
    quarterlyDay: clampInt(body.quarterlyDay, 1, 28, 1),
    quarterlyTime: body.quarterlyTime ?? "10:00",
    timeZone: body.timeZone || "Asia/Taipei",
  };

  if (
    !DATE.test(opts.startDate) ||
    !TIME.test(opts.dailyTime) ||
    !TIME.test(opts.weeklyTime)
  ) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }

  try {
    const result = await syncReminders(token, opts, which);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("calendar sync failed", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 502 });
  }
}
