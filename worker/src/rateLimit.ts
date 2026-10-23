import type { Context, MiddlewareHandler } from 'hono'
import type { Env } from './types'

/**
 * 計算 IP 與 Secret 的 SHA-256 雜湊，取前 16 碼十六進位字元
 */
export async function getIpHash(ip: string, secret: string = 'default-secret'): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${secret}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 16)
}

export interface RateLimitOptions {
  category: 'ballot_or_vote' | 'admin_login'
  limit: number // 每分鐘上限次數
}

/**
 * 限流中介層
 * - GET /api/ballot & POST /api/vote: 300 次/分
 * - POST /api/admin/login: 10 次/分
 */
export function rateLimiter(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next) => {
    const db = c.env.DB
    if (!db) {
      // 測試環境如果沒有 DB 綁定，則略過
      return next()
    }

    const clientIp = c.req.header('CF-Connecting-IP') || '127.0.0.1'
    const secret = c.env.SESSION_SECRET || 'xmas-default-secret'
    const ipHash = await getIpHash(clientIp, secret)
    const currentMinute = Math.floor(Date.now() / 60000)
    const key = `${ipHash}:${currentMinute}:${options.category}`

    try {
      // 1. 使用 ON CONFLICT DO UPDATE RETURNING count 進行原子計數
      const res = await db.prepare(`
        INSERT INTO rate_limits (key, count) VALUES (?1, 1)
        ON CONFLICT(key) DO UPDATE SET count = count + 1
        RETURNING count;
      `).bind(key).first<{ count: number }>()

      const count = res?.count ?? 1

      // 2. 順手清理 5 分鐘前的舊記錄（非阻塞執行）
      c.executionCtx?.waitUntil?.(
        (async () => {
          try {
            const cutoffMinute = currentMinute - 5
            // 找出舊於 cutoff 的 row 並清理
            await db.prepare(`
              DELETE FROM rate_limits 
              WHERE CAST(SUBSTR(key, 18, INSTR(SUBSTR(key, 18), ':') - 1) AS INTEGER) < ?1
            `).bind(cutoffMinute).run()
          } catch {
            // 忽略背景清理錯誤
          }
        })()
      )

      if (count > options.limit) {
        return c.json({ error: { code: 'RATE_LIMITED' } }, 429)
      }
    } catch {
      // 若 D1 限流查詢發生暫時性異常，避免阻擋正常請求
    }

    await next()
  }
}
