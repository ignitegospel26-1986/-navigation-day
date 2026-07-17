"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { jsonFetch } from "@/lib/client";
import type { Analytics } from "@/lib/analytics";

export function Insights() {
  const [data, setData] = useState<Analytics | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "empty">(
    "loading"
  );

  useEffect(() => {
    jsonFetch<Analytics>("/api/analytics")
      .then((d) => {
        setData(d);
        const nothing =
          d.totals.daily + d.totals.weekly + d.totals.quarterly === 0;
        setState(nothing ? "empty" : "ready");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-hairline bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Brand href="/dashboard" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard" className="btn btn-ghost px-4 py-2 text-sm">
              ← 主控台
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
          分析與洞見
        </h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          即時從你自己的試算表運算，不會留在我們這裡。
        </p>

        {state === "loading" && <SkeletonBlocks />}
        {state === "error" && (
          <p className="mt-10 text-sm text-danger">
            讀取失敗，請重新整理；若剛登入很久了，登入可能過期。
          </p>
        )}
        {state === "empty" && (
          <div className="card mt-10 p-10 text-center">
            <p className="font-serif text-xl text-ink">還沒有足夠的紀錄</p>
            <p className="mt-2 text-[15px] text-ink-soft">
              先做幾次每日打卡，這裡就會長出你的趨勢。
            </p>
            <Link href="/dashboard" className="btn btn-primary mt-6 px-5 py-2.5 text-sm">
              回主控台打卡
            </Link>
          </div>
        )}

        {state === "ready" && data && (
          <div className="mt-10 space-y-10">
            <div className="space-y-4">
              <ToneBar data={data} />
              <EnergyChart data={data} />
            </div>
            <QuarterCompare data={data} />
            <Patterns data={data} />
          </div>
        )}
      </main>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 12,
  color: "var(--ink)",
  fontSize: 13,
} as const;

const RANGE_PRESETS: ["7" | "all", string][] = [
  ["7", "近 7 天"],
  ["all", "全部"],
];

function EnergyChart({ data }: { data: Analytics }) {
  const [preset, setPreset] = useState<"7" | "all">("7");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const custom = from !== "" || to !== "";

  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Resolve the active [lo, hi] date window (YYYY-MM-DD; "" = unbounded).
  let lo = "";
  let hi = "";
  if (custom) {
    lo = from;
    hi = to;
  } else if (preset !== "all") {
    const today = new Date();
    const f = new Date(today);
    f.setDate(today.getDate() - (Number(preset) - 1));
    lo = iso(f);
    hi = iso(today);
  }

  const points = data.energyTrend
    .filter((p) => p.energy !== null || p.direction !== null)
    .filter((p) => (!lo || p.date >= lo) && (!hi || p.date <= hi))
    .map((p) => ({ date: p.date.slice(5), energy: p.energy, direction: p.direction }));

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-xl text-ink">活力值 × 生活方向趨勢</h2>
        <span className="text-[13px] text-muted">{points.length} 筆</span>
      </div>

      {/* range selector: quick presets + custom 起／訖 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {RANGE_PRESETS.map(([v, label]) => {
          const active = !custom && preset === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                setPreset(v);
                setFrom("");
                setTo("");
              }}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-accent text-[#fbf7ee] dark:text-[#16130f]"
                  : "border border-hairline text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
        <span className="mx-1 hidden text-muted sm:inline">|</span>
        {/* keep 起／訖 (and 清除) together on one row */}
        <div className="flex w-full items-center gap-1.5 sm:w-auto">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="起始日期"
            className="field min-w-0 flex-1 px-2 py-1.5 text-[13px] sm:flex-initial"
          />
          <span className="text-muted">–</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-label="結束日期"
            className="field min-w-0 flex-1 px-2 py-1.5 text-[13px] sm:flex-initial"
          />
          {custom && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="btn btn-ghost shrink-0 px-2 py-1 text-[13px]"
            >
              清除
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        {points.length < 2 ? (
          <p className="py-16 text-center text-sm text-muted">
            這個範圍內少於兩筆紀錄，換個時間範圍看看。
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid stroke="var(--hairline)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  stroke="var(--hairline)"
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="energy"
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  stroke="var(--hairline)"
                />
                <YAxis
                  yAxisId="dir"
                  orientation="right"
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  stroke="var(--hairline)"
                />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--muted)" }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }}
                  formatter={(v) => (v === "energy" ? "活力值 (1–10)" : "生活方向 (1–5)")}
                />
                <Line
                  yAxisId="energy"
                  name="energy"
                  type="monotone"
                  dataKey="energy"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Line
                  yAxisId="dir"
                  name="direction"
                  type="monotone"
                  dataKey="direction"
                  stroke="var(--ink-soft)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 2.5, fill: "var(--ink-soft)", strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

/** A slim 100%-width bar: 溫柔 on the left, 犀利 on the right — quick read of
 *  which voice the user leaned on this month. Sits above the trend chart. */
function ToneBar({ data }: { data: Analytics }) {
  const { gentle, sharp, month } = data.toneMix;
  const total = gentle + sharp;
  const gentlePct = total ? Math.round((gentle / total) * 100) : 0;
  const sharpPct = total ? 100 - gentlePct : 0;

  return (
    <div className="card p-5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink">本月語氣傾向</span>
        <span className="text-[12px] text-muted">{month}</span>
      </div>

      {total === 0 ? (
        <p className="py-2 text-[13px] text-muted">本月還沒有每日紀錄。</p>
      ) : (
        <>
          {/* Spectrum track (溫柔 → 犀利) with a marker showing where the user sits */}
          <div className="px-2.5">
            <div
              className="relative h-2.5 w-full rounded-full"
              style={{
                background: "linear-gradient(90deg, var(--accent), var(--ink-soft))",
              }}
            >
              <div
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-ink shadow-md"
                style={{ left: `${sharpPct}%` }}
                title={`偏向 ${gentlePct >= sharpPct ? "溫柔" : "犀利"}`}
              />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[12px]">
            <span className="text-accent">溫柔 {gentlePct}%</span>
            <span className="tabular-nums text-muted">{total} 則</span>
            <span className="text-ink-soft">{sharpPct}% 犀利</span>
          </div>
        </>
      )}
    </div>
  );
}

function QuarterCompare({ data }: { data: Analytics }) {
  const c = data.quarterCompare;
  if (!c) return null;
  const delta =
    c.current.avgEnergy !== null && c.previous.avgEnergy !== null
      ? Math.round((c.current.avgEnergy - c.previous.avgEnergy) * 10) / 10
      : null;

  return (
    <section>
      <h2 className="mb-4 font-serif text-xl text-ink">本季 vs 上季</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label={`本季 ${c.current.label}`}
          avg={c.current.avgEnergy}
          count={c.current.count}
          highlight
        />
        <StatCard
          label={`上季 ${c.previous.label}`}
          avg={c.previous.avgEnergy}
          count={c.previous.count}
        />
      </div>
      {delta !== null && (
        <p className="mt-3 text-[14px] text-ink-soft">
          平均活力{" "}
          <span className={delta >= 0 ? "text-accent" : "text-danger"}>
            {delta >= 0 ? `↑ +${delta}` : `↓ ${delta}`}
          </span>{" "}
          相較上一季。
        </p>
      )}
    </section>
  );
}

function StatCard({
  label,
  avg,
  count,
  highlight,
}: {
  label: string;
  avg: number | null;
  count: number;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-6 ${highlight ? "ring-1 ring-accent/30" : ""}`}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-2 font-serif text-4xl text-ink tabular-nums">
        {avg === null ? "—" : avg}
        <span className="ml-1 text-base text-muted">/ 10</span>
      </p>
      <p className="mt-1 text-[13px] text-muted">{count} 次打卡</p>
    </div>
  );
}

function Patterns({ data }: { data: Analytics }) {
  if (!data.patterns.length) return null;
  const max = data.patterns[0].count;
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-serif text-xl text-ink">內在模式・高頻詞</h2>
        <span className="text-[13px] text-muted">來自每週／季度</span>
      </div>
      <div className="card space-y-2.5 p-6">
        {data.patterns.map((p) => (
          <div key={p.term} className="flex items-center gap-3">
            <span className="w-14 shrink-0 font-serif text-[15px] text-ink">
              {p.term}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(p.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-[13px] tabular-nums text-muted">
              {p.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SkeletonBlocks() {
  return (
    <div className="mt-10 animate-pulse space-y-6">
      <div className="h-64 rounded-2xl bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-32 rounded-2xl bg-surface-2" />
        <div className="h-32 rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}
