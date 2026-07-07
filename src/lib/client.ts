"use client";

import { useEffect, useState } from "react";
import type { Tone } from "./prompts";

/* ----------------------------- tone preference ----------------------------- */
const TONE_KEY = "lifereset:tone";

export function useTone(): [Tone, (t: Tone) => void] {
  const [tone, setTone] = useState<Tone>("gentle");

  useEffect(() => {
    const saved = window.localStorage.getItem(TONE_KEY);
    if (saved === "sharp" || saved === "gentle") setTone(saved);
  }, []);

  const update = (t: Tone) => {
    setTone(t);
    window.localStorage.setItem(TONE_KEY, t);
    // let other mounted components react to the change
    window.dispatchEvent(new StorageEvent("storage", { key: TONE_KEY, newValue: t }));
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TONE_KEY && (e.newValue === "sharp" || e.newValue === "gentle"))
        setTone(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [tone, update];
}

/* --------------------------- confirm-before-save --------------------------- */
const CONFIRM_KEY = "lifereset:confirmsave";

export function getConfirmSave(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(CONFIRM_KEY) !== "off";
}

export function useConfirmSave(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);

  useEffect(() => setOn(getConfirmSave()), []);

  const update = (v: boolean) => {
    setOn(v);
    window.localStorage.setItem(CONFIRM_KEY, v ? "on" : "off");
    window.dispatchEvent(
      new StorageEvent("storage", { key: CONFIRM_KEY, newValue: v ? "on" : "off" })
    );
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONFIRM_KEY) setOn(e.newValue !== "off");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [on, update];
}

/* ------------------------------ period labels ------------------------------ */
export function dailyPeriod(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type WeekStart = "sun" | "mon";
const WEEKSTART_KEY = "lifereset:weekstart";

export function getWeekStart(): WeekStart {
  if (typeof window === "undefined") return "sun";
  return window.localStorage.getItem(WEEKSTART_KEY) === "mon" ? "mon" : "sun";
}

export function useWeekStart(): [WeekStart, (w: WeekStart) => void] {
  const [ws, setWs] = useState<WeekStart>("sun");

  useEffect(() => setWs(getWeekStart()), []);

  const update = (w: WeekStart) => {
    setWs(w);
    window.localStorage.setItem(WEEKSTART_KEY, w);
    window.dispatchEvent(
      new StorageEvent("storage", { key: WEEKSTART_KEY, newValue: w })
    );
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === WEEKSTART_KEY && (e.newValue === "sun" || e.newValue === "mon"))
        setWs(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [ws, update];
}

/**
 * Weekly period identifier = the date (YYYY-MM-DD) the current week *starts* on,
 * honouring the user's chosen first day of the week (default Sunday). Using the
 * start date makes "which record is this week" unambiguous and setting-aware.
 */
export function weeklyPeriod(
  weekStart: WeekStart = "sun",
  d = new Date()
): string {
  const startDow = weekStart === "mon" ? 1 : 0;
  const diff = (d.getDay() - startDow + 7) % 7;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - diff);
  return dailyPeriod(start);
}

export function quarterlyPeriod(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

/** Whole days from today until the last day of the current quarter (inclusive). */
export function daysLeftInQuarter(d = new Date()): number {
  const endMonth = Math.floor(d.getMonth() / 3) * 3 + 2; // last month of the quarter
  const end = new Date(d.getFullYear(), endMonth + 1, 0); // last day of that month
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));
}

/* -------------------------------- fetch json ------------------------------- */
export async function jsonFetch<T = unknown>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error("request_failed"), { data, status: res.status });
  return data as T;
}
