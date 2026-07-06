"use client";

export interface ReminderPrefs {
  browserEnabled: boolean;
  dailyTime: string; // "HH:MM", fired on weekdays
  weeklyTime: string; // "HH:MM", fired on Sunday
  quarterlyTime: string; // used for calendar sync only
}

const KEY = "lifereset:reminders";

export const DEFAULT_PREFS: ReminderPrefs = {
  browserEnabled: false,
  dailyTime: "21:00",
  weeklyTime: "20:00",
  quarterlyTime: "10:00",
};

export function getReminderPrefs(): ReminderPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveReminderPrefs(p: ReminderPrefs) {
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
}

export async function showNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted")
    return;
  const reg = await registerServiceWorker();
  const options: NotificationOptions = { body, icon: "/icon.svg", badge: "/icon.svg" };
  if (reg) reg.showNotification(title, options);
  else new Notification(title, options);
}

/* ------------------------ local (tab-open) scheduler ----------------------- */
const parse = (hhmm: string): [number, number] => {
  const [h, m] = hhmm.split(":").map(Number);
  return [h || 0, m || 0];
};

function nextWeekday(time: string, now = new Date()): Date {
  const [h, m] = parse(time);
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setHours(h, m, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); // skip weekend
  return d;
}

function nextSunday(time: string, now = new Date()): Date {
  const [h, m] = parse(time);
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setHours(h, m, 0, 0);
  if (d.getDay() === 0 && d > now) return d;
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() !== 0);
  return d;
}

/**
 * Schedules the next daily + weekly browser notification while this tab stays
 * open. Returns a cleanup function. (Reliable, closed-app reminders come from
 * Google Calendar sync — see /api/calendar.)
 */
export function startLocalReminders(prefs: ReminderPrefs): () => void {
  if (
    typeof window === "undefined" ||
    !prefs.browserEnabled ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  )
    return () => {};

  const timers: ReturnType<typeof setTimeout>[] = [];

  const schedule = (
    when: Date,
    title: string,
    body: string,
    reschedule: () => Date
  ) => {
    const delay = Math.max(1000, when.getTime() - Date.now());
    const id = setTimeout(() => {
      showNotification(title, body);
      schedule(reschedule(), title, body, reschedule); // roll to next
    }, delay);
    timers.push(id);
  };

  schedule(
    nextWeekday(prefs.dailyTime),
    "導航日・每日打卡",
    "花兩分鐘，把今天的自己寫回來。",
    () => nextWeekday(prefs.dailyTime)
  );
  schedule(
    nextSunday(prefs.weeklyTime),
    "導航日・每週整理",
    "週日的深呼吸，回顧這一週。",
    () => nextSunday(prefs.weeklyTime)
  );

  return () => timers.forEach(clearTimeout);
}
