# Xmas Vote - Claude 指導規範

本檔案與 GEMINI.md 保持 100% 雙向同步。

- **全程免費、不綁信用卡**：僅使用 Cloudflare Workers Free + D1。嚴禁付費產品。
- **來賓只看菜名**：公開 API 與頁面僅包含菜名與 id，無編號、參賽者、簡介或票數。
- **驗證守門**：改動完成前必須 `npm run verify` 全部通過。
- **原子 batch 寫入**：投票採用 claim 模式，以單一 D1 batch 確保防重送。
- **繁體中文**：文案集中於 `web/src/i18n/zh-TW.ts`。
