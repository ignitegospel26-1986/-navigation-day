# 上架完整手冊 · 導航日 Navigation Day

一份 Next.js 程式碼 → 發佈到 **網頁 / Android / Apple(iOS + Mac)**。
本手冊是「照著做」的步驟書；每一大段最後有「👉 需要 Claude 幫的」，你走到那步再叫我補程式或設定。

---

## 總覽

| 平台 | 做法 | 商店 | 一次性/年費 |
|---|---|---|---|
| 網頁 | Vercel 部署 | — | 免費起步 |
| Android | **TWA**（包你的網址成 App） | Google Play | 開發者帳號 **US$25 一次** |
| iOS / Mac | **Capacitor**（殼載入你的網站 + 原生登入） | App Store / Mac App Store | Apple Developer **US$99/年** |

**建議順序**：① 網頁上線 → ② Android(TWA) → ③ iOS/Mac。後兩者都依賴「網頁已上線」。

**全程最重要的一件事** ⚠️
Google 登入**不能在內嵌 WebView 裡跑**（會被擋 `disallowed_useragent`）。
- Android **TWA 沒問題**（它是真 Chrome）。
- iOS/Mac Capacitor **要另接原生 Google 登入**（Part 3 會處理）。

---

# Part 1 — 網頁上線（Vercel）

### 你需要
- GitHub 帳號、Vercel 帳號、Google Cloud 專案（OAuth 憑證你已建立）。

### 步驟
1. **推上 GitHub**
   ```bash
   git init && git add . && git commit -m "init"
   # 到 GitHub 建 repo，然後：
   git remote add origin https://github.com/你/navigation-day.git
   git push -u origin main
   ```
   （`.env.local` 已被 `.gitignore` 忽略，不會外洩。）

2. **Vercel 匯入**：vercel.com → Add New → Project → 選這個 repo（自動辨識 Next.js，零設定）。

3. **環境變數**（Settings → Environment Variables）：
   `AUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`NEXT_PUBLIC_SITE_URL`
   （細節見 [DEPLOY.md](DEPLOY.md) 第 0 節。）

4. **Deploy** → 得到 `https://xxx.vercel.app`。

5. **綁自訂網域**（Settings → Domains），自動 HTTPS。

6. **回填**：把 `NEXT_PUBLIC_SITE_URL` 改成正式網域；到 Google Cloud OAuth 用戶端加入
   `https://你的網域/api/auth/callback/google`。

7. **OAuth 驗證（給多人用前必做）**：OAuth 同意畫面 → 發布 App → 品牌驗證
   （你沒用 restricted 權限，**免安全稽核**；隱私政策用 `https://你的網域/privacy`）。

### 驗收
- [ ] 首頁開得起來、`GET /api/health` 回 `{ok:true}`
- [ ] Google 登入 → 建立空間 → 打卡寫入試算表
- [ ] PWA 可安裝（網址列安裝圖示）

👉 **需要 Claude 幫的**：Vercel 部署失敗排錯、環境變數檢查、自訂網域/OAuth 回填確認。

---

# Part 2 — Android 上架（Google Play，用 TWA）

TWA = 用一個超薄 Android 殼，全螢幕載入你的 PWA 網址（跑真 Chrome）。你已經有 PWA manifest 與圖示，所以很快。

### 你需要
- **Google Play 開發者帳號**（US$25 一次）：play.google.com/console
- 網頁已上線（Part 1 完成）
- 工具二選一：**PWABuilder**（網頁介面，最簡單）或 **Bubblewrap CLI**

