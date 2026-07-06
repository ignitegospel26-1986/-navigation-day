# 部署指南（網頁）· 導航日 Navigation Day

這個 App 是「使用者自己 Google 帳號的操作介面」：**無資料庫、無伺服器狀態**，每個請求都用使用者自己的 token 呼叫 Google API。因此它天生適合 **serverless 自動擴縮（閒置縮到零、尖峰自動加實例）**，你不需要自己架 load balancer。

推薦二選一：

- **Vercel** —— 最省事，Next.js 原生，自動擴縮，免費起步。（本專案首選）
- **Google Cloud Run** —— 容器、scale-to-zero、離 Google API 近、更多控制。（已附 `Dockerfile`）

---

## 0. 環境變數

| 變數 | 必填 | 說明 |
|---|---|---|
| `AUTH_SECRET` | ✅ | Auth.js 加密 session 用。產生：`npx auth secret` 或 `openssl rand -base64 33` |
| `GOOGLE_CLIENT_ID` | ✅ | Google Cloud OAuth 用戶端 ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google Cloud OAuth 用戶端密鑰 |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 正式網址，如 `https://navigationday.app`（用於 OG／manifest／metadataBase）|
| `AUTH_URL` | Cloud Run 需要 | 正式網址（Vercel 會自動偵測，可不填）|
| `AUTH_TRUST_HOST` | Cloud Run 需要 | 設為 `true`（非 Vercel 環境讓 Auth.js 信任反向代理的 Host）|

> 這些**只放在部署平台的環境變數**，不要 commit。`.env*` 已被 git 忽略。

---

## 1. 方案 A：Vercel（推薦）

1. 把專案推上 GitHub。
2. 到 [vercel.com](https://vercel.com) → **Add New → Project** → 匯入這個 repo（自動辨識為 Next.js，零設定）。
3. **Settings → Environment Variables** 填入：`AUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`NEXT_PUBLIC_SITE_URL`。（`AUTH_URL`/`AUTH_TRUST_HOST` 在 Vercel 不需要。）
4. **Deploy**。完成後會得到 `https://xxx.vercel.app`。
5. **Settings → Domains** 綁自訂網域（自動 HTTPS）。
6. 到 Google Cloud 設定正式 redirect URI（見第 3 節），用你的正式網域。
7. 若第一次部署時還沒有網域，先用 `xxx.vercel.app` 設 `NEXT_PUBLIC_SITE_URL` 與 redirect URI，之後綁網域再更新。

**自動擴縮**：Vercel 全自動、按用量計費、閒置近乎零成本，你不用做任何事。

---

## 2. 方案 B：Google Cloud Run（Docker）

已附 `Dockerfile`（Next standalone 輸出，`next.config.ts` 已設 `output: "standalone"`）。

先建議把密鑰放進 **Secret Manager**（比明文環境變數安全）：

```bash
gcloud secrets create auth-secret --replication-policy=automatic
printf '%s' 'YOUR_AUTH_SECRET' | gcloud secrets versions add auth-secret --data-file=-
# 對 google-client-secret 同樣做法
```

部署（用 `--source .`，會直接吃 Dockerfile）：

```bash
gcloud run deploy navigation-day \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 --memory 512Mi \
  --set-env-vars "NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN,AUTH_URL=https://YOUR_DOMAIN,AUTH_TRUST_HOST=true,GOOGLE_CLIENT_ID=YOUR_ID" \
  --set-secrets "AUTH_SECRET=auth-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest"
```

- `--min-instances 0`：沒人用時**縮到零**（不收費）。
- `--max-instances 10`：尖峰自動加到上限，就是你要的「多的時候自動調整」。
- 容器監聽 `$PORT`（Cloud Run 預設 8080，本 App 會自動讀取，不用改）。
- 健康檢查可用 `GET /api/health`（回 `{ ok: true }`）。

**先有網址、再回填**：第一次部署後 Cloud Run 會給一個 `https://xxx.run.app`。用它（或綁的自訂網域）更新 `NEXT_PUBLIC_SITE_URL` / `AUTH_URL` 與下方 redirect URI，再部署一次即可。

本機測試容器：
```bash
docker build -t navigation-day .
docker run -p 3000:3000 --env-file .env.local navigation-day
```

---

## 3. Google Cloud Console：正式 OAuth 設定（很重要）

1. **憑證 → OAuth 用戶端**，在「已授權的重新導向 URI」加入正式網域：
   ```
   https://YOUR_DOMAIN/api/auth/callback/google
   ```
   （少了會出現 `redirect_uri_mismatch`。本機的 `http://localhost:3000/...` 可保留。）

2. **OAuth 同意畫面 → 發布狀態**：目前是「測試」→ 上限 100 人、會顯示「未驗證」警告。
   要公開給很多人，需 **發布 App 並通過 Google OAuth 驗證**：
   - 你用的權限：`drive.file`（per-file，較寬鬆）＋ `spreadsheets`、`calendar.events`（**敏感 sensitive**）。
   - **你沒有用到 restricted 權限**（完整 Drive／Gmail 那種），所以**不需要昂貴的第三方安全稽核**，只要做**品牌驗證**（網域擁有權、Logo、隱私政策頁）。
   - 隱私政策 URL 直接用：`https://YOUR_DOMAIN/privacy`（現成的）。
   - 以 Console scope 選擇器上標示的 Sensitive/Restricted 為準。

---

## 4. 部署後檢查清單

- [ ] `https://YOUR_DOMAIN` 開得起來、顯示引導頁
- [ ] `GET /api/health` 回 `{ ok: true }`
- [ ] 用 Google 登入成功（沒有 `redirect_uri_mismatch` / `access_denied`）
- [ ] 「建立我的重啟空間」→ Drive 出現「導航日」資料夾與試算表
- [ ] 每日打卡寫入試算表；登出再登入直接進主控台（returning-user 偵測）
- [ ] 深色/深藍主題、PWA 可安裝（網址列的安裝圖示）

---

## 5. 擴展時要注意的唯一瓶頸：Google API 配額

因為每個人用自己的 token，機器層面幾乎不用管。但你的 **OAuth 專案有 API 配額**（例如 Sheets API 專案層級預設 ~300 req/min）。使用者變多時，到 **Cloud Console → API 和服務 → 配額** 申請調高即可。
