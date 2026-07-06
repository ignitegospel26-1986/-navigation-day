"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ToneSwitch } from "@/components/tone-switch";
import { QUARTERLY_QUESTIONS, prompt, type Tone } from "@/lib/prompts";
import { jsonFetch, quarterlyPeriod } from "@/lib/client";
import { IdentityCard } from "@/components/identity-card";

type Answers = Record<string, string>;

const N = QUARTERLY_QUESTIONS.length;
const ease = [0.2, 0.8, 0.2, 1] as const;

const pageVariants = {
  enter: (d: number) => ({ opacity: 0, x: d * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -40 }),
};

export function QuarterlyReset({
  open,
  onClose,
  tone,
  onToneChange,
  spreadsheetId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  tone: Tone;
  onToneChange: (t: Tone) => void;
  spreadsheetId: string;
  onSaved?: () => void;
}) {
  // step 0 = intro, 1..N = questions, N+1 = identity card
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const period = useMemo(() => quarterlyPeriod(), []);
  const identityText = answers["identity"] ?? "";

  // Load this quarter's existing answers when the flow opens, so a returning
  // user edits them instead of writing a second row for the same quarter.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    jsonFetch<{ existing: { answers: Record<string, string> } | null }>(
      `/api/records/quarterly?period=${encodeURIComponent(period)}`
    )
      .then((d) => {
        if (cancelled) return;
        if (d.existing) {
          setAnswers(d.existing.answers);
          setEditing(true);
        } else {
          setEditing(false);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, period]);

  if (!open) return null;

  const q = step >= 1 && step <= N ? QUARTERLY_QUESTIONS[step - 1] : null;
  const isLastQuestion = step === N;

  const go = (delta: number) => {
    setDir(delta);
    setStep((s) => s + delta);
  };

  const canAdvance = !q || !q.required || (answers[q.key] ?? "").trim() !== "";

  const closeAll = () => {
    setStep(0);
    setAnswers({});
    setStatus("idle");
    setEditing(false);
    onClose();
  };

  async function finish() {
    setStatus("saving");
    try {
      await jsonFetch("/api/records/quarterly", {
        method: "POST",
        body: JSON.stringify({ period, tone, answers, spreadsheetId }),
      });
      onSaved?.();
      setDir(1);
      setStep(N + 1); // identity card
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      {/* top bar */}
      <div className="flex items-center justify-between px-6 py-5 sm:px-10">
        <button
          type="button"
          onClick={closeAll}
          className="btn btn-ghost h-9 px-3 text-sm"
        >
          ✕ 離開
        </button>
        {step >= 1 && step <= N && (
          <span className="text-sm tabular-nums text-muted">
            {step} / {N}
          </span>
        )}
        {step <= N && <ToneSwitch tone={tone} onChange={onToneChange} size="sm" />}
        {step > N && <span className="w-9" />}
      </div>

      {/* progress hairline */}
      {step >= 1 && step <= N && (
        <div className="mx-6 h-px bg-hairline sm:mx-10">
          <motion.div
            className="h-px bg-accent"
            initial={false}
            animate={{ width: `${(step / N) * 100}%` }}
            transition={{ duration: 0.4, ease }}
          />
        </div>
      )}

      {/* body */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease }}
            className="absolute inset-0 overflow-y-auto"
          >
            <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-10">
              {step === 0 && (
                <Intro onStart={() => go(1)} period={period} editing={editing} />
              )}

              {q && (
                <div>
                  <p className="mb-6 text-sm tracking-[0.2em] text-accent">
                    第 {String(step).padStart(2, "0")} 題
                  </p>
                  <label className="block font-serif text-2xl leading-relaxed text-ink sm:text-[28px]">
                    {prompt(q, tone)}
                  </label>
                  {q.key === "identity" ? (
                    <input
                      autoFocus
                      className="field mt-8 px-4 py-3.5 text-lg"
                      placeholder={q.placeholder}
                      value={answers[q.key] ?? ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [q.key]: e.target.value }))
                      }
                    />
                  ) : (
                    <textarea
                      autoFocus
                      className="field mt-8 min-h-[160px] resize-y px-4 py-3.5 text-[17px] leading-relaxed"
                      placeholder="慢慢寫，這是給自己的。"
                      value={answers[q.key] ?? ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [q.key]: e.target.value }))
                      }
                    />
                  )}
                  {!q.required && (
                    <p className="mt-3 text-[13px] text-muted">可以留白，跳過也沒關係。</p>
                  )}
                </div>
              )}

              {step === N + 1 && (
                <IdentityCard
                  text={identityText}
                  period={period}
                  onClose={closeAll}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* footer nav (hidden on intro & card) */}
      {step >= 1 && step <= N && (
        <div className="flex items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <button
            type="button"
            onClick={() => go(-1)}
            className="btn btn-ghost px-4 py-2.5 text-sm"
          >
            ← 上一題
          </button>

          {status === "error" && (
            <span className="text-sm text-danger">寫入失敗，請再試一次。</span>
          )}

          {isLastQuestion ? (
            <button
              type="button"
              onClick={finish}
              disabled={!canAdvance || status === "saving"}
              className="btn btn-primary px-6 py-2.5 text-[15px] disabled:opacity-40"
            >
              {status === "saving"
                ? "寫入中⋯"
                : editing
                  ? "更新並生成宣告卡"
                  : "完成並生成宣告卡"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go(1)}
              disabled={!canAdvance}
              className="btn btn-primary px-6 py-2.5 text-[15px] disabled:opacity-40"
            >
              下一題 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Intro({
  onStart,
  period,
  editing,
}: {
  onStart: () => void;
  period: string;
  editing: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-sm tracking-[0.25em] text-accent">{period}</p>
      <h1 className="mt-6 font-serif text-4xl font-medium leading-tight text-ink sm:text-5xl">
        季度深度重啟
      </h1>
      {editing ? (
        <p className="mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-ink-soft">
          你這一季已經寫過了。可以逐題重看、修改，
          完成後會<strong className="text-ink">更新</strong>原本那一筆，不會另外新增。
        </p>
      ) : (
        <p className="mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-ink-soft">
          接下來是九個問題，一次一題。
          找個安靜、不會被打斷的時間，慢慢寫。
          沒有標準答案，也不會給任何人看——這是你和自己的對話。
          最後你會得到一張只屬於你的「身分宣告卡」。
        </p>
      )}
      <button
        type="button"
        onClick={onStart}
        className="btn btn-primary mt-10 px-8 py-3.5 text-[15px]"
      >
        開始 →
      </button>
    </div>
  );
}
