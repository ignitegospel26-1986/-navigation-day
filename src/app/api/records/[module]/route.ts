import { NextResponse } from "next/server";
import { requireToken } from "@/lib/api-helpers";
import {
  appendRow,
  findRecordRow,
  findSpace,
  readModule,
  updateRow,
} from "@/lib/google";
import { MODULES, ModuleKey, Tone } from "@/lib/prompts";
import { buildRow, moduleHeaders, parseRow } from "@/lib/schema";

function isModule(value: string): value is ModuleKey {
  return value === "daily" || value === "weekly" || value === "quarterly";
}

/**
 * GET /api/records/:module
 *   ?period=YYYY-...  → { existing: {period,tone,answers} | null }  (for prefill/edit)
 *   (no period)       → { headers, rows }                          (full list)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const { module } = await params;
  if (!isModule(module))
    return NextResponse.json({ error: "bad_module" }, { status: 400 });

  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const period = new URL(req.url).searchParams.get("period");

  try {
    const space = await findSpace(token);
    if (!space || space.trashed)
      return NextResponse.json({ error: "no_space" }, { status: 404 });

    if (period) {
      const hit = await findRecordRow(token, space.spreadsheetId, module, period);
      return NextResponse.json({
        existing: hit ? parseRow(module, hit.values) : null,
      });
    }

    const rows = await readModule(token, space.spreadsheetId, module);
    return NextResponse.json({ headers: moduleHeaders(module), rows });
  } catch (err) {
    console.error("records GET failed", err);
    return NextResponse.json({ error: "read_failed" }, { status: 502 });
  }
}

/** POST /api/records/:module → upsert one record for its period (edit if it exists). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const { module } = await params;
  if (!isModule(module))
    return NextResponse.json({ error: "bad_module" }, { status: 400 });

  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    period?: string;
    tone?: Tone;
    answers?: Record<string, string | number>;
    spreadsheetId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const tone: Tone = body.tone === "sharp" ? "sharp" : "gentle";
  const answers = body.answers ?? {};

  const missing = MODULES[module]
    .filter((q) => q.required)
    .filter((q) => {
      const v = answers[q.key];
      return v === undefined || v === null || String(v).trim() === "";
    })
    .map((q) => q.key);
  if (missing.length)
    return NextResponse.json({ error: "missing_fields", missing }, { status: 400 });

  try {
    let spreadsheetId = body.spreadsheetId;
    if (!spreadsheetId) {
      const space = await findSpace(token);
      if (!space || space.trashed)
        return NextResponse.json({ error: "no_space" }, { status: 404 });
      spreadsheetId = space.spreadsheetId;
    }

    const period = body.period?.trim() || new Date().toISOString().slice(0, 10);
    const row = buildRow(module, period, tone, answers);

    // One record per period: overwrite if this period already exists.
    const existing = await findRecordRow(token, spreadsheetId, module, period);
    if (existing) {
      await updateRow(token, spreadsheetId, module, existing.rowNumber, row);
      return NextResponse.json({ ok: true, updated: true });
    }
    await appendRow(token, spreadsheetId, module, row);
    return NextResponse.json({ ok: true, updated: false });
  } catch (err) {
    console.error("records POST failed", err);
    return NextResponse.json({ error: "write_failed" }, { status: 502 });
  }
}
