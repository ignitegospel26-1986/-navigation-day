"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ToneSwitch } from "@/components/tone-switch";
import {
  jsonFetch,
  dailyPeriod,
  useWeekStart,
  useConfirmSave,
} from "@/lib/client";
import type { Tone } from "@/lib/prompts";
import {
  DEFAULT_PREFS,
  WEEKDAY_LABELS,
  getReminderPrefs,
  registerServiceWorker,
  requestNotificationPermission,
  saveReminderPrefs,
  showNotification,
  type ReminderPrefs,
} from "@/lib/reminders";

type RType = "daily" | "weekly" | "quarterly";
const TYPES: RType[] = ["daily", "weekly", "quarterly"];
const TYPE_LABELS: Record<RType, string> = {
  daily: "每日",
  weekly: "每週",
  quarterly: "季度",
};
const allOff: Record<RType, boolean> = {
  daily: false,
  weekly: false,
  quarterly: false,
};

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
  const [confirmSave, setConfirmSave] = useConfirmSave();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [status, setStatus] = useState<Record<RType, boolean> | null>(null);
  const [calStep, setCalStep] = useState<"idle" | "confirm" | "confirmRemove">(
    "idle"
  );
  const [calBusy, setCalBusy] = useState(false);
  const [calMsg, setCalMsg] = useState<string | null>(null);
  const [syncSel, setSyncSel] = useState<Record<RType, boolean>>({
    daily: true,
    weekly: true,
    quarterly: true,
  });
  const [removeSel, setRemoveSel] = useState<Record<RType, boolean>>(allOff);

  useEffect(() => {
    if (!open) return;
    setPrefs(getReminderPrefs());
    setPerm(
      typeof Notification === "undefined" ? "unsupported" : Notification.permission
    );
    setCalStep("idle");
    setCalBusy(false);
    setCalMsg(null);
    setStatus(null);
    setSyncSel({ daily: true, weekly: true, quarterly: true });
    setRemoveSel(allOff);
    jsonFetch<Record<RType, boolean>>("/api/calendar")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open]);

  const update = (patch: Partial<ReminderPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      saveReminderPrefs(next);
      return next;
    });
  };

  const syncedLabel = () =>
    TYPES.filter((t) => status?.[t])
      .map((t) => TYPE_LABELS[t])
      .join("、") || "無";
  const anySynced = !!status && TYPES.some((t) => status[t]);

  const syncDesc = (t: RType) =>
    t === "daily"
      ? `每日打卡（${prefs.dailyWeekdaysOnly ? "平日" : "每天"} ${prefs.dailyTime}）`
      : t === "weekly"
        ? `每週整理（每${WEEKDAY_LABELS[prefs.weeklyDay]} ${prefs.weeklyTime}）`
        : `季度深度重啟（每季第 ${prefs.quarterlyDay} 天）`;

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

  const refreshStatus = async () => {
    const s = await jsonFetch<Record<RType, boolean>>("/api/calendar").catch(
      () => null
    );
    if (s) setStatus(s);
  };

  async function doSync() {
    const types = TYPES.filter((t) => syncSel[t]);
    if (!types.length) {
      setCalMsg("請至少勾選一項。");
      return;
    }
    setCalBusy(true);
    setCalMsg(null);
    try {
      await jsonFetch("/api/calendar", {
        method: "POST",
        body: JSON.stringify({
          startDate: dailyPeriod(),
          types,
          dailyWeekdaysOnly: prefs.dailyWeekdaysOnly,
          dailyTime: prefs.dailyTime,
          weeklyDay: prefs.weeklyDay,
          weeklyTime: prefs.weeklyTime,
          quarterlyDay: prefs.quarterlyDay,
          quarterlyTime: prefs.quarterlyTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      await refreshStatus();
      setCalStep("idle");
      setCalMsg("已同步到你的行事曆 ✓");
    } catch {
      setCalMsg("同步失敗，請再試一次。");
    } finally {
      setCalBusy(false);
    }
  }

  async function doRemove() {
    const types = TYPES.filter((t) => removeSel[t]);
    if (!types.length) {
      setCalMsg("請至少勾選一項要移除的。");
      return;
    }
    setCalBusy(true);
    setCalMsg(null);
    try {
      await jsonFetch(`/api/calendar?types=${types.join(",")}`, {
        method: "DELETE",
      });
      await refreshStatus();
      setCalStep("idle");
      setCalMsg("已移除選定的提醒。");
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

        {/* Confirm before save */}
        <section>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[15px] font-medium text-ink">儲存前先確認</h3>
              <p className="mt-1 text-[13px] text-muted">
                開著的話，每次按儲存會先跳一個小確認再存
                （例如：打卡還有題目沒填，或你在「紀錄」頁改以前的內容）。
                不想每次被問就關掉。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmSave(!confirmSave)}
              role="switch"
              aria-checked={confirmSave}
              className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                confirmSave ? "bg-accent" : "bg-surface-2"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-paper shadow transition-transform ${
                  confirmSave ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>

        <div className="h-px bg-hairline" />

        {/* Times */}
        <section>
          <h3 className="text-[15px] font-medium text-ink">提醒時段</h3>
          <p className="mb-3 mt-1 text-[13px] text-muted">
            自訂被提醒的日子與時間，通知與行事曆共用。
          </p>
          <div className="space-y-4">
            {/* daily */}
            <div>
              <span className="mb-1.5 block text-[13px] text-ink-soft">每日</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-hairline bg-surface-2/60 p-0.5">
                  {(
                    [
                      [true, "只平日"],
                      [false, "每天"],
                    ] as const
                  ).map(([v, label]) => {
                    const active = prefs.dailyWeekdaysOnly === v;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => update({ dailyWeekdaysOnly: v })}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
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
                <TimeSelect
                  value={prefs.dailyTime}
                  onChange={(v) => update({ dailyTime: v })}
                />
              </div>
            </div>

            {/* weekly */}
            <div>
              <span className="mb-1.5 block text-[13px] text-ink-soft">每週</span>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={prefs.weeklyDay}
                  onChange={(e) => update({ weeklyDay: Number(e.target.value) })}
                  className="rounded-lg border border-hairline bg-paper px-3 py-2 text-[15px] text-ink"
                >
                  {WEEKDAY_LABELS.map((label, i) => (
                    <option key={i} value={i}>
                      {label}
                    </option>
                  ))}
                </select>
                <TimeSelect
                  value={prefs.weeklyTime}
                  onChange={(v) => update({ weeklyTime: v })}
                />
              </div>
            </div>

            {/* quarterly */}
            <div>
              <span className="mb-1.5 block text-[13px] text-ink-soft">每季</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted">每季第</span>
                <div className="w-16">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={prefs.quarterlyDay}
                    onChange={(e) =>
                      update({
                        quarterlyDay: Math.min(
                          90,
                          Math.max(1, Number(e.target.value) || 1)
                        ),
                      })
                    }
                    className="field px-3 py-2 text-center text-[15px]"
                  />
                </div>
                <span className="text-[13px] text-muted">/ 90 天（整天）</span>
              </div>
            </div>
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
              role="switch"
              aria-checked={prefs.browserEnabled}
              className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                prefs.browserEnabled ? "bg-accent" : "bg-surface-2"
              } disabled:opacity-40`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-paper shadow transition-transform ${
                  prefs.browserEnabled ? "translate-x-5" : "translate-x-0"
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
            關閉 App 也會提醒你。可只同步/移除部分項目。
          </p>

          {calStep === "confirm" ? (
            <div className="mt-3 rounded-xl border border-hairline bg-surface-2/50 p-4">
              <p className="text-[13px] font-medium text-ink">
                要同步哪些？（可多選）
              </p>
              <div className="mt-2 space-y-2">
                <label className="flex cursor-pointer items-center gap-2 border-b border-hairline pb-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    style={{ accentColor: "var(--accent)" }}
                    checked={TYPES.every((t) => syncSel[t])}
                    onChange={(e) =>
                      setSyncSel({
                        daily: e.target.checked,
                        weekly: e.target.checked,
                        quarterly: e.target.checked,
                      })
                    }
                  />
                  <span className="text-[13px] font-medium text-ink">全選</span>
                </label>
                {TYPES.map((t) => (
                  <label key={t} className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      style={{ accentColor: "var(--accent)" }}
                      checked={syncSel[t]}
                      onChange={(e) =>
                        setSyncSel({ ...syncSel, [t]: e.target.checked })
                      }
                    />
                    <span className="text-[13px] text-ink-soft">{syncDesc(t)}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-muted">
                重複同步會取代舊的，不會重複建立。要改日子/時間，先到上方「提醒時段」調整。
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
          ) : calStep === "confirmRemove" ? (
            <div className="mt-3 rounded-xl border border-hairline bg-surface-2/50 p-4">
              <p className="text-[13px] font-medium text-ink">要移除哪些？</p>
              <p className="mt-1 text-[12px] text-muted">
                目前已同步：{syncedLabel()}
              </p>
              <div className="mt-2 space-y-2">
                {TYPES.map((t) => {
                  const exists = !!status?.[t];
                  return (
                    <label
                      key={t}
                      className={`flex items-center gap-2 ${
                        exists ? "cursor-pointer" : "opacity-40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        style={{ accentColor: "var(--accent)" }}
                        disabled={!exists}
                        checked={removeSel[t]}
                        onChange={(e) =>
                          setRemoveSel({ ...removeSel, [t]: e.target.checked })
                        }
                      />
                      <span className="text-[13px] text-ink-soft">
                        {TYPE_LABELS[t]}
                        {!exists && "（未同步）"}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={doRemove}
                  disabled={calBusy}
                  className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {calBusy ? "移除中⋯" : "確認移除"}
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
                {status === null ? (
                  <span className="text-muted">查詢中⋯</span>
                ) : anySynced ? (
                  <span className="text-accent">已同步：{syncedLabel()}</span>
                ) : (
                  <span className="text-muted">尚未同步</span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalMsg(null);
                    setSyncSel({ daily: true, weekly: true, quarterly: true });
                    setCalStep("confirm");
                  }}
                  className="btn btn-primary px-5 py-2.5 text-sm"
                >
                  {anySynced ? "重新同步 / 更新" : "同步到我的行事曆"}
                </button>
                {anySynced && (
                  <button
                    type="button"
                    onClick={() => {
                      setCalMsg(null);
                      setRemoveSel(status ?? allOff);
                      setCalStep("confirmRemove");
                    }}
                    className="btn btn-ghost px-4 py-2.5 text-sm"
                  >
                    移除行事曆提醒
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

/** Aesthetic 24h time picker (hour + 5-min steps) matching the app fields. */
function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [h, m] = value.split(":");
  const hour = h ?? "21";
  const min = m ?? "00";
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
  const cls =
    "rounded-lg border border-hairline bg-paper px-2.5 py-2 text-[15px] text-ink tabular-nums";
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${min}`)}
        className={cls}
      >
        {hours.map((hh) => (
          <option key={hh} value={hh}>
            {hh}
          </option>
        ))}
      </select>
      <span className="text-muted">:</span>
      <select
        value={min}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        className={cls}
      >
        {mins.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
    </div>
  );
}
