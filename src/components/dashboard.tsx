"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth-buttons";
import { ToneSwitch } from "@/components/tone-switch";
import { ModuleCheckin } from "@/components/module-checkin";
import { QuarterlyReset } from "@/components/quarterly-reset";
import { SettingsModal } from "@/components/settings-modal";
import { PrivacyLink } from "@/components/privacy-modal";
import { DAILY_QUESTIONS, WEEKLY_QUESTIONS } from "@/lib/prompts";
import {
  useTone,
  useWeekStart,
  jsonFetch,
  dailyPeriod,
  weeklyPeriod,
  quarterlyPeriod,
  daysLeftInQuarter,
} from "@/lib/client";
import {
  DEFAULT_PREFS,
  WEEKDAY_LABELS,
  getReminderPrefs,
  startLocalReminders,
} from "@/lib/reminders";

type Filled = { daily?: boolean; weekly?: boolean; quarterly?: boolean };

interface Space {
  spreadsheetId: string;
  folderId: string | null;
  webViewLink: string;
  trashed?: boolean;
}

interface SpaceResponse {
  exists: boolean;
  trashed?: boolean;
  space: Space | null;
  repaired?: string[];
}

type Active = "daily" | "weekly" | "quarterly" | "settings" | null;

export function Dashboard({ name }: { name?: string | null }) {
  const [tone, setTone] = useTone();
  const [weekStart] = useWeekStart();
  const [space, setSpace] = useState<Space | null>(null);
  const [trashed, setTrashed] = useState(false);
  const [repaired, setRepaired] = useState<string[]>([]);
  const [filled, setFilled] = useState<Filled>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Active>(null);
  const [prefsVersion, setPrefsVersion] = useState(0);
  const [reminderTimes, setReminderTimes] = useState({
    daily: DEFAULT_PREFS.dailyTime,
    dailyWeekdaysOnly: DEFAULT_PREFS.dailyWeekdaysOnly,
    weekly: DEFAULT_PREFS.weeklyTime,
    weeklyDay: DEFAULT_PREFS.weeklyDay,
  });

  const weekPeriod = weeklyPeriod(weekStart);

  // Reflect the user's configured reminder times on the cards (display only).
  useEffect(() => {
    const p = getReminderPrefs();
    setReminderTimes({
      daily: p.dailyTime,
      dailyWeekdaysOnly: p.dailyWeekdaysOnly,
      weekly: p.weeklyTime,
      weeklyDay: p.weeklyDay,
    });
  }, [prefsVersion]);

  useEffect(() => {
    jsonFetch<SpaceResponse>("/api/space")
      .then((d) => {
        setSpace(d.space);
        setTrashed(!!d.trashed);
        setRepaired(d.repaired ?? []);
      })
      .catch(() => setError("無法連線到你的 Google Drive，請重新整理。"))
      .finally(() => setLoading(false));
  }, []);

  // Local (tab-open) reminders. Re-armed whenever settings close.
  useEffect(() => {
    const stop = startLocalReminders(getReminderPrefs());
    return stop;
  }, [prefsVersion]);

  // Which of this period's records already exist → "已填 · 可修改" badges.
  useEffect(() => {
    if (!space || trashed) return;
    const periods = {
      daily: dailyPeriod(),
      weekly: weekPeriod,
      quarterly: quarterlyPeriod(),
    } as const;
    (Object.keys(periods) as (keyof typeof periods)[]).forEach((m) => {
      jsonFetch<{ existing: unknown | null }>(
        `/api/records/${m}?period=${encodeURIComponent(periods[m])}`
      )
        .then((d) => setFilled((f) => ({ ...f, [m]: !!d.existing })))
        .catch(() => {});
    });
  }, [space, trashed, weekPeriod]);

  async function createSpace(action?: "restore" | "create") {
    setCreating(true);
    setError(null);
    try {
      const d = await jsonFetch<{ space: Space }>("/api/space", {
        method: "POST",
        body: action ? JSON.stringify({ action }) : undefined,
      });
      setSpace(d.space);
      setTrashed(false);
    } catch {
      setError(
        action === "restore" ? "復原失敗，請稍後再試。" : "建立失敗，請稍後再試。"
      );
    } finally {
      setCreating(false);
    }
  }

  const firstName = name?.split(" ")[0] ?? "你";
  const closeModal = () => setActive(null);
  const closeSettings = () => {
    setActive(null);
    setPrefsVersion((v) => v + 1); // re-arm reminders with new prefs
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-hairline bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        {loading ? (
          <Skeleton />
        ) : trashed ? (
          <TrashedPrompt
            creating={creating}
            error={error}
            onRestore={() => createSpace("restore")}
            onCreateNew={() => createSpace("create")}
          />
        ) : !space ? (
          <Onboarding
            creating={creating}
            error={error}
            onCreate={() => createSpace()}
          />
        ) : (
          <Console
            firstName={firstName}
            tone={tone}
            setTone={setTone}
            repaired={repaired}
            filled={filled}
            dailyTime={reminderTimes.daily}
            dailyWeekdaysOnly={reminderTimes.dailyWeekdaysOnly}
            weeklyTime={reminderTimes.weekly}
            weeklyDay={reminderTimes.weeklyDay}
            onOpen={setActive}
            error={error}
          />
        )}
      </main>

      {space && !trashed && (
        <>
          <ModuleCheckin
            open={active === "daily"}
            onClose={closeModal}
            module="daily"
            questions={DAILY_QUESTIONS}
            title="今日打卡"
            subtitle={new Intl.DateTimeFormat("zh-TW", {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(new Date())}
            period={dailyPeriod()}
            tone={tone}
            onToneChange={setTone}
            spreadsheetId={space.spreadsheetId}
            successNote="今天的你，被好好記下來了。"
            onSaved={() => setFilled((f) => ({ ...f, daily: true }))}
          />
          <ModuleCheckin
            open={active === "weekly"}
            onClose={closeModal}
            module="weekly"
            questions={WEEKLY_QUESTIONS}
            title="每週整理"
            subtitle="週日的深呼吸"
            period={weekPeriod}
            tone={tone}
            onToneChange={setTone}
            spreadsheetId={space.spreadsheetId}
            successNote="這一週，被你好好收整了。"
            onSaved={() => setFilled((f) => ({ ...f, weekly: true }))}
          />
          <QuarterlyReset
            open={active === "quarterly"}
            onClose={closeModal}
            tone={tone}
            onToneChange={setTone}
            spreadsheetId={space.spreadsheetId}
            onSaved={() => setFilled((f) => ({ ...f, quarterly: true }))}
          />
          <SettingsModal
            open={active === "settings"}
            onClose={closeSettings}
            tone={tone}
            onToneChange={setTone}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------- onboarding ------------------------------- */
function Onboarding({
  creating,
  error,
  onCreate,
}: {
  creating: boolean;
  error: string | null;
  onCreate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-xl pt-8 text-center"
    >
      <p className="text-sm tracking-[0.2em] text-accent">第 一 步</p>
      <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        建立你的重啟空間
      </h1>
      <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">
        我們會在<strong className="text-ink">你自己的 Google Drive</strong>
        建立一個「導航日」資料夾，以及一份紀錄試算表。
        從這一刻起，你寫的東西都直接進到那份屬於你的表格裡。
      </p>

      <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="btn btn-primary mt-9 px-7 py-3.5 text-[15px] disabled:opacity-60"
      >
        {creating ? "正在建立⋯" : "建立我的重啟空間"}
      </button>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <p className="mt-6 text-[13px] text-muted">
        只會存取本 App 建立的檔案（drive.file）。
        <PrivacyLink className="ml-1 underline underline-offset-4 hover:text-ink">
          隱私說明
        </PrivacyLink>
      </p>
    </motion.div>
  );
}

/* ----------------------------- trashed prompt ----------------------------- */
function TrashedPrompt({
  creating,
  error,
  onRestore,
  onCreateNew,
}: {
  creating: boolean;
  error: string | null;
  onRestore: () => void;
  onCreateNew: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-xl pt-8 text-center"
    >
      <p className="text-sm tracking-[0.2em] text-accent">找到舊資料</p>
      <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        你之前的紀錄在垃圾桶裡
      </h1>
      <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">
        我們在你的 Google Drive 垃圾桶找到「導航日」的資料。
        你可以把它復原、接續原本的紀錄；或者放著不管，建立一份全新的。
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRestore}
          disabled={creating}
          className="btn btn-primary px-7 py-3.5 text-[15px] disabled:opacity-60"
        >
          {creating ? "處理中⋯" : "復原舊資料"}
        </button>
        <button
          type="button"
          onClick={onCreateNew}
          disabled={creating}
          className="btn btn-ghost px-6 py-3.5 text-[15px] disabled:opacity-60"
        >
          建立全新的
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <p className="mt-6 text-[13px] text-muted">
        「建立全新的」不會刪掉垃圾桶裡的舊資料，你之後仍可自行在 Drive 復原。
      </p>
    </motion.div>
  );
}

/* --------------------------------- console -------------------------------- */
const TAB_LABELS: Record<string, string> = {
  daily: "每日",
  weekly: "每週",
  quarterly: "季度",
};

function Console({
  firstName,
  tone,
  setTone,
  repaired,
  filled,
  dailyTime,
  dailyWeekdaysOnly,
  weeklyTime,
  weeklyDay,
  onOpen,
  error,
}: {
  firstName: string;
  tone: "gentle" | "sharp";
  setTone: (t: "gentle" | "sharp") => void;
  repaired: string[];
  filled: Filled;
  dailyTime: string;
  dailyWeekdaysOnly: boolean;
  weeklyTime: string;
  weeklyDay: number;
  onOpen: (a: Active) => void;
  error: string | null;
}) {
  const hour = new Date().getHours();
  const greet =
    hour < 5 ? "夜深了" : hour < 11 ? "早安" : hour < 18 ? "午安" : "晚安";

  const weeklyHint = `每${WEEKDAY_LABELS[weeklyDay] ?? "週日"} ${weeklyTime}`;
  const quarterlyHint = `這一季還剩 ${daysLeftInQuarter()} 天`;

  return (
    <div>
      {repaired.length > 0 && (
        <div className="mb-5 rounded-xl border border-hairline bg-surface-2/60 px-4 py-3 text-[13px] text-ink-soft">
          偵測到缺少的分頁並已補回：
          {repaired.map((r) => TAB_LABELS[r] ?? r).join("、")}
          。你原有的紀錄不受影響。
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{greet}，</p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-ink">
            {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/history" className="btn btn-ghost px-4 py-2 text-sm">
            紀錄
          </Link>
          <Link
            href="/dashboard/insights"
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            分析
          </Link>
          <button
            type="button"
            onClick={() => onOpen("settings")}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            設定
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-[12px] text-muted">提問語氣</span>
        <ToneSwitch tone={tone} onChange={setTone} size="sm" />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {/* Daily — primary */}
      <motion.button
        type="button"
        onClick={() => onOpen("daily")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        whileHover={{ y: -2 }}
        className="card mt-6 flex w-full items-center justify-between gap-4 p-6 text-left transition-shadow hover:shadow-lg"
      >
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl text-accent">每日打卡</span>
            <span className="text-sm text-muted">約 2 分鐘</span>
          </div>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            今天什麼時候最活著、又在逃避什麼。寫完直接進你的試算表。
          </p>
          {filled.daily && (
            <p className="mt-2 text-[13px] text-accent">✓ 今天已填，點擊可修改</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-[12px] tabular-nums text-muted">
            {dailyWeekdaysOnly ? "平日" : "每天"} {dailyTime}
          </span>
          <span className="text-2xl text-accent">→</span>
        </div>
      </motion.button>

      {/* Weekly + Quarterly */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ModuleCard
          title="每週整理"
          hint={weeklyHint}
          desc="命名這一週真正主導你的內在模式。"
          done={!!filled.weekly}
          onClick={() => onOpen("weekly")}
        />
        <ModuleCard
          title="季度深度重啟"
          hint={quarterlyHint}
          desc="九題引導，最後生成你的身分宣告卡。"
          done={!!filled.quarterly}
          onClick={() => onOpen("quarterly")}
        />
      </div>

      {/* Utilities */}
      <div className="mt-8 flex items-center justify-end border-t border-hairline pt-6 text-sm">
        <PrivacyLink className="px-3 py-2 text-ink-soft transition-colors hover:text-ink">
          隱私說明
        </PrivacyLink>
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  hint,
  desc,
  done,
  onClick,
}: {
  title: string;
  hint: string;
  desc: string;
  done?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="card flex w-full flex-col items-start p-5 text-left transition-shadow hover:shadow-lg"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-serif text-lg text-ink">{title}</p>
          {done && (
            <span className="rounded-full border border-accent/40 bg-accent-tint px-2 py-0.5 text-[11px] text-accent">
              已填 · 可修改
            </span>
          )}
        </div>
        <span className="text-lg text-accent">→</span>
      </div>
      <p className="mt-0.5 text-[13px] text-muted">{hint}</p>
      <p className="mt-2 text-[14px] text-ink-soft">{desc}</p>
    </motion.button>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6 pt-6">
      <div className="h-9 w-40 rounded-lg bg-surface-2" />
      <div className="h-28 w-full rounded-2xl bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-20 rounded-2xl bg-surface-2" />
        <div className="h-20 rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}
