import { NextResponse } from "next/server";

// Lightweight liveness probe for uptime checks / Cloud Run. No auth, no I/O.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
