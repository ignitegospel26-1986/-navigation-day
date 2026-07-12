"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { Mark } from "@/components/brand";
import { GoogleSignInButton } from "@/components/auth-buttons";

const ease = [0.2, 0.8, 0.2, 1] as const;

// Restrained fade + slight rise, revealed on scroll.
const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

function Section({
  children,
  className = "",
  screen = false,
}: {
  children: React.ReactNode;
  className?: string;
  // `screen` makes the section fill at least one viewport and vertically
  // centres its content, so each guided step is exactly one "page" — snapping
  // to it never leaves the next section peeking in at the bottom.
  screen?: boolean;
}) {
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={`mx-auto w-full max-w-2xl px-6 ${
        screen ? "flex min-h-[100svh] flex-col justify-center" : ""
      } ${className}`}
    >
      {children}
    </motion.section>
  );
}

/**
 * A single "scroll down" cue pinned to the bottom of the viewport — so it's
 * never buried at the end of a tall section. Clicking snaps to the *next*
 * section (never a fixed jump, which used to overshoot on tall pages), and it
 * fades out once the final CTA page is reached (the breathing glow lands on the
 * sign-in button there instead). The glow uses 2 keyframes + repeatType
 * "reverse" so it breathes out symmetrically instead of snapping back to dark.
 */
