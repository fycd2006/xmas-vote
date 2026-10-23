// Crockford Base32 字元集（32 字元，排除 I, L, O, U）
export const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/**
 * 產生單一隨機 10 碼 Crockford Base32 Token
 * 使用 Web Crypto API (crypto.getRandomValues)，取每個 byte 的低 5 位元
 */
export function generateToken(): string {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  let token = ''
  for (let i = 0; i < 10; i++) {
    token += CROCKFORD_BASE32[bytes[i] & 31]
  }
  return token
}

/**
 * 將 10 碼 token 格式化為 5-5 顯示形式（例如：K7M2X-9QF4T）
 */
export function formatToken(token: string): string {
  const clean = token.replace(/[^0-9A-Za-z]/g, '').toUpperCase()
  if (clean.length === 10) {
    return `${clean.slice(0, 5)}-${clean.slice(5, 10)}`
  }
  return token
}

/**
 * 正規化使用者輸入的 token：
 * 1. 轉大寫
 * 2. 移除所有連字號與空白
 * 3. 容錯替換：O -> 0, I -> 1, L -> 1
 * 4. 驗證是否恰為 10 碼且字元皆在 Crockford Base32 範圍內
 * 若無效回傳 null，有效回傳 10 碼大寫字串
 */
export function normalizeToken(input: unknown): string | null {
  if (typeof input !== 'string') return null
  let normalized = input.trim().toUpperCase()
  // 移除連字號與空白
  normalized = normalized.replace(/[-\s]/g, '')
  // 容錯替換
  normalized = normalized.replace(/O/g, '0').replace(/[IL]/g, '1')

  if (normalized.length !== 10) return null

  // 驗證字元集
  const validRegex = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/
  if (!validRegex.test(normalized)) {
    return null
  }

  return normalized
}
