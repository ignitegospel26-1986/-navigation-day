"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ToneSwitch } from "@/components/tone-switch";
import { jsonFetch, dailyPeriod, useWeekStart } from "@/lib/client";
import type { Tone } from "@/lib/prompts";
import {
  DEFAULT_PREFS,
  getReminderPrefs,
  registerServiceWorker,
  requestNotificationPermission,
  saveReminderPrefs,
  showNotification,
  type ReminderPrefs,
} from "@/lib/reminders";

export function SettingsModal({
  open,
  onClose,
  tone,
  onToneChange,
}: {
  open: boolean;
  onClose: () => void;
  tone: Tone;
  onToneChange: (t: Tone) => void;
}) {
  const [weekStart, setWeekStart] = useWeekStart();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [synced, setSynced] = useState<boolean | null>(null);
  const [calStep, setCalStep] = useState<"idle" | "confirm">("idle");
  const [calBusy, setCalBusy] = useState(false);
  const [calMsg, setCalMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPrefs(getReminderPrefs());
    setPerm(
      typeof Notification === "undefined" ? "unsupported" : Notification.permission
    );
    setCalStep("idle");
    setCalBusy(false);
    setCalMsg(null);
    setSynced(null);
    jsonFetch<{ synced: boolean }>("/api/calendar")
      .then((d) => setSynced(d.synced))
      .catch(() => setSynced(null));
  }, [open]);

  const update = (patch: Partial<ReminderPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      saveReminderPrefs(next);
      return next;
    });
  };

  async function toggleBrowser() {
    if (!prefs.browserEnabled) {
      const result = await requestNotificationPermission();
      setPerm(result);
      if (result !== "granted") return;
      await registerServiceWorker();
      update({ browserEnabled: true });
    } else {
      update({ browserEnabled: false });
    }
  }

  async function doSync() {
    setCalBusy(true);
    setCalMsg(null);
    try {
      await jsonFetch("/api/calendar", {
        method: "POST",
        body: JSON.stringify({
          startDate: dailyPeriod(),
          dailyTime: prefs.dailyTime,
          weeklyTime: prefs.weeklyTime,
          quarterlyTime: prefs.quarterlyTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      setSynced(true);
      setCalStep("idle");
      setCalMsg("已同步到你的行事曆 ✓");
    } catch {
      setCalMsg("同步失敗，請再試一次。");
    } finally {
      setCalBusy(false);
    }
  }

  async function doRemove() {
    setCalBusy(true);
    setCalMsg(null);
    try {
      await jsonFetch("/api/calendar", { method: "DELETE" });
      setSynced(false);
      setCalMsg("已從你的行事曆移除這些提醒。");
    } catch {
      setCalMsg("移除失敗，請再試一次。");
    } finally {
      setCalBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="settings-title">
      <div className="mb-6 flex items-center justify-between">
        <h2 id="settings-title" className="font-serif text-2xl text-ink">
          設定
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="btn btn-ghost h-8 w-8 !p-0 text-lg text-ink-soft"
        >
          ✕
        </button>
      </div>

      <div className="max-h-[68vh] space-y-8 overflow-y-auto pr-3">
        {/* Tone */}
        <section>
          <h3 className="text-[15px] font-medium text-ink">提問語氣</h3>
          <p className="mb-3 mt-1 text-[13px] text-muted">
            只影響之後看到的提問文字，不會改動已寫入的歷史紀錄。
          </p>
          <ToneSwitch tone={tone} onChange={onToneChange} />
        </section>

        <div className="h-px bg-hairline" />

        {/* Week start */}
        <section>
          <h3 className="text-[15px] font-medium text-ink">每週從哪天開始</h3>
          <p className="mb-3 mt-1 text-[13px] text-muted">
            決定「每週整理」算作同一週的範圍。預設從週日開始。
          </p>
          <div className="inline-flex rounded-full border border-hairline bg-surface-2/60 p-0.5">
            {(
              [
                ["sun", "週日～週六"],
                ["mon", "週一～週日"],
              ] as const
            ).map(([v, label]) => {
              const active = weekStart === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setWeekStart(v)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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
        </section>

        <div className="h-px bg-hairline" />

        {/* Times */}
        <section>
          <h3 className="text-[15px] font-medium text-ink">提醒時段</h3>
          <p className="mb-3 mt-1 text-[13px] text-muted">
            自訂你想被提醒的時間，下面兩種提醒方式共用。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TimeField
              label="每日（平日）"
              value={prefs.dailyTime}
              onChange={(v) => update({ dailyTime: v })}
            />
            <TimeField
              label="每週（週日）"
              value={prefs.weeklyTime}
              onChange={(v) => update({ weeklyTime: v })}
            />
          </div>
        </section>

        <div className="h-px bg-hairline" />

        {/* Browser notifications */}
        <section>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[15px] font-medium text-ink">瀏覽器通知</h3>
              <p className="mt-1 text-[13px] text-muted">
                在你開著這個分頁時提醒你。關掉分頁就不會響——
                想在關閉後也收到，請用下方的行事曆同步。
              </p>
            </div>
            <button
              type="button"
              onClick={toggleBrowser}
              disabled={perm === "unsupported"}
              aria-pressed={prefs.browserEnabled}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                prefs.browserEnabled ? "bg-accent" : "bg-surface-2"
              } disabled:opacity-40`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-paper shadow transition-transform ${
                  prefs.browserEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {perm === "denied" && (
            <p className="mt-2 text-[13px] text-danger">
              通知已被瀏覽器封鎖，請到網站設定重新允許。
            </p>
          )}
          {perm === "unsupported" && (
            <p className="mt-2 text-[13px] text-muted">此瀏覽器不支援通知。</p>
          )}
          {prefs.browserEnabled && perm === "granted" && (
            <button
              type="button"
              onClick={() =>
                showNotification("導航日", "通知運作正常，就像這樣提醒你。")
              }
              className="btn btn-ghost mt-3 px-4 py-2 text-sm"
            >
              傳一則測試通知
            </button>
          )}
        </section>

        <div className="h-px bg-hairline" />

        {/* Calendar sync */}
        <section>
          <h3 className="text-[15px] font-medium text-ink">同步到 Google 行事曆</h3>
          <p className="mt-1 text-[13px] text-muted">
            在<strong className="text-ink-soft">你自己的</strong>行事曆建立循環提醒，
            關閉 App 也會提醒你。可隨時移除，或改時段後重新同步。
          </p>

          {calStep === "confirm" ? (
            <div className="mt-3 rounded-xl border border-hairline bg-surface-2/50 p-4">
              <p className="text-[13px] font-medium text-ink">
                即將在你的 Google 行事曆建立這些循環提醒：
              </p>
              <ul className="mt-2 space-y-1 text-[13px] text-ink-soft">
                <li>· 平日每天 {prefs.dailyTime}：每日打卡</li>
                <li>· 每週日 {prefs.weeklyTime}：每週整理</li>
                <li>· 每季一次：季度深度重啟（整天）</li>
              </ul>
              <p className="mt-2 text-[12px] text-muted">
                重複同步會取代舊的，不會重複建立。要改時間，先到上方「提醒時段」調整。
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={doSync}
                  disabled={calBusy}
                  className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {calBusy ? "同步中⋯" : "確認同步"}
                </button>
                <button
                  type="button"
                  onClick={() => setCalStep("idle")}
                  disabled={calBusy}
                  className="btn btn-ghost px-4 py-2 text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-[13px]">
                目前狀態：
                {synced === null ? (
                  <span className="text-muted">查詢中⋯</span>
                ) : synced ? (
                  <span className="text-accent">已同步 ✓</span>
                ) : (
                  <span className="text-muted">尚未同步</span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalMsg(null);
                    setCalStep("confirm");
                  }}
                  className="btn btn-primary px-5 py-2.5 text-sm"
                >
                  {synced ? "重新同步 / 更新時間" : "同步到我的行事曆"}
                </button>
                {synced && (
                  <button
                    type="button"
                    onClick={doRemove}
                    disabled={calBusy}
                    className="btn btn-ghost px-4 py-2.5 text-sm disabled:opacity-50"
                  >
                    {calBusy ? "移除中⋯" : "移除行事曆提醒"}
                  </button>
                )}
              </div>
            </>
          )}

          {calMsg && <p className="mt-2 text-[13px] text-ink-soft">{calMsg}</p>}
        </section>
      </div>
    </Modal>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-ink-soft">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field px-3 py-2 text-[15px]"
      />
    </label>
  );
}
