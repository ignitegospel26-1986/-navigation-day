"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Modal } from "@/components/ui/modal";
import { ScaleInput } from "@/components/scale-input";
import { ToneSwitch } from "@/components/tone-switch";
import { prompt, type ModuleKey, type Question, type Tone } from "@/lib/prompts";
import { jsonFetch, useConfirmSave } from "@/lib/client";

type Answers = Record<string, string | number>;

/**
 * Shared card-style check-in used by the Daily and Weekly modules. Opening it
 * loads any record already saved for this period so the user edits in place
 * (one record per day / per week) instead of creating a duplicate.
 */
export function ModuleCheckin({
  open,
  onClose,
  module,
  questions,
  title,
  subtitle,
  period,
  tone,
  onToneChange,
  spreadsheetId,
  onSaved,
  successNote = "這一刻的你，被好好記下來了。",
}: {
  open: boolean;
  onClose: () => void;
  module: ModuleKey;
  questions: Question[];
  title: string;
  subtitle?: string;
  period: string;
  tone: Tone;
  onToneChange: (t: Tone) => void;
  spreadsheetId: string;
  onSaved?: () => void;
  successNote?: string;
}) {
  const [confirmSave] = useConfirmSave();
  const [answers, setAnswers] = useState<Answers>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );

  // Load an existing record for this period when the card opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setStatus("idle");
    setConfirming(false);
    jsonFetch<{ existing: { answers: Record<string, string>; tone: Tone } | null }>(
      `/api/records/${module}?period=${encodeURIComponent(period)}`
    )
      .then((d) => {
        if (cancelled) return;
        if (d.existing) {
          const a: Answers = {};
          for (const q of questions) {
            const raw = d.existing!.answers[q.key] ?? "";
            if (q.type === "scale") {
              if (raw !== "") a[q.key] = Number(raw);
            } else {
              a[q.key] = raw;
            }
          }
          setAnswers(a);
          setEditing(true);
        } else {
          setAnswers({});
          setEditing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnswers({});
          setEditing(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, module, period, questions]);

  const set = (k: string, v: string | number) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  const filledCount = useMemo(
    () =>
      questions.filter((q) => {
        const v = answers[q.key];
        return v !== undefined && v !== null && String(v).trim() !== "";
      }).length,
    [answers, questions]
  );
  const emptyCount = questions.length - filledCount;
  const canSubmit = filledCount > 0; // just need at least one answer

  function attemptSubmit() {
    if (confirmSave && emptyCount > 0) {
      setConfirming(true);
      return;
    }
    doSubmit();
  }

  async function doSubmit() {
    setConfirming(false);
    setStatus("saving");
    try {
      await jsonFetch(`/api/records/${module}`, {
        method: "POST",
        body: JSON.stringify({ period, tone, answers, spreadsheetId }),
      });
      setStatus("done");
      onSaved?.();
      setTimeout(() => {
        onClose();
        setAnswers({});
        setStatus("idle");
        setEditing(false);
      }, 1300);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="checkin-title">
      <AnimatePresence mode="wait">
        {status === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-10 text-center"
          >
            <SuccessCheck />
            <p className="mt-5 font-serif text-xl text-ink">
              {editing ? "已更新你的紀錄" : "已寫入你的試算表"}
            </p>
            <p className="mt-1.5 text-sm text-muted">{successNote}</p>
          </motion.div>
        ) : loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-center text-muted"
          >
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-hairline border-t-accent" />
            <span className="text-sm">讀取這期的紀錄⋯</span>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="checkin-title" className="font-serif text-2xl text-ink">
                    {title}
                  </h2>
                  {editing && (
                    <span className="rounded-md border border-accent/40 bg-accent-tint px-2 py-0.5 text-[11px] text-accent">
                      修改
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted">
                    {editing ? "你這期已經填過，可以直接修改。" : subtitle}
                  </p>
                )}
              </div>
              <ToneSwitch tone={tone} onChange={onToneChange} size="sm" />
            </div>

            <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
              {questions.map((q) => (
                <div key={q.key}>
                  <label className="mb-2 block text-[15px] font-medium leading-snug text-ink">
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
                      className="field min-h-[84px] resize-y px-3.5 py-2.5 text-[15px] leading-relaxed"
                      placeholder={q.placeholder}
                      value={(answers[q.key] as string) ?? ""}
                      onChange={(e) => set(q.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="field px-3.5 py-2.5 text-[15px]"
                      placeholder={q.placeholder}
                      value={(answers[q.key] as string) ?? ""}
                      onChange={(e) => set(q.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            {status === "error" && (
              <p className="mt-4 text-sm text-danger">
                寫入失敗，請稍後再試一次。（你的登入可能過期，重新整理看看）
              </p>
            )}

            {confirming ? (
              <div className="mt-6 rounded-xl border border-hairline bg-surface-2/50 p-4">
                <p className="text-[14px] text-ink">
                  還有 {emptyCount} 題還沒填，要直接儲存嗎？
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={doSubmit}
                    disabled={status === "saving"}
                    className="btn btn-primary px-5 py-2 text-sm disabled:opacity-50"
                  >
                    {status === "saving" ? "儲存中⋯" : "直接儲存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="btn btn-ghost px-4 py-2 text-sm"
                  >
                    返回填寫
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-7 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost px-4 py-2.5 text-sm"
                >
                  稍後
                </button>
                <button
                  type="button"
                  onClick={attemptSubmit}
                  disabled={!canSubmit || status === "saving"}
                  className="btn btn-primary px-6 py-2.5 text-[15px] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === "saving"
                    ? editing
                      ? "更新中⋯"
                      : "寫入中⋯"
                    : editing
                      ? "更新我的紀錄"
                      : "寫入我的試算表"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function SuccessCheck() {
  return (
    <motion.svg
      width="56"
      height="56"
      viewBox="0 0 52 52"
      className="text-accent"
      initial="hidden"
      animate="visible"
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { pathLength: 1, opacity: 1, transition: { duration: 0.5 } },
        }}
      />
      <motion.path
        d="M15 27l7 7 15-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.35, delay: 0.35 } },
        }}
      />
    </motion.svg>
  );
}
