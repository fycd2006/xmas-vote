# Xmas Vote 開發進度表

## 里程碑狀態
- [x] **M0 骨架與自動化流程建置**：專案骨架、Git 配置、Git hook、驗證管線、D1 migrations、測試骨架。
- [ ] **M1 後端核心**：token 工具、ballot、vote、results、rateLimit 與整合測試。
- [ ] **M2 管理員功能**：auth (Cookie/HMAC)、/api/admin/* 全部路由與測試。
- [ ] **M3 來賓投票頁**：手機優先 UI、狀態分流、確認對話框、短碼輸入。
- [ ] **M4 管理後台**：總覽、菜色管理、token 管理。
- [ ] **M5 列印頁與結果頁**：QR 卡片 A4 列印排版、大螢幕輪詢結果頁。
- [ ] **M6 總測試與部署**：壓力測試、驗收確認、正式部署說明。

## 最新決定
- 採用根目錄控制工作區結構，`web/` 為前端 SPA，`worker/` 為 Hono 後端。
- 前端使用 React + Tailwind（聖誕主題綠/紅/金）。
- 部署模式為 Cloudflare Workers Assets（SPA 模式，`/api/*` 走 Worker）。