function ScrollCue() {
  // Pages always load at the top, where the cue should be visible — start
  // shown to avoid a flash, then let scroll position take over.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const update = () => {
      const secs = Array.from(document.querySelectorAll("section"));
      const last = secs[secs.length - 1];
      if (!last) return;
      // Hide once the final (CTA) section rises into the lower viewport.
      setHidden(last.getBoundingClientRect().top < window.innerHeight * 0.75);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const goNext = () => {
    const secs = Array.from(document.querySelectorAll("section"));
    // First section that starts below the current viewport top = the next page.
    const next = secs.find((s) => s.getBoundingClientRect().top > 2);
    if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return (
    <motion.button
      type="button"
      aria-label="往下看"
      onClick={goNext}
      animate={{ opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.4 }}
      style={{ pointerEvents: hidden ? "none" : "auto" }}
      className="fixed bottom-8 left-1/2 z-20 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-ink/25 bg-paper/70 text-ink/75 backdrop-blur-sm"
    >
      <motion.span
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(199,141,91,0)",
            "0 0 16px 4px rgba(199,141,91,0.35)",
          ],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 1.6,
          ease: "easeInOut",
        }}
      />
      <motion.span
        className="relative text-lg leading-none"
        animate={{ y: [0, 3, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
      >
        ↓
      </motion.span>
    </motion.button>
  );
}

export function Landing() {
  return (
    // Forced neutral dark-grey for the first impression, regardless of the
    // visitor's system theme. The theme toggle only appears post-login.
    <div className="landing-dark min-h-screen bg-paper text-ink">
      {/* Minimal top bar with a quick sign-in (no need to scroll to the CTA) */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-3.5 sm:px-8">
        {/* Opaque (not translucent) background so scrolled content never shows
            through the brand — no border/frame, per request. */}
        <span className="flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-ink/85">
          <Mark className="h-5 w-5" />
          <span className="font-serif text-sm">導航日</span>
          <span className="text-[10px] tracking-wide text-muted">Navigation Day</span>
        </span>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          style={{ borderRadius: 9999 }}
          className="btn btn-ghost bg-surface/60 px-4 py-1.5 text-sm backdrop-blur-sm"
        >
          登入
        </button>
      </div>

      {/* 1 · Opening — the sentence stands alone, full screen */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease }}
          className="max-w-3xl font-serif text-3xl font-medium leading-[1.5] tracking-tight text-ink sm:text-[42px] sm:leading-[1.5]"
        >
          你上一次誠實回答
          <br className="hidden sm:block" />
          「我在逃避什麼」，是什麼時候？
        </motion.h1>

        {/* Always-visible plain-language purpose statement (for users AND for
            Google's OAuth homepage review — must clearly explain what the app
            does and how it uses Google data). */}
        <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-base">
          <strong className="text-ink">導航日 Navigation Day</strong>{" "}
          是一個私密的長期自我覺察工具：每天兩分鐘、每週與每季各一次，
          誠實記錄你正在靠近還是遠離你想要的生活。你寫下的每一個字，只會存在
          <strong className="text-ink">你自己的 Google Drive</strong>——
          我們的伺服器不儲存、也不讀取任何內容；你也可以選擇把打卡提醒
          同步到自己的 Google 行事曆。
        </p>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-muted">
          Navigation Day is a private journaling app for daily, weekly and
          quarterly self-reflection. Your entries are stored only in your own
          Google Drive (never on our servers); reminders can optionally sync to
          your own Google Calendar.
        </p>

      </section>

      {/* 2 · Problem statement */}
      <Section className="py-28" screen>
        <p className="font-serif text-2xl leading-relaxed text-ink sm:text-[28px] sm:leading-relaxed">
          改變不需要好幾年。
          <br />
          它需要的是，你願意每天花兩分鐘，誠實面對自己一次。
        </p>
        <p className="mt-8 text-[17px] leading-loose text-ink-soft">
          導航日不是待辦清單，也不是打卡 App。
          它是一份持續一年的紀錄——記下你每天正在靠近，還是正在逃離，
          你真正想要的生活。
        </p>
      </Section>

      {/* 3 · Is / Is-not */}
      <Section className="py-24" screen>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-hairline bg-surface/40 p-7">
            <p className="mb-4 font-serif text-xl text-accent">是</p>
            <ul className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
              <li>一個只有你自己看得到紀錄的誠實工具</li>
              <li>每天 2 分鐘、每週一次整理、每季一次深度盤點</li>
              <li>你可以自己選擇語氣：誠實但溫和，或是直接不繞路</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface/40 p-7">
            <p className="mb-4 font-serif text-xl text-muted">不是</p>
            <ul className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
              <li>不是社群，沒有排行榜，沒有人會看到你的紀錄</li>
              <li>不是要你每天正能量打卡</li>
              <li>不是又一個你三天後就會刪掉的 App</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 4 · Where the data lives */}
      <Section className="py-24" screen>
        <h2 className="font-serif text-2xl leading-relaxed text-ink sm:text-[28px]">
          你的紀錄只存在你自己的 Google 帳號裡。
        </h2>
        <p className="mt-6 text-[16px] leading-loose text-ink-soft">
          導航日不會把你寫的任何一個字，存到我們的伺服器。
          你隨時可以打開自己的 Google Drive，看到、下載、或刪除全部內容。
          我們只是幫你把問題排好、把提醒設好，紀錄本身，一直都是你的。
        </p>
        <DataFlowDiagram />
      </Section>

      {/* 5 · Choose your tone (preview only) */}
      <Section className="py-24" screen>
        <h2 className="text-center font-serif text-2xl text-ink sm:text-[26px]">
          同一個問題，兩種問法，
          <br className="sm:hidden" />
          你想被怎麼對待？
        </h2>
        <TonePreview />
        <p className="mx-auto mt-8 max-w-md text-center text-[14px] leading-relaxed text-muted">
          兩種語氣，你都可以之後在設定裡隨時切換。
          沒有哪一種比較「對」，只有哪一種現在對你比較有用。
        </p>
      </Section>

      {/* 6 · CTA */}
      <Section className="pb-32 pt-16 text-center">
        <span className="mb-8 inline-flex items-center gap-2 text-ink">
          <Mark className="h-6 w-6" />
          <span className="font-serif text-lg">導航日</span>
        </span>
        <p className="font-serif text-2xl text-ink sm:text-3xl">準備好了嗎？</p>
        <div className="mt-8 flex justify-center">
          {/* The scroll-down glow "lands" here on the final page: the breathing
              light now sits behind the sign-in button instead of an arrow. */}
          <div className="relative inline-flex">
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(199,141,91,0)",
                  "0 0 30px 7px rgba(199,141,91,0.5)",
                ],
              }}
              transition={{
                repeat: Infinity,
                repeatType: "reverse",
                duration: 1.8,
                ease: "easeInOut",
              }}
            />
            <GoogleSignInButton
              label="使用 Google 登入，開始我的第一天"
              className="relative"
            />
          </div>
        </div>
        <p className="mx-auto mt-5 max-w-md text-[13px] leading-relaxed text-muted">
          登入即代表你已閱讀並理解上方的資料使用方式。
          我們只申請最小必要權限，不會存取你 Drive 裡其他任何檔案。
        </p>
        <div className="mt-6">
          {/* A REAL crawlable link (not a modal button), with an ABSOLUTE URL so
              it matches the privacy-policy URL declared on the OAuth consent
              screen exactly — Google's homepage check compares the two. */}
          <a
            href="https://navigationday.app/privacy"
            className="text-[13px] text-ink-soft underline underline-offset-4 hover:text-accent"
          >
            完整隱私說明（隱私權政策 Privacy Policy）
          </a>
        </div>
      </Section>

      {/* One fixed scroll cue for the whole flow (hidden on the CTA page). */}
      <ScrollCue />
    </div>
  );
}

