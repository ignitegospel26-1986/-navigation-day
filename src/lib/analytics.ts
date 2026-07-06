/**
 * Pure analytics helpers. They run on the raw rows read live from the user's
 * Sheet — nothing is cached on our side. No external NLP: keyword frequency is
 * a lightweight CJK bigram count.
 */

export interface EnergyPoint {
  date: string;
  energy: number | null;
  direction: number | null;
}
export interface PatternCount {
  term: string;
  count: number;
}
export interface QuarterStat {
  label: string;
  avgEnergy: number | null;
  count: number;
}
export interface ToneMix {
  month: string; // YYYY-MM
  gentle: number;
  sharp: number;
}
export interface Analytics {
  energyTrend: EnergyPoint[];
  patterns: PatternCount[];
  quarterCompare: { current: QuarterStat; previous: QuarterStat } | null;
  toneMix: ToneMix;
  totals: { daily: number; weekly: number; quarterly: number };
}

const num = (v: string | undefined): number | null => {
  if (v === undefined) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

export function buildEnergyTrend(
  rows: string[][],
  dateIdx: number,
  energyIdx: number,
  directionIdx: number
): EnergyPoint[] {
  return rows
    .map((r) => ({
      date: (r[dateIdx] ?? "").trim(),
      energy: num(r[energyIdx]),
      direction: num(r[directionIdx]),
    }))
    .filter((p) => p.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Characters that make a bigram uninteresting (function words / particles).
const STOP = new Set(
  "我你他她它們的了是在不有和也就都很會讓把對這那一個自己什麼沒要想到卻還被為與及或但因所以之其如果".split(
    ""
  )
);
const isCJK = (ch: string) => /[一-鿿]/.test(ch);

export function buildPatterns(texts: string[], topN = 12): PatternCount[] {
  const counts = new Map<string, number>();
  for (const raw of texts) {
    const t = (raw ?? "").trim();
    if (!t) continue;
    for (let i = 0; i < t.length - 1; i++) {
      const a = t[i];
      const b = t[i + 1];
      if (!isCJK(a) || !isCJK(b)) continue;
      if (STOP.has(a) && STOP.has(b)) continue;
      const bg = a + b;
      counts.set(bg, (counts.get(bg) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
  const repeated = sorted.filter((p) => p.count >= 2);
  return (repeated.length ? repeated : sorted).slice(0, topN);
}

/** "2026-Q3" arithmetic. */
export function quarterLabel(d: Date): string {
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}
export function prevQuarterLabel(label: string): string {
  const [yStr, qStr] = label.split("-Q");
  let y = Number(yStr);
  let q = Number(qStr) - 1;
  if (q < 1) {
    q = 4;
    y -= 1;
  }
  return `${y}-Q${q}`;
}
function dateToQuarter(date: string): string | null {
  const m = date.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

/** Gentle vs sharp tone usage among this month's daily records. */
export function buildToneMix(
  rows: string[][],
  dateIdx: number,
  toneIdx: number,
  now = new Date()
): ToneMix {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let gentle = 0;
  let sharp = 0;
  for (const r of rows) {
    if (!(r[dateIdx] ?? "").trim().startsWith(month)) continue;
    const t = (r[toneIdx] ?? "").trim();
    if (t === "犀利") sharp++;
    else if (t === "溫柔") gentle++;
  }
  return { month, gentle, sharp };
}

export function buildQuarterCompare(
  rows: string[][],
  dateIdx: number,
  energyIdx: number,
  now = new Date()
): { current: QuarterStat; previous: QuarterStat } {
  const current = quarterLabel(now);
  const previous = prevQuarterLabel(current);

  const stat = (label: string): QuarterStat => {
    const energies = rows
      .filter((r) => dateToQuarter((r[dateIdx] ?? "").trim()) === label)
      .map((r) => num(r[energyIdx]))
      .filter((n): n is number => n !== null);
    const avg =
      energies.length > 0
        ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10
        : null;
    return { label, avgEnergy: avg, count: energies.length };
  };

  return { current: stat(current), previous: stat(previous) };
}
