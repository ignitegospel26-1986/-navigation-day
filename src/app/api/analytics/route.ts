import { NextResponse } from "next/server";
import { requireToken } from "@/lib/api-helpers";
import { findSpace, readModule } from "@/lib/google";
import { moduleHeaders, SHEET_TABS } from "@/lib/schema";
import {
  Analytics,
  buildEnergyTrend,
  buildPatterns,
  buildQuarterCompare,
  buildToneMix,
} from "@/lib/analytics";

/** GET /api/analytics → computed live from the user's Sheet, never cached. */
export async function GET() {
  const token = await requireToken();
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const space = await findSpace(token);
    if (!space) return NextResponse.json({ error: "no_space" }, { status: 404 });

    const [daily, weekly, quarterly] = await Promise.all([
      readModule(token, space.spreadsheetId, "daily"),
      readModule(token, space.spreadsheetId, "weekly"),
      readModule(token, space.spreadsheetId, "quarterly"),
    ]);

    const dHead = moduleHeaders("daily");
    const dateIdx = dHead.indexOf(SHEET_TABS.daily.period);
    const energyIdx = dHead.indexOf("活力值");
    const directionIdx = dHead.indexOf("靠近渴望的生活");
    const toneIdx = dHead.indexOf("語氣");

    const wHead = moduleHeaders("weekly");
    const weeklyPatternIdx = wHead.indexOf("內在模式");
    const qHead = moduleHeaders("quarterly");
    const qPatternIdx = qHead.indexOf("單一內在模式");

    const patternTexts = [
      ...weekly.map((r) => r[weeklyPatternIdx] ?? ""),
      ...quarterly.map((r) => r[qPatternIdx] ?? ""),
    ];

    const analytics: Analytics = {
      energyTrend: buildEnergyTrend(daily, dateIdx, energyIdx, directionIdx),
      patterns: buildPatterns(patternTexts),
      quarterCompare: buildQuarterCompare(daily, dateIdx, energyIdx),
      toneMix: buildToneMix(daily, dateIdx, toneIdx),
      totals: {
        daily: daily.length,
        weekly: weekly.length,
        quarterly: quarterly.length,
      },
    };

    return NextResponse.json(analytics);
  } catch (err) {
    console.error("analytics failed", err);
    return NextResponse.json({ error: "analytics_failed" }, { status: 502 });
  }
}
