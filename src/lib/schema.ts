import { MODULES, ModuleKey, Tone } from "./prompts";

/** Names used inside the user's own Google Drive. */
export const FOLDER_NAME = "導航日";
export const SPREADSHEET_NAME = "導航日・紀錄";

/**
 * appProperties markers. Because we only hold the `drive.file` scope, we can
 * only ever list files THIS app created — so we tag ours and look them up by
 * this marker instead of storing an id on our servers.
 *
 * `lifeReset` is the primary lookup key (kept stable across the brand rename so
 * existing spaces stay detectable). `app`/`version` are written alongside for
 * spec alignment and future migration decisions.
 */
export const APP_MARKER_KEY = "lifeReset";
export const APP_ID = "navigation-day";
export const APP_VERSION = "1";

export const folderProperties = () => ({
  [APP_MARKER_KEY]: "folder",
  app: APP_ID,
  version: APP_VERSION,
});
export const spreadsheetProperties = () => ({
  [APP_MARKER_KEY]: "spreadsheet",
  app: APP_ID,
  version: APP_VERSION,
});

/** Tab (worksheet) title + the "period" column that leads each module. */
export const SHEET_TABS: Record<ModuleKey, { title: string; period: string }> = {
  daily: { title: "每日", period: "日期" },
  weekly: { title: "每週", period: "週次" },
  quarterly: { title: "季度", period: "季度" },
};

export const toneLabel = (tone: Tone): string =>
  tone === "sharp" ? "犀利" : "溫柔";

/** Column headers for a module: 時間戳記 | 期別 | 語氣 | ...每題 label */
export function moduleHeaders(module: ModuleKey): string[] {
  return [
    "時間戳記",
    SHEET_TABS[module].period,
    "語氣",
    ...MODULES[module].map((q) => q.label),
  ];
}

export interface ParsedRecord {
  period: string;
  tone: Tone;
  answers: Record<string, string>;
}

/** Reverse of buildRow: a stored row → { period, tone, answers } for editing. */
export function parseRow(module: ModuleKey, values: string[]): ParsedRecord {
  const tone: Tone = values[2] === toneLabel("sharp") ? "sharp" : "gentle";
  const answers: Record<string, string> = {};
  MODULES[module].forEach((q, i) => {
    answers[q.key] = values[3 + i] ?? "";
  });
  return { period: (values[1] ?? "").trim(), tone, answers };
}

/** Build a spreadsheet row (answers keyed by question key → ordered array). */
export function buildRow(
  module: ModuleKey,
  period: string,
  tone: Tone,
  answers: Record<string, string | number>
): (string | number)[] {
  return [
    new Date().toISOString(),
    period,
    toneLabel(tone),
    ...MODULES[module].map((q) => {
      const v = answers[q.key];
      return v === undefined || v === null ? "" : v;
    }),
  ];
}
