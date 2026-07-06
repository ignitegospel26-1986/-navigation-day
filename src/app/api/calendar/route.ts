import { NextResponse } from "next/server";
import { requireToken } from "@/lib/api-helpers";
import {
  countReminders,
  removeReminders,
  syncReminders,
  type ReminderOptions,
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

/** DELETE /api/calendar → remove the app's reminders from the user's calendar. */
export async function DELETE() {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await removeReminders(token);
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

  let body: Partial<ReminderOptions>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const opts: ReminderOptions = {
    startDate: body.startDate ?? "",
    dailyTime: body.dailyTime ?? "21:00",
    weeklyTime: body.weeklyTime ?? "20:00",
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
    const result = await syncReminders(token, opts);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("calendar sync failed", err);
    return NextResponse.json({ error: "calendar_failed" }, { status: 502 });
  }
}