function TonePreview() {
  const [picked, setPicked] = useState<"gentle" | "sharp" | null>(null);
  const cards: { key: "gentle" | "sharp"; label: string; q: string }[] = [
    {
      key: "gentle",
      label: "溫柔版",
      q: "今天有哪件我一直在逃避、但其實該面對的事？",
    },
    { key: "sharp", label: "犀利版", q: "我今天到底在逃避什麼？誠實講。" },
  ];
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {cards.map((c) => {
        const active = picked === c.key;
        return (
          <motion.button
            key={c.key}
            type="button"
            onClick={() => setPicked(active ? null : c.key)}
            whileHover={{ y: -3 }}
            className={`rounded-2xl border p-7 text-left transition-colors ${
              active
                ? "border-accent bg-accent-tint"
                : "border-hairline bg-surface/40 hover:border-accent/50"
            }`}
          >
            <p className="mb-3 text-sm text-accent">{c.label}</p>
            <p className="font-serif text-[19px] leading-relaxed text-ink">
              {c.q}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}

/** 你 ↔ 你的 Google 帳號，紀錄直接連線；導航日只是旁邊的介面，不在資料路徑上。 */
function DataFlowDiagram() {
  return (
    <div className="mt-10 rounded-2xl border border-hairline bg-surface/30 p-6">
      <svg viewBox="0 0 520 190" className="w-full" role="img" aria-label="資料流示意圖">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" fill="var(--accent)" />
          </marker>
        </defs>

        {/* main data line: 你 ↔ 你的 Google 帳號 */}
        <line x1="120" y1="70" x2="400" y2="70" stroke="var(--accent)" strokeWidth="2" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
        <text x="260" y="56" textAnchor="middle" fill="var(--muted)" fontSize="13">
          紀錄直接寫進你的帳號
        </text>

        {/* endpoints */}
        <g fill="var(--ink)" fontSize="15" fontWeight="500" textAnchor="middle">
          <circle cx="120" cy="70" r="5" fill="var(--accent)" />
          <text x="120" y="102">你</text>
          <circle cx="400" cy="70" r="5" fill="var(--accent)" />
          <text x="400" y="102">你的 Google 帳號</text>
        </g>

        {/* 導航日 — off the path, dashed = just an interface */}
        <line x1="260" y1="70" x2="260" y2="140" stroke="var(--hairline)" strokeWidth="1.5" strokeDasharray="4 4" />
        <g textAnchor="middle">
          <rect x="205" y="140" width="110" height="34" rx="9" fill="none" stroke="var(--hairline)" />
          <text x="260" y="162" fill="var(--ink-soft)" fontSize="14">導航日（介面）</text>
        </g>
        <text x="260" y="128" textAnchor="middle" fill="var(--muted)" fontSize="12">
          不落在資料路徑上
        </text>
      </svg>
    </div>
  );
}
