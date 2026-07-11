"use client";

import { getReminderPrefs, saveReminderPrefs } from "./reminders";

/**
 * Bridges the browser's localStorage settings and the cloud (設定 tab) copy.
 * localStorage stays the fast, synchronous local cache the hooks read; the sheet
 * is the source of truth that makes settings follow the user across devices.
 *
 * `browserEnabled` is intentionally NOT synced — it depends on each device's
 * notification permission, so it stays per-device.
 */
const TONE_KEY = "lifereset:tone";
const CONFIRM_KEY = "lifereset:confirmsave";
const WEEKSTART_KEY = "lifereset:weekstart";

/** Flatten the synced settings from localStorage into a key/value map. */
export function collectLocalSettings(): Record<string, string> {
  const prefs = getReminderPrefs();
  return {
    tone: window.localStorage.getItem(TONE_KEY) === "sharp" ? "sharp" : "gentle",
    confirmSave:
      window.localStorage.getItem(CONFIRM_KEY) === "off" ? "off" : "on",
    weekStart:
      window.localStorage.getItem(WEEKSTART_KEY) === "mon" ? "mon" : "sun",
    dailyWeekdaysOnly: String(prefs.dailyWeekdaysOnly),
    dailyTime: prefs.dailyTime,
    weeklyDay: String(prefs.weeklyDay),
    weeklyTime: prefs.weeklyTime,
    quarterlyDay: String(prefs.quarterlyDay),
    quarterlyTime: prefs.quarterlyTime,
  };
}

/**
 * Write cloud settings into localStorage. Tone/week-start/confirm dispatch a
 * StorageEvent so their hooks update live; reminder prefs are saved to their
 * blob (the dashboard refreshes derived UI via prefsVersion afterwards).
 */
export function applyRemoteSettings(s: Record<string, string>): void {
  const setLS = (key: string, val: string) => {
    window.localStorage.setItem(key, val);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: val }));
  };
  if (s.tone === "sharp" || s.tone === "gentle") setLS(TONE_KEY, s.tone);
  if (s.confirmSave === "on" || s.confirmSave === "off")
    setLS(CONFIRM_KEY, s.confirmSave);
  if (s.weekStart === "sun" || s.weekStart === "mon")
    setLS(WEEKSTART_KEY, s.weekStart);

  const merged = { ...getReminderPrefs() };
  if (s.dailyWeekdaysOnly != null)
    merged.dailyWeekdaysOnly = s.dailyWeekdaysOnly === "true";
  if (s.dailyTime) merged.dailyTime = s.dailyTime;
  if (s.weeklyDay) merged.weeklyDay = Number(s.weeklyDay);
  if (s.weeklyTime) merged.weeklyTime = s.weeklyTime;
  if (s.quarterlyDay) merged.quarterlyDay = Number(s.quarterlyDay);
  if (s.quarterlyTime) merged.quarterlyTime = s.quarterlyTime;
  saveReminderPrefs(merged);
}
