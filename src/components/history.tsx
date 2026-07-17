"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Modal } from "@/components/ui/modal";
import { ScaleInput } from "@/components/scale-input";
import { IdentityCard } from "@/components/identity-card";
import { MODULES, ModuleKey, prompt, type Tone } from "@/lib/prompts";
import { parseRow } from "@/lib/schema";
import {
  jsonFetch,
  useWeekStart,
  dailyPeriod,
  useConfirmSave,
} from "@/lib/client";

type Rows = string[][];
type Axis = "entry" | "question";
type Detail = { module: ModuleKey; period: string; values: string[] | null };

const MODE_LABEL: Record<ModuleKey, string> = {
  daily: "每日",
  weekly: "每週",
  quarterly: "季度",
};

export function History() {
  const [weekStart] = useWeekStart();
  const [rows, setRows] = useState<Record<ModuleKey, Rows>>({
    daily: [],
    weekly: [],
    quarterly: [],
  });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [axis, setAxis] = useState<Axis>("entry");
  const [mode, setMode] = useState<ModuleKey>("daily");
  const [questionKey, setQuestionKey] = useState<string>(MODULES.daily[0].key);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  // Reset the selected question whenever the module changes.
  useEffect(() => {
    setQuestionKey(MODULES[mode][0].key);
  }, [mode]);

  // Re-fetch one module's rows (used after an in-place edit).
  const loadModule = useCallback((m: ModuleKey) => {
    jsonFetch<{ rows: Rows }>(`/api/records/${m}`)
      .then((d) => setRows((prev) => ({ ...prev, [m]: d.rows ?? [] })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all(
      (["daily", "weekly", "quarterly"] as ModuleKey[]).map((m) =>
        jsonFetch<{ rows: Rows }>(`/api/records/${m}`).then((d) => [m, d.rows] as const)
      )
    )
      .then((pairs) => {
        const next = { daily: [], weekly: [], quarterly: [] } as Record<ModuleKey, Rows>;
        for (const [m, r] of pairs) next[m] = r ?? [];
        setRows(next);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    jsonFetch<{ space: { webViewLink?: string } | null }>("/api/space")
      .then((d) => setSheetUrl(d.space?.webViewLink ?? null))
      .catch(() => {});
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
              紀錄
            </h1>
            <p className="mt-2 text-[15px] text-ink-soft">
              翻看你走過的每一天，或追一個問題的答案怎麼變。
            </p>
          </div>
          {/* axis switch: 逐筆 / 逐題 */}
          <Segmented
            options={[
              ["entry", "逐筆看"],
              ["question", "逐題看"],
            ]}
            value={axis}
            onChange={(v) => setAxis(v as Axis)}
          />
        </div>

        {/* module switch */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Segmented
            options={(["daily", "weekly", "quarterly"] as ModuleKey[]).map((m) => [
              m,
              MODE_LABEL[m],
            ])}
            value={mode}
            onChange={(v) => setMode(v as ModuleKey)}
          />

          {axis === "question" && (
            <select
              value={questionKey}
              onChange={(e) => setQuestionKey(e.target.value)}
              className="field max-w-full px-3 py-2 text-sm"
            >
              {MODULES[mode].map((q) => (
                <option key={q.key} value={q.key}>
                  {q.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {state === "loading" && (
          <div className="mt-8 h-80 animate-pulse rounded-2xl bg-surface-2" />
        )}
        {state === "error" && (
          <p className="mt-8 text-sm text-danger">讀取失敗，請重新整理。</p>
        )}

        {state === "ready" && (
          <div className="mt-8">
            {axis === "question" ? (
              <QuestionTimeline module={mode} questionKey={questionKey} rows={rows[mode]} />
            ) : mode === "daily" ? (
              <MonthCalendar
                rows={rows.daily}
                weekStart={weekStart}
                onPick={(period, values) => setDetail({ module: "daily", period, values })}
              />
            ) : (
              <EntryList
                module={mode}
                rows={rows[mode]}
                onPick={(period, values) => setDetail({ module: mode, period, values })}
              />
            )}
          </div>
        )}

        {sheetUrl && (
          <div className="mt-10 border-t border-hairline pt-6">
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost px-4 py-2 text-sm"
            >
              在 Google Sheets 開啟原始紀錄 ↗
            </a>
          </div>
        )}
      </main>

      <DetailModal
        detail={detail}
        onClose={() => setDetail(null)}
        onSaved={loadModule}
      />
    </div>
  );
}

/* ------------------------------- primitives ------------------------------- */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-hairline bg-surface-2/60 p-0.5">
      {options.map(([v, label]) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-[#fbf7ee] dark:text-[#16130f]"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ month calendar ---------------------------- */
function MonthCalendar({
  rows,
  weekStart,
  onPick,
}: {
  rows: Rows;
  weekStart: "sun" | "mon";
  onPick: (period: string, values: string[] | null) => void;
}) {
  const byDate = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of rows) m.set((r[1] ?? "").trim(), r);
    return m;
  }, [rows]);

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const startDow = weekStart === "mon" ? 1 : 0;
  const weekdays =
    weekStart === "mon"
      ? ["一", "二", "三", "四", "五", "六", "日"]
      : ["日", "一", "二", "三", "四", "五", "六"];

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() - startDow + 7) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = dailyPeriod();
  const fmt = (day: number) =>
    `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} className="btn btn-ghost h-8 w-8 !p-0">
          ‹
        </button>
        <p className="font-serif text-lg text-ink tabular-nums">
          {cursor.y} 年 {cursor.m + 1} 月
        </p>
        <button type="button" onClick={() => shift(1)} className="btn btn-ghost h-8 w-8 !p-0">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-muted">
        {weekdays.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const date = fmt(day);
          const has = byDate.has(date);
          const isToday = date === today;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(date, byDate.get(date) ?? null)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                has
                  ? "border-accent/40 bg-accent-tint text-ink hover:border-accent"
                  : "border-transparent text-ink-soft hover:bg-surface-2"
              } ${isToday ? "ring-1 ring-accent" : ""}`}
            >
              <span className="tabular-nums">{day}</span>
              {has && <span className="mt-0.5 h-1.5 w-1.5 rounded-lg bg-accent" />}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[12px] text-muted">
        有紀錄的日子會標記小圓點，點任一天可看當天細項。
      </p>
    </div>
  );
}

/* ---------------------- entry list (weekly / quarterly) ------------------- */
function EntryList({
  module,
  rows,
  onPick,
}: {
  module: ModuleKey;
  rows: Rows;
  onPick: (period: string, values: string[]) => void;
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b[1] ?? "").localeCompare(a[1] ?? "")),
    [rows]
  );

  if (!sorted.length)
    return (
      <div className="card p-10 text-center text-sm text-muted">
        還沒有{MODE_LABEL[module]}紀錄。
      </div>
    );

  return (
    <div className="space-y-3">
      {sorted.map((r, i) => {
        const period = (r[1] ?? "").trim();
        const ts = (r[0] ?? "").trim();
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPick(period, r)}
            className="card flex w-full items-center justify-between gap-4 p-5 text-left transition-shadow hover:shadow-lg"
          >
            <div>
              <p className="font-serif text-[15px] text-ink">
                {periodLabel(module, period)}
              </p>
              {ts && (
                <p className="mt-0.5 text-[12px] text-muted">
                  填寫於 {formatTs(ts)}
                </p>
              )}
            </div>
            <span className="shrink-0 text-lg text-accent">→</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------ question timeline (by-question) ----------------- */
function QuestionTimeline({
  module,
  questionKey,
  rows,
}: {
  module: ModuleKey;
  questionKey: string;
  rows: Rows;
}) {
  const q = MODULES[module].find((x) => x.key === questionKey) ?? MODULES[module][0];

  const items = useMemo(() => {
    return rows
      .map((r) => {
        const { tone, answers } = parseRow(module, r);
        return {
          period: (r[1] ?? "").trim(),
          answer: (answers[q.key] ?? "").trim(),
          tone,
        };
      })
      .filter((it) => it.period && it.answer)
      .sort((a, b) => b.period.localeCompare(a.period));
  }, [rows, module, q.key]);

  return (
    <div>
      <div className="card mb-4 p-5">
        <p className="text-[12px] tracking-wide text-accent">這個問題</p>
        <p className="mt-1 font-serif text-lg leading-snug text-ink">{q.label}</p>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          這個問題還沒有你的回答。
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="card p-5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[13px] text-muted">
                  {periodLabel(module, it.period)}
                </span>
                <span className="rounded-lg border border-hairline px-1.5 py-0.5 text-[10px] text-muted">
                  {it.tone === "sharp" ? "犀利" : "溫柔"}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                {q.type === "scale" ? `${it.answer} / ${q.max}` : it.answer}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- detail ---------------------------------- */
function DetailModal({
  detail,
  onClose,
  onSaved,
}: {
  detail: Detail | null;
  onClose: () => void;
  onSaved: (m: ModuleKey) => void;
}) {
  const open = detail !== null;
  const [confirmSave] = useConfirmSave();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [tone, setTone] = useState<Tone>("gentle");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (!detail) return;
    setShowCard(false);
    if (detail.values) {
      const parsed = parseRow(detail.module, detail.values);
      const a: Record<string, string | number> = {};
      for (const q of MODULES[detail.module]) {
        const raw = parsed.answers[q.key] ?? "";
        if (q.type === "scale") {
          if (raw !== "") a[q.key] = Number(raw);
        } else {
          a[q.key] = raw;
        }
      }
      setAnswers(a);
      setTone(parsed.tone);
    } else {
      setAnswers({});
      setTone("gentle");
    }
    setMode("view");
    setConfirming(false);
    setErr(null);
    setSaving(false);
  }, [detail]);

  const module = detail?.module ?? "daily";
  const questions = MODULES[module];
  const set = (k: string, v: string | number) =>
    setAnswers((a) => ({ ...a, [k]: v }));
  const emptyCount = questions.filter(
    (q) => String(answers[q.key] ?? "").trim() === ""
  ).length;
  const hasAny = emptyCount < questions.length;
  const identityText = String(answers.identity ?? "").trim();

  async function doSave() {
    if (!detail) return;
    setConfirming(false);
    setSaving(true);
    setErr(null);
    try {
      await jsonFetch(`/api/records/${detail.module}`, {
        method: "POST",
        body: JSON.stringify({ period: detail.period, tone, answers }),
      });
      onSaved(detail.module);
      onClose();
    } catch {
      setErr("儲存失敗，請再試一次。");
    } finally {
      setSaving(false);
    }
  }

  function attemptSave() {
    if (!hasAny) {
      setErr("至少填一題才能儲存。");
      return;
    }
    if (confirmSave) {
      setConfirming(true);
      return;
    }
    doSave();
  }

  if (showCard && detail?.module === "quarterly") {
    return (
      <Modal open={open} onClose={onClose} labelledBy="detail-title">
        <IdentityCard
          text={identityText}
          period={detail.period}
          onClose={() => setShowCard(false)}
          closeLabel="返回紀錄"
          celebrate={false}
        />
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="detail-title">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="detail-title" className="font-serif text-2xl text-ink">
            {detail ? periodLabel(detail.module, detail.period) : ""}
          </h2>
          {detail?.values && mode === "view" && (
            <span className="mt-2 inline-block rounded-lg border border-hairline px-2 py-0.5 text-[11px] text-muted">
              當時語氣：{tone === "sharp" ? "犀利" : "溫柔"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {detail?.values && mode === "view" && (
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="btn btn-ghost px-3 py-1.5 text-sm"
            >
              編輯
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="btn btn-ghost h-8 w-8 !p-0 text-lg text-ink-soft"
          >
            ✕
          </button>
        </div>
      </div>

      {mode === "view" && !detail?.values ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted">這裡還沒有紀錄。</p>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="btn btn-primary mt-4 px-5 py-2 text-sm"
          >
            補一筆這天的紀錄
          </button>
        </div>
      ) : mode === "view" ? (
        <div className="max-h-[62vh] space-y-5 overflow-y-auto pr-2">
          {module === "quarterly" && identityText && (
            <button
              type="button"
              onClick={() => setShowCard(true)}
              className="btn btn-primary w-full px-5 py-3 text-sm"
            >
              查看身分宣告卡
            </button>
          )}
          {questions.map((q) => {
            const ans = String(answers[q.key] ?? "").trim();
            return (
              <div key={q.key}>
                <p className="text-[13px] leading-snug text-muted">
                  {prompt(q, tone)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                  {ans || "—"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="max-h-[56vh] space-y-5 overflow-y-auto pr-2">
            {questions.map((q) => (
              <div key={q.key}>
                <label className="mb-2 block text-[14px] font-medium leading-snug text-ink">
                  {prompt(q, tone)}
                </label>
                {q.type === "scale" ? (
                  <ScaleInput
                    min={q.min!}
                    max={q.max!}
                    value={(answers[q.key] as number) ?? null}
                    onChange={(v) => set(q.key, v)}
                    minLabel={q.minLabel}
                    maxLabel={q.maxLabel}
                  />
                ) : q.type === "longtext" ? (
                  <textarea
                    className="field min-h-[72px] resize-y px-3.5 py-2.5 text-[15px] leading-relaxed"
                    value={(answers[q.key] as string) ?? ""}
                    onChange={(e) => set(q.key, e.target.value)}
                  />
                ) : (
                  <input
                    className="field px-3.5 py-2.5 text-[15px]"
                    value={(answers[q.key] as string) ?? ""}
                    onChange={(e) => set(q.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          {err && <p className="mt-3 text-sm text-danger">{err}</p>}

          {confirming ? (
            <div className="mt-5 rounded-xl border border-hairline bg-surface-2/50 p-4">
              <p className="text-[14px] text-ink">
                確定要儲存這筆紀錄嗎？
                {emptyCount > 0 ? `（還有 ${emptyCount} 題空白）` : ""}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={doSave}
                  disabled={saving}
                  className="btn btn-primary px-5 py-2 text-sm disabled:opacity-50"
                >
                  {saving ? "儲存中⋯" : "確定儲存"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="btn btn-ghost px-4 py-2 text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => (detail?.values ? setMode("view") : onClose())}
                className="btn btn-ghost px-4 py-2 text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={attemptSave}
                disabled={saving || !hasAny}
                className="btn btn-primary px-5 py-2 text-sm disabled:opacity-40"
              >
                {saving ? "儲存中⋯" : "儲存修改"}
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/* --------------------------------- labels --------------------------------- */
function periodLabel(module: ModuleKey, period: string): string {
  if (module === "weekly") return weekRangeLabel(period);
  if (module === "quarterly") return quarterLabelZh(period);
  return period;
}

function weekRangeLabel(startDate: string): string {
  const s = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(s.getTime())) return startDate;
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  const f = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${startDate}　(${f(s)} – ${f(e)})`;
}

function quarterLabelZh(period: string): string {
  const m = period.match(/^(\d{4})-Q(\d)$/);
  if (!m) return period;
  return `${m[1]} 年 第 ${m[2]} 季`;
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
