"use client";

import { useState } from "react";
import { motion } from "framer-motion";

// Fixed "morning paper" palette so the exported PNG always looks the same,
// regardless of the app's current light/dark theme.
const C = {
  paper: "#f4efe4",
  surface: "#fbf7ee",
  ink: "#26221c",
  soft: "#524b3f",
  muted: "#8a8271",
  clay: "#9a5f38",
  hairline: "#d9cfba",
};

export function IdentityCard({
  text,
  period,
  onClose,
}: {
  text: string;
  period: string;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const declaration = text.trim() || "我是一個會為自己而活的人";
  const dateLabel = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  async function download() {
    setSaving(true);
    try {
      // Make sure the CJK serif is ready before painting to canvas.
      if (document.fonts?.ready) await document.fonts.ready;
      const url = drawCard(declaration, period, dateLabel);
      const a = document.createElement("a");
      a.href = url;
      a.download = `身分宣告卡_${period}.png`;
      a.click();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex flex-col items-center"
    >
      <p className="text-sm tracking-[0.2em] text-accent">完成了</p>
      <h2 className="mt-3 font-serif text-2xl text-ink">你的身分宣告卡</h2>
      <p className="mt-2 text-center text-[14px] text-muted">
        這張卡只在你的裝置上生成，不會上傳、不會分享。
      </p>

      {/* On-screen preview — mirrors the exported PNG */}
      <div
        className="mt-8 w-full max-w-[340px] overflow-hidden rounded-2xl shadow-xl"
        style={{ backgroundColor: C.paper }}
      >
        <div
          className="flex flex-col items-center px-8 py-12 text-center"
          style={{ border: `1px solid ${C.hairline}`, margin: 10, borderRadius: 14 }}
        >
          <CardMark />
          <p
            className="mt-6 text-[11px]"
            style={{ letterSpacing: "0.35em", color: C.clay }}
          >
            身 分 宣 告
          </p>
          <p
            className="mt-6 font-serif text-[22px] leading-relaxed"
            style={{ color: C.ink }}
          >
            {declaration}
          </p>
          <div className="mt-8 h-px w-10" style={{ backgroundColor: C.hairline }} />
          <p className="mt-5 text-[12px]" style={{ color: C.muted }}>
            {period} · {dateLabel}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: C.soft }}>
            導航日 Navigation Day
          </p>
        </div>
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={download}
          disabled={saving}
          className="btn btn-primary px-6 py-3 text-[15px] disabled:opacity-50"
        >
          {saving ? "生成中⋯" : "下載宣告卡 (PNG)"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost px-5 py-3 text-[15px]"
        >
          完成，回主控台
        </button>
      </div>
    </motion.div>
  );
}

function CardMark() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-8 w-8"
      fill="none"
      stroke={C.clay}
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 22a10 10 0 0 1 20 0" />
      <line x1="3" y1="22" x2="29" y2="22" />
      <line x1="16" y1="4" x2="16" y2="8" />
      <line x1="7.5" y1="7.5" x2="10" y2="10" />
      <line x1="24.5" y1="7.5" x2="22" y2="10" />
    </svg>
  );
}

/* --------------------------- canvas → PNG export --------------------------- */
function drawCard(declaration: string, period: string, dateLabel: string): string {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // background
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);

  // inset frame
  ctx.strokeStyle = C.hairline;
  ctx.lineWidth = 2;
  const m = 70;
  roundRect(ctx, m, m, W - m * 2, H - m * 2, 28);
  ctx.stroke();

  const cx = W / 2;

  // dawn mark
  ctx.strokeStyle = C.clay;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, 340, 46, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 78, 340);
  ctx.lineTo(cx + 78, 340);
  ctx.stroke();
  // rays
  ctx.beginPath();
  ctx.moveTo(cx, 268);
  ctx.lineTo(cx, 288);
  ctx.moveTo(cx - 52, 296);
  ctx.lineTo(cx - 40, 308);
  ctx.moveTo(cx + 52, 296);
  ctx.lineTo(cx + 40, 308);
  ctx.stroke();

  // eyebrow
  ctx.fillStyle = C.clay;
  ctx.textAlign = "center";
  ctx.font = '500 30px "Noto Serif TC", serif';
  ctx.save();
  drawSpaced(ctx, "身 分 宣 告", cx, 470, 8);
  ctx.restore();

  // hero declaration (wrapped)
  ctx.fillStyle = C.ink;
  ctx.font = '500 62px "Noto Serif TC", serif';
  const lines = wrapCJK(ctx, declaration, W - m * 2 - 120);
  const lineHeight = 92;
  const blockH = lines.length * lineHeight;
  let y = H / 2 - blockH / 2 + 40;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }

  // divider
  ctx.strokeStyle = C.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 40, H - 300);
  ctx.lineTo(cx + 40, H - 300);
  ctx.stroke();

  // footer
  ctx.fillStyle = C.muted;
  ctx.font = '400 30px "Noto Sans TC", sans-serif';
  ctx.fillText(`${period} · ${dateLabel}`, cx, H - 240);
  ctx.fillStyle = C.soft;
  ctx.font = '400 30px "Noto Serif TC", serif';
  ctx.fillText("導航日 Navigation Day", cx, H - 190);

  return canvas.toDataURL("image/png");
}

function drawSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  extra: number
) {
  // approximate letter-spacing centered
  const widths = [...text].map((ch) => ctx.measureText(ch).width + extra);
  const total = widths.reduce((a, b) => a + b, 0) - extra;
  let x = cx - total / 2;
  ctx.textAlign = "left";
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += widths[i];
  }
  ctx.textAlign = "center";
}

function wrapCJK(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
