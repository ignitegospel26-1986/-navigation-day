# 導航日 · Navigation Day

一個給打工者／上班族的長期自我覺察工具。核心原則：**資料主權歸使用者** —— 所有紀錄只存在使用者自己的 Google 帳號裡（App 在使用者 Drive 建立一個資料夾與試算表），本網站與伺服器不儲存、不備份、不讀取任何使用者內容。

## 功能

- **Google 登入**（Auth.js / NextAuth v5），OAuth scope 最小化：`drive.file` + `spreadsheets` + `calendar.events`
- **建立重啟空間**：在使用者自己的 Drive 建立「導航日」資料夾 + 三分頁試算表（含 returning-user 偵測、垃圾桶復原、缺分頁自動補回）
- **每日打卡 / 每週整理**：卡片式，即時寫入使用者的 Google Sheet
- **季度深度重啟**：沉浸式一步一題引導，完成後生成可下載的「身分宣告卡」（canvas PNG，純本機、不上傳）
- **語氣切換**：溫柔版／犀利版，只影響之後看到的提問文字
- **分析儀表板**：活力值趨勢（Recharts）、內在模式高頻詞（CJK bigram 詞頻）、本季 vs 上季；即時運算不快取
- **提醒**：瀏覽器通知（開著分頁時）+ 同步到使用者自己的 Google 行事曆（關閉後仍提醒）
- 亮色「晨間紙感」／暗色「深夜書寫」雙主題、PWA 可安裝

## 技術棧

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Auth.js v5 · googleapis · Framer Motion · next-themes · Recharts

## 開始使用

### 1. 安裝

```bash
npm install
```

### 2. 設定 Google Cloud

1. 建立專案，啟用 **Google Drive API / Google Sheets API / Google Calendar API**
2. 設定「OAuth 同意畫面」（External；測試階段把自己的 email 加入「測試使用者」）
3. 建立「OAuth 用戶端 ID」→ 網頁應用程式，授權的重新導向 URI 加入：
   `http://localhost:3000/api/auth/callback/google`

### 3. 環境變數

複製 `.env.local.example` 為 `.env.local`，填入：

```bash
AUTH_SECRET=          # npx auth secret 產生
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 4. 開發

```bash
npm run dev
# http://localhost:3000
```

> Windows 註記：若 spawned shell 找不到 node，本專案的 `scripts/dev.cmd` 會先把 `C:\Program Files\nodejs` 加進 PATH 再啟動。

## 資料存放

一份試算表，三個分頁（每日／每週／季度）。每列開頭為：時間戳記、期別、語氣，其後為各題答案。欄位與提問文字都來自單一來源 `src/lib/prompts.ts`，兩者不會走鐘。

## 部署

支援任何 Next.js 部署方式。正式環境需另外設定 `NEXT_PUBLIC_SITE_URL`、（非 Vercel）`AUTH_TRUST_HOST=true` 與 `AUTH_URL`，並在 Google Cloud 加入正式網域的重新導向 URI。詳見 `.env.local.example`。

## 目錄

```
src/
  app/            頁面與 API 路由（/api/space、/api/records/[module]、/api/analytics、/api/calendar）
  components/     UI 元件（modules、modal、identity-card、insights、settings…）
  lib/            google.ts（Drive/Sheets/Calendar）、prompts.ts、schema.ts、analytics.ts、reminders.ts
```
