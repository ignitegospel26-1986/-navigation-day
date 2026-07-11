import { NextResponse } from "next/server";
import { requireToken } from "@/lib/api-helpers";
import { readSettings, writeSettings } from "@/lib/google";

/**
 * GET  /api/settings?spreadsheetId=… → { settings: Record<string,string> | null }
 * PUT  /api/settings  { spreadsheetId, settings } → persist to the 設定 tab
 *
 * Settings live in the user's own spreadsheet (a 設定 tab), so preferences
 * follow them across browsers/devices. drive.file scope means the token can
 * only touch files THIS app created, so the spreadsheetId is safe to accept.
 */
export async function GET(req: Request) {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const spreadsheetId = new URL(req.url).searchParams.get("spreadsheetId");
  if (!spreadsheetId)
    return NextResponse.json({ error: "missing_spreadsheet" }, { status: 400 });

  try {
    const settings = await readSettings(token, spreadsheetId);
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("settings GET failed", err);
    return NextResponse.json({ error: "read_failed" }, { status: 502 });
  }
}

export async function PUT(req: Request) {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { spreadsheetId?: string; settings?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.spreadsheetId || !body.settings)
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  try {
    await writeSettings(token, body.spreadsheetId, body.settings);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings PUT failed", err);
    return NextResponse.json({ error: "write_failed" }, { status: 502 });
  }
}
