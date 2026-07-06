import { NextResponse } from "next/server";
import { requireToken } from "@/lib/api-helpers";
import {
  createSpace,
  ensureTabs,
  findSpace,
  restoreSpace,
} from "@/lib/google";

/**
 * GET /api/space → returning-user detection, entirely from the user's Drive.
 *  - no space            → { exists:false }
 *  - space in trash      → { exists:true, trashed:true, space }  (offer restore/rebuild)
 *  - healthy space       → { exists:true, trashed:false, space, repaired } (auto-fix missing tabs)
 */
export async function GET() {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const space = await findSpace(token);
    if (!space) return NextResponse.json({ exists: false, space: null });
    if (space.trashed)
      return NextResponse.json({ exists: true, trashed: true, space });

    // Heal any manually-deleted tabs without touching existing data.
    const { repaired } = await ensureTabs(token, space.spreadsheetId);
    return NextResponse.json({ exists: true, trashed: false, space, repaired });
  } catch (err) {
    console.error("space GET failed", err);
    return NextResponse.json({ error: "drive_error" }, { status: 502 });
  }
}

/**
 * POST /api/space
 *  - { action: "restore" } → un-trash the binned space and heal its tabs
 *  - { action: "create" } / no body → create fresh (idempotent: never duplicates
 *    an ACTIVE space; a trashed one is left alone when the user chose "create new")
 */
export async function POST(req: Request) {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let action = "create";
  try {
    const body = await req.json();
    if (body?.action === "restore") action = "restore";
  } catch {
    /* empty body → default create */
  }

  try {
    const existing = await findSpace(token);

    if (action === "restore") {
      if (existing?.trashed) {
        await restoreSpace(token, existing.spreadsheetId, existing.folderId);
        await ensureTabs(token, existing.spreadsheetId);
        return NextResponse.json({
          space: { ...existing, trashed: false },
          restored: true,
        });
      }
      if (existing) return NextResponse.json({ space: existing, restored: false });
      const space = await createSpace(token);
      return NextResponse.json({ space, created: true });
    }

    // create: don't duplicate an active space; otherwise make a fresh one.
    if (existing && !existing.trashed)
      return NextResponse.json({ space: existing, created: false });

    const space = await createSpace(token);
    return NextResponse.json({ space, created: true });
  } catch (err) {
    console.error("space POST failed", err);
    return NextResponse.json({ error: "create_failed" }, { status: 502 });
  }
}
