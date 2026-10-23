# 聖誕廚藝競賽投票系統（Cloudflare 版）

🎄 為 90 人聖誕派對量身打造的極簡、安全、手機優先投票系統。

---

## 🌟 專案核心特點與免費原則

- **全程免費、不綁信用卡**：
  - 僅使用 Cloudflare Workers Free 方案與內含的 D1 資料庫。
  - 絕不使用、絕不建議任何付費服務（如 Workers Paid、R2、Queues 等）。
  - 若超過免費額度，Cloudflare 只會回傳錯誤，絕對不會產生任何扣款帳單。
- **來賓只看得到菜名**：
  - 來賓投票頁、結果頁與所有公開 API 回應僅包含菜名與識別碼。
  - 系統不儲存也不顯示菜色編號、參賽者與簡介，保持比賽公平與純粹。
- **嚴格伺服器端驗證與防作弊**：
  - 一張卡片（QR Code / 10 碼 Crockford Base32 短碼）只能投一次，且必須恰好選 3 道互不相同的菜色一次送出。
  - 採用 **D1 單一 Batch 原子交易（Claim 模式）**，確保即使並行重送或網路延遲也絕不重複計票。
  - 管理員具備作廢、補發（Reissue）、重置投票等完整防呆機制。

---

## 📊 Cloudflare Free 方案額度與限制說明（官方數據）

根據 Cloudflare 官方文件規範，免費方案額度如下：

| 服務項目 | 免費方案每日額度 | 重置時間 | 超額處理機制 | 本專案預期用量 |
| :--- | :--- | :--- | :--- | :--- |
| **Workers 請求數** | **100,000 次 / 天** | UTC 00:00 (台灣 08:00) | 回傳 HTTP 錯誤，不扣款 | 約 1,000 ~ 2,000 次（遠低於上限） |
| **Workers CPU 時間** | **10 ms / 請求** | 每個請求獨立計算 | 中斷請求，不扣款 | 處理 D1 batch 僅需約 1~3 ms |
| **D1 讀取列數 (Rows Read)** | **5,000,000 列 / 天** | UTC 00:00 (台灣 08:00) | 查詢失敗（Hard Stop），不扣款 | 結果頁輪詢只讀 1 列 `settings`，總讀取估計 < 5,000 列 |
| **D1 寫入列數 (Rows Written)** | **100,000 列 / 天** | UTC 00:00 (台灣 08:00) | 寫入失敗（Hard Stop），不扣款 | 每票約寫 5 列，90 票約 450~600 列 |
| **D1 儲存空間** | **5 GB** | 持續有效 | 無法新增資料，不扣款 | 本專案全部資料 < 5 MB |

> ⚠️ **已知限制與風險應變**：
> 1. 卡片若被拍照外流，先掃描送出者有效；主辦人可由後台將該卡「作廢」並「補發」新卡。
> 2. 若極端情況下達到每日免費上限，系統會暫時回報錯誤，直至台灣時間早上 08:00（UTC 00:00）自動重置（正常使用下預估消耗不到 1% 額度）。

---

## 🚀 主辦人前置作業（免費、免信用卡）

在開始部署前，主辦人請先完成以下準備：

1. **註冊 Cloudflare 帳號**：至 [Cloudflare 官網](https://dash.cloudflare.com/sign-up) 註冊（選擇免費方案即可）。
2. **本機環境與登入**：
   確保本機安裝 Node.js 20 以上，終端機執行：
   ```bash
   npx wrangler login
   ```
   瀏覽器會自動開啟以進行免費授權。
3. **建立 D1 資料庫**：
   ```bash
   npx wrangler d1 create xmas-vote
   ```
   終端機會輸出 `database_id`，請將該 id 填入 `wrangler.jsonc` 中的 `database_id` 欄位。
4. **設定環境 Secret**：
   - `ADMIN_PASSWORD`：後台管理員登入密碼（至少 12 字元）。
   - `SESSION_SECRET`：Cookie HMAC 簽章安全金鑰（至少 32 字元的隨機亂數字串）。
   - 本機開發請複製 `.dev.vars.example` 為 `.dev.vars` 並填寫。
   - 正式環境部署時請透過指令設定（見下方部署章節）。

---

## 💻 本機開發與自動化指令

本專案配置完整的自動化檢核與護欄：

```bash
# 安裝依賴
npm install

# 執行全自動化驗證守門（Commit 前必跑：型別檢查 + 代碼檢查 + 測試 + 前端建置）
npm run verify

# 本機 D1 套用資料庫遷移
npm run db:migrate:local

# 啟動本機 Worker 與本地 D1 模擬環境
npm run dev

# 執行單元與整合測試
npm run test
```

---

## 🚢 正式部署流程

1. **套用正式環境資料庫遷移**：
   ```bash
   npx wrangler d1 migrations apply xmas-vote --remote
   ```
2. **設定雲端 Secret**：
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```
3. **建置並發布至 Cloudflare**：
   ```bash
   npm run verify
   npx wrangler deploy
   ```
   部署成功後將取得專屬的 `https://xmas-vote.<your-subdomain>.workers.dev` 網址。

---

## 🎪 活動當天操作指南

1. **列印卡片**：
   - 主辦人登入後台 `/admin`，進入「卡片列印 `/admin/print`」。
   - 確認畫面上方顯示的網址為正式的 `workers.dev` 網址。
   - 點擊「產生 90 張卡片」，直接點「列印卡片」透過 A4 列印或另存為 PDF。每張卡片皆附專屬 QR Code 與 Crockford Base32 短碼。
2. **準備菜色**：
   - 進入 `/admin/dishes`，在「準備中」狀態下輸入當天參賽菜名並排定順序。
3. **開放投票**：
   - 比賽開始時，在 `/admin` 將狀態切換為「開放投票」。
4. **大螢幕投影**：
   - 開啟投影機並連至 `/results`，畫面上會即時顯示「已投票 X / 總卡數」進度條。
5. **結束投票與揭曉**：
   - 投票截止後，於後台切換為「結束投票」。
   - 按下「揭曉結果」開關，大螢幕結果頁將自動切換為得獎長條圖與前三名頒獎台！