### 步驟（PWABuilder 路線，推薦）
1. 到 [pwabuilder.com](https://www.pwabuilder.com) → 輸入 `https://你的網域` → 看 PWA 分數（缺什麼它會提示）。
2. **Package For Stores → Android** → 下載 Android 套件（含簽章金鑰或用 Play App Signing）。
3. **Digital Asset Links（關鍵）**：把 App 與你的網域綁定，Chrome 才會用全螢幕 TWA（否則會有網址列）。
   - PWABuilder 會給你一段 `assetlinks.json`（含 App 的 SHA-256 簽章指紋）。
   - 這個檔要放到 `https://你的網域/.well-known/assetlinks.json`。
4. **Play Console**：建立 App → 填商店資訊（名稱「導航日」、圖示、截圖、隱私政策 URL `.../privacy`）→ 上傳 AAB → 內部測試 → 正式發佈。

### Gotcha
- `assetlinks.json` 的 SHA-256 指紋必須對應你**實際上傳到 Play 的簽章**（用 Play App Signing 的話，指紋在 Play Console → App integrity 裡拿）。
- OAuth 在 TWA 沒問題（真 Chrome + Custom Tabs）。
- 首次審核通常 1–3 天。

👉 **需要 Claude 幫的**：
- 幫你加 `/.well-known/assetlinks.json` 的提供方式（Next.js route 或 `public/` 靜態檔）——走到第 3 步叫我。
- 檢查 manifest / PWA 分數、`start_url`、圖示是否符合 Play 要求。

---

# Part 3 — Apple 上架（iOS App Store + Mac，用 Capacitor）

策略：用 **Capacitor** 產生 iOS/Mac 原生殼，載入你線上的網站（hybrid），並**接原生 Google 登入**解決 WebView 限制。

### 你需要
- **Apple Developer Program**（US$99/年）
- 一台 **Mac** + **Xcode**（iOS/Mac 打包只能在 macOS 上做）
- 網頁已上線

### 步驟
1. **加入 Capacitor**（在專案裡）
   ```bash
   npm i @capacitor/core @capacitor/cli @capacitor/ios
   npx cap init "導航日" "app.navigationday" --web-dir=public
   npx cap add ios
   ```
2. **設定載入線上網站**（`capacitor.config.ts` 的 `server.url` 指向 `https://你的網域`）——這樣殼直接顯示你的 SSR 網站，最省事。
3. **接原生 Google 登入**（因為 WKWebView 不能跑 Google OAuth）：
   - 裝 `@codetrix-studio/capacitor-google-auth`（或用 `ASWebAuthenticationSession`）。
   - 在原生端拿到 Google token → 傳給網站建立 session。這段需要改一點登入流程，我會幫你接。
4. **Xcode**：`npx cap open ios` → 設定 Bundle ID、簽章（你的 Apple 帳號）、App 圖示。
5. **TestFlight → App Store 審核**。
6. **Mac 版**：iOS 專案可勾 **Mac Catalyst** 直接輸出 Mac App；或桌機直接用 **PWA 安裝**（Chrome/Edge「安裝」、Safari「加入 Dock」），不一定要上 Mac App Store。

### Gotcha（很重要）
- **審核 4.2「最低功能」**：Apple 可能質疑「只是網頁殼」。要通過，靠**原生登入 + 推播 + 離線/裝置整合**提升原生價值。純殼容易被退。
- iOS 的 Google 登入若走系統瀏覽器/原生 SDK 才會過；WKWebView 直接跑 OAuth 會被 Google 擋。
- iOS 16.4+ 的 PWA 也支援推播，若不想上架，PWA 也是一條路。

👉 **需要 Claude 幫的**：
- 建立 `capacitor.config.ts`、加 iOS 平台的設定。
- **改登入流程接原生 Google Sign-In**（這是 iOS 唯一的技術重點）。
- App 圖示/啟動畫面資產。

---

## 費用與帳號速查
| 項目 | 費用 |
|---|---|
| Vercel（起步） | 免費 |
| 自訂網域 | 依註冊商，約 US$10–15/年 |
| Google Play 開發者 | US$25（一次） |
| Apple Developer | US$99/年 |

## 進度追蹤
- [ ] Part 1 網頁上線（Vercel）
- [ ] Part 1 OAuth 品牌驗證
- [ ] Part 2 Android TWA 上 Play
- [ ] Part 3 iOS Capacitor + 原生登入 上 App Store
- [ ] Part 3 Mac（Catalyst 或 PWA）

> 你只要照 Part 1 → 2 → 3 走，卡在哪一步就把那步的畫面/錯誤貼給我，我幫你補程式或除錯。
