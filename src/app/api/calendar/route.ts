import { NextResponse } from "next/server";
import { requireToken } from "@/lib/api-helpers";
import {
  removeReminders,
  syncReminders,
  syncStatus,
  type ReminderOptions,
  type ReminderType,
} from "@/lib/google";

const TIME = /^\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ALL: ReminderType[] = ["daily", "weekly", "quarterly"];

const parseTypes = (input: unknown): ReminderType[] => {
  const list = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];
  return ALL.filter((t) => list.includes(t));
};

/** GET /api/calendar → which reminder series are currently synced. */
export async function GET() {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await syncStatus(token));
  } catch (err) {
    console.error("calendar status failed", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 502 });
  }
}

/** DELETE /api/calendar?types=daily,weekly → remove the given reminders. */
export async function DELETE(req: Request) {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const types = parseTypes(new URL(req.url).searchParams.get("types"));
  if (!types.length)
    return NextResponse.json({ error: "no_types" }, { status: 400 });
  try {
    const result = await removeReminders(token, types);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("calendar remove failed", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 502 });
  }
}

/** POST /api/calendar → create/replace the given reminders (default: all). */
export async function POST(req: Request) {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Partial<ReminderOptions> & { types?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const types = body.types === undefined ? ALL : parseTypes(body.types);
  if (!types.length)
    return NextResponse.json({ error: "no_types" }, { status: 400 });

  const clampInt = (v: unknown, lo: number, hi: number, dflt: number) =>
    typeof v === "number" && v >= lo && v <= hi ? Math.floor(v) : dflt;

  const opts: ReminderOptions = {
    startDate: body.startDate ?? "",
    dailyWeekdaysOnly: body.dailyWeekdaysOnly !== false, // default true
    dailyTime: body.dailyTime ?? "21:00",
    weeklyDay: clampInt(body.weeklyDay, 0, 6, 0),
    weeklyTime: body.weeklyTime ?? "20:00",
    quarterlyDay: clampInt(body.quarterlyDay, 1, 90, 1),
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
    const result = await syncReminders(token, opts, types);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("calendar sync failed", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 502 });
  }
}
