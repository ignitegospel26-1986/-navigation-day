const POINTS: { h: string; body: React.ReactNode }[] = [
  {
    h: "所有紀錄都在你自己的 Google 帳號裡",
    body: (
      <>
        當你按下「建立我的重啟空間」，這個 App
        會用你授權的權限，在<strong className="text-ink">你自己的 Google Drive</strong>
        建立一個名為「導航日」的資料夾，以及一份試算表。
        之後每一次打卡、每週整理、季度重啟，都是直接寫進
        <strong className="text-ink">你那份試算表</strong>。
      </>
    ),
  },
  {
    h: "這個網站與伺服器不儲存你的內容",
    body: (
      <>
        我們不建立自己的資料庫，也不備份、不快取你的答案。
        伺服器只是在你操作的當下，用你的授權把資料
        <strong className="text-ink">轉手寫進你自己的試算表</strong>，
        寫完就結束。分析圖表也是每次即時從你的試算表讀取運算，不留在我們這裡。
      </>
    ),
  },
  {
    h: "你可以隨時檢視、匯出、刪除全部資料",
    body: (
      <>
        因為資料就是一份你 Drive 裡的普通試算表，你隨時可以直接打開它、
        用 Google Sheets 匯出成 Excel／CSV，或整份刪除。
        刪除之後，這個 App 就再也讀不到任何東西——沒有別的副本。
      </>
    ),
  },
  {
    h: "只申請最小必要的授權範圍",
    body: (
      <ul className="mt-2 space-y-2">
        <li>
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink">
            drive.file
          </code>
          ：只能存取這個 App 自己建立的檔案。
          <span className="text-muted"> 它看不到你雲端硬碟裡其他任何檔案。</span>
        </li>
        <li>
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink">
            spreadsheets
          </code>
          ：讀寫上面那份紀錄試算表。
        </li>
        <li>
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink">
            calendar.events
          </code>
          ：<span className="text-muted">（選擇性）</span>
          只有在你按下「同步到行事曆」時，才會在你自己的行事曆建立提醒。
        </li>
      </ul>
    ),
  },
];

/** Shared privacy copy used by both the /privacy page and the popup modal. */
export function PrivacyContent({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <p className="text-sm tracking-[0.2em] text-accent">P R I V A C Y</p>
      <h2
        className={`mt-3 font-serif font-medium tracking-tight text-ink ${
          compact ? "text-2xl" : "text-4xl"
        }`}
      >
        你的資料，主權在你手上
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
        這個工具的核心設計是「資料主權歸使用者」。以下是白紙黑字的承諾，
        也是它實際的運作方式。
      </p>

      <div className={`space-y-8 ${compact ? "mt-8" : "mt-12"}`}>
        {POINTS.map((p, i) => (
          <section key={p.h} className="flex gap-4">
            <span className="font-serif text-xl text-accent/70 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="font-serif text-lg text-ink">{p.h}</h3>
              <div className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
                {p.body}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-hairline bg-surface-2/50 p-5 text-[15px] leading-relaxed text-ink-soft">
        <p className="font-medium text-ink">一句話總結</p>
        <p className="mt-2">
          我們提供的是「筆和格式」，紙一直在你手上。
          你可以隨時把紙收走，我們手上什麼都不會留下。
        </p>
      </div>
    </div>
  );
}
