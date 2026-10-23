export const ADMIN_COOKIE_NAME = 'admin_session'
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 小時

/**
 * 將字串轉為 UTF-8 Uint8Array
 */
function toUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

/**
 * 將 ArrayBuffer 轉為十六進位小寫字串
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 常數時間比對兩個長度相同的十六進位字串或 ArrayBuffer，防止 Timing Attack
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * 密碼安全驗證（各自計算 SHA-256 雜湊後以常數時間比對）
 */
export async function verifyPassword(inputPassword: string, targetPassword: string): Promise<boolean> {
  if (!inputPassword || !targetPassword) return false
  const inputHashBuffer = await crypto.subtle.digest('SHA-256', toUint8Array(inputPassword))
  const targetHashBuffer = await crypto.subtle.digest('SHA-256', toUint8Array(targetPassword))
  return timingSafeEqual(bufferToHex(inputHashBuffer), bufferToHex(targetHashBuffer))
}

/**
 * 匯入 HMAC-SHA256 Key
 */
async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    toUint8Array(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/**
 * 計算指定文字的 HMAC-SHA256 簽章（回傳 hex 字串）
 */
export async function signHmac(secret: string, data: string): Promise<string> {
  const key = await getHmacKey(secret)
  const sigBuffer = await crypto.subtle.sign('HMAC', key, toUint8Array(data))
  return bufferToHex(sigBuffer)
}

/**
 * 驗證指定文字的 HMAC-SHA256 簽章
 */
export async function verifyHmac(secret: string, data: string, signatureHex: string): Promise<boolean> {
  const expectedSig = await signHmac(secret, data)
  return timingSafeEqual(expectedSig, signatureHex)
}

/**
 * 產生管理員 Session Cookie 內容與 Set-Cookie Header 值
 * 格式：<到期時間>.<簽章>
 */
export async function createAdminSessionCookie(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const signature = await signHmac(secret, expiresAt.toString())
  const value = `${expiresAt}.${signature}`
  const maxAge = Math.floor(SESSION_TTL_MS / 1000)
  return `${ADMIN_COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`
}

/**
 * 產生清除管理員 Session 的 Set-Cookie Header 值
 */
export function clearAdminSessionCookie(): string {
  return `${ADMIN_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`
}

/**
 * 從 Cookie Header 中解析 admin_session 並驗證簽章與效期
 * 任何錯誤或過期皆回傳 false
 */
export async function verifyAdminSession(
  cookieHeader: string | null | undefined,
  secret: string | undefined
): Promise<boolean> {
  if (!cookieHeader || !secret) return false

  // 從 Cookie Header 解析出 admin_session 值
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.startsWith(`${ADMIN_COOKIE_NAME}=`))
  if (!sessionCookie) return false

  const rawValue = sessionCookie.slice(ADMIN_COOKIE_NAME.length + 1)
  const parts = rawValue.split('.')
  if (parts.length !== 2) return false

  const [expiresAtStr, signature] = parts
  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt)) return false

  // 檢查是否已過期
  if (Date.now() > expiresAt) return false

  // 驗證 HMAC 簽章
  return verifyHmac(secret, expiresAtStr, signature)
}
