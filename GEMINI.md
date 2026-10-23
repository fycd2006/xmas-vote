# Xmas Vote - Google Antigravity & Claude 指導規範

本檔案為聖誕廚藝競賽投票系統（Cloudflare 版）協同開發之最高指導規範。

## ⚠️ 核心禁令與最高準則

1. **全程免費、不綁信用卡**：
   - 僅使用 Cloudflare Workers Free 方案與其內含的 D1 資料庫。
   - 嚴禁啟用、建議或引入任何付費產品（Workers Paid、R2、Queues、KV 付費版等）。
2. **來賓只看菜名**：
   - 來賓投票頁、結果頁與所有公開 API（`GET /api/ballot` 等）一律只包含菜名（`name`）與必要識別碼（`id`）。
   - 嚴禁在資料庫儲存或在介面上顯示編號、參賽者與簡介。
3. **驗證守門（完成前必跑）**：
   - 任何改動宣告完成或 commit 前，必須執行 `npm run verify` 且全部通過（依序包含：`typecheck` → `lint` → `test` → `build:check`）。
   - 通過前不可說「完成」；失敗必須修到通過為止。
4. **伺服器端原子寫入（claim 模式）**：
   - 寫票與把 token 標記為已使用，必須在同一個 D1 `db.batch()` 內以條件式 SQL 完成，防止並行雙花。
5. **禁止弱化測試**：
   - 嚴禁為了讓測試通過而刪除、跳過（`.skip`）或放寬斷言。
6. **所有使用者介面一律使用繁體中文**：
   - 前端所有文案一律集中於 `web/src/i18n/zh-TW.ts`。

## 🛠️ 指令手冊

- `npm run verify`：執行全自動化驗證守門（TypeScript + ESLint + Vitest + Web Build）
- `npm run dev`：啟動本機 Worker 與 D1 模擬環境
- `npm run dev:web`：單獨啟動前端 Vite 開發伺服器
- `npm run test`：執行單元與整合測試
- `npm run db:migrate:local`：套用本機 D1 migrations
- `npm run db:migrate:remote`：套用正式環境 D1 migrations
