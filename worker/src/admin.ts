import { Hono } from 'hono'
import type { Env, DishWithVotes } from './types'
import {
  verifyPassword,
  createAdminSessionCookie,
  clearAdminSessionCookie,
  verifyAdminSession
} from './auth'
import { generateToken, normalizeToken } from './token'
import { rateLimiter } from './rateLimit'

const adminApp = new Hono<{ Bindings: Env }>()

// 限流：POST /api/admin/login 每分鐘最多 10 次
const loginRateLimit = rateLimiter({ category: 'admin_login', limit: 10 })

/**
 * 管理員身分驗證中介層
 */
adminApp.use('/admin/*', async (c, next) => {
  // 排除登入路徑
  if (c.req.path === '/api/admin/login') {
    return next()
  }

  const cookieHeader = c.req.header('Cookie')
  const secret = c.env.SESSION_SECRET
  const isAuthorized = await verifyAdminSession(cookieHeader, secret)

  if (!isAuthorized) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401)
  }

  // 規格書第 8 章：所有會改資料的 POST、DELETE 請求要求 Content-Type: application/json
  if (['POST', 'DELETE', 'PATCH', 'PUT'].includes(c.req.method)) {
    const contentType = c.req.header('Content-Type') || ''
    // 若有 body 且非登出請求，檢查 Content-Type
    if (c.req.path !== '/api/admin/logout' && !contentType.includes('application/json')) {
      return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
    }
  }

  await next()
})

/**
 * POST /api/admin/login
 * 管理員登入
 */
adminApp.post('/admin/login', loginRateLimit, async (c) => {
  const adminPassword = c.env.ADMIN_PASSWORD
  const secret = c.env.SESSION_SECRET

  if (!adminPassword || !secret) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401)
  }

  let body: { password?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  const { password } = body
  if (typeof password !== 'string') {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401)
  }

  const isMatch = await verifyPassword(password, adminPassword)
  if (!isMatch) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401)
  }

  const sessionCookie = await createAdminSessionCookie(secret)
  c.header('Set-Cookie', sessionCookie)
  return c.json({ ok: true })
})

/**
 * POST /api/admin/logout
 * 管理員登出
 */
adminApp.post('/admin/logout', async (c) => {
  const clearCookie = clearAdminSessionCookie()
  c.header('Set-Cookie', clearCookie)
  return c.json({ ok: true })
})

/**
 * GET /api/admin/overview
 * 後台活動總覽資訊
 */
adminApp.get('/admin/overview', async (c) => {
  const db = c.env.DB
  const settings = await db.prepare(`
    SELECT title, status, show_results, voted_count, total_tokens 
    FROM settings WHERE id = 1
  `).first<{
    title: string
    status: 'preparing' | 'open' | 'closed'
    show_results: number
    voted_count: number
    total_tokens: number
  }>()

  return c.json({
    title: settings?.title ?? '聖誕廚藝競賽',
    status: settings?.status ?? 'preparing',
    showResults: settings?.show_results === 1,
    votedCount: settings?.voted_count ?? 0,
    totalTokens: settings?.total_tokens ?? 0
  })
})

/**
 * GET /api/admin/dishes
 * 菜色清單（含 voteCount），依 sort_order 排列
 */
adminApp.get('/admin/dishes', async (c) => {
  const db = c.env.DB
  const res = await db.prepare(
    'SELECT id, name, sort_order as sortOrder, vote_count as voteCount FROM dishes ORDER BY sort_order ASC'
  ).all<DishWithVotes>()

  return c.json({
    dishes: res.results ?? []
  })
})

/**
 * POST /api/admin/dishes
 * 新增或修改菜色 { id?, name, sortOrder }；僅 preparing 狀態可用
 */
adminApp.post('/admin/dishes', async (c) => {
  const db = c.env.DB
  let body: { id?: unknown; name?: unknown; sortOrder?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  const { id, name, sortOrder } = body
  if (typeof name !== 'string' || name.trim().length === 0 || typeof sortOrder !== 'number') {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  // 檢查是否處於 preparing 狀態
  const settings = await db.prepare('SELECT status FROM settings WHERE id = 1').first<{ status: string }>()
  if (settings?.status !== 'preparing') {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  if (typeof id === 'string' && id.trim().length > 0) {
    // 修改既有菜色
    const updateRes = await db.prepare(`
      UPDATE dishes SET name = ?1, sort_order = ?2
      WHERE id = ?3 AND (SELECT status FROM settings WHERE id = 1) = 'preparing'
    `).bind(name.trim(), sortOrder, id).run()

    if (updateRes.meta.changes === 0) {
      return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
    }

    return c.json({ ok: true, id })
  } else {
    // 新增菜色
    const newId = crypto.randomUUID()
    const insertRes = await db.prepare(`
      INSERT INTO dishes (id, name, sort_order, vote_count)
      SELECT ?1, ?2, ?3, 0
      WHERE (SELECT status FROM settings WHERE id = 1) = 'preparing'
    `).bind(newId, name.trim(), sortOrder).run()

    if (insertRes.meta.changes === 0) {
      return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
    }

    return c.json({ ok: true, id: newId })
  }
})

/**
 * DELETE /api/admin/dishes/:id
 * 刪除菜色；僅 preparing 狀態可用
 */
adminApp.delete('/admin/dishes/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const res = await db.prepare(`
    DELETE FROM dishes 
    WHERE id = ?1 AND (SELECT status FROM settings WHERE id = 1) = 'preparing'
  `).bind(id).run()

  if (res.meta.changes === 0) {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  return c.json({ ok: true })
})

/**
 * POST /api/admin/tokens/generate
 * 批次產生 token，單次上限 200，預設 90
 */
adminApp.post('/admin/tokens/generate', async (c) => {
  const db = c.env.DB
  let count = 90

  try {
    const body = await c.req.json() as { count?: unknown }
    if (typeof body.count === 'number' && body.count > 0 && body.count <= 200) {
      count = Math.floor(body.count)
    }
  } catch {
    // 若無 body 則使用預設 90
  }

  const now = Date.now()
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    attempts++
    try {
      const tokensSet = new Set<string>()
      while (tokensSet.size < count) {
        tokensSet.add(generateToken())
      }
      const tokenList = Array.from(tokensSet)

      // 在一個 batch 內寫入全部 token 並更新 total_tokens
      const statements = tokenList.map(t =>
        db.prepare('INSERT INTO tokens (token, status, created_at) VALUES (?1, "unused", ?2)').bind(t, now)
      )

      statements.push(
        db.prepare('UPDATE settings SET total_tokens = total_tokens + ?1 WHERE id = 1').bind(count)
      )

      await db.batch(statements)
      return c.json({ ok: true, count })
    } catch {
      // 撞號重試
      if (attempts >= maxAttempts) {
        return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
      }
    }
  }

  return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
})

/**
 * GET /api/admin/tokens
 * 取得全部 token 與狀態（供列表與列印）
 */
adminApp.get('/admin/tokens', async (c) => {
  const db = c.env.DB
  const res = await db.prepare(`
    SELECT token, status, created_at as createdAt, used_at as usedAt, 
           voided_at as voidedAt, replaced_by as replacedBy, owner_dish_id as ownerDishId
    FROM tokens
    ORDER BY created_at ASC
  `).all()

  return c.json({
    tokens: res.results ?? []
  })
})

/**
 * POST /api/admin/tokens/:token/void
 * 作廢未使用的 token
 */
adminApp.post('/admin/tokens/:token/void', async (c) => {
  const db = c.env.DB
  const rawToken = c.req.param('token')
  const token = normalizeToken(rawToken)

  if (!token) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }

  const existing = await db.prepare('SELECT status FROM tokens WHERE token = ?1').bind(token).first<{ status: string }>()
  if (!existing) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }
  if (existing.status === 'used') {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }
  if (existing.status === 'void') {
    return c.json({ ok: true })
  }

  const claimId = crypto.randomUUID()
  const now = Date.now()

  // 認領語句限 status = 'unused'，成功後 total_tokens - 1
  const results = await db.batch([
    db.prepare(`
      UPDATE tokens SET status = 'void', voided_at = ?1, claim_id = ?2
      WHERE token = ?3 AND status = 'unused'
    `).bind(now, claimId, token),
    db.prepare(`
      UPDATE settings SET total_tokens = total_tokens - 1
      WHERE id = 1 AND EXISTS (SELECT 1 FROM tokens WHERE token = ?1 AND claim_id = ?2)
    `).bind(token, claimId)
  ])

  if ((results[0]?.meta?.changes ?? 0) === 0) {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  return c.json({ ok: true })
})

/**
 * POST /api/admin/tokens/:token/reissue
 * 作廢舊 token 並重發新 token，記錄 replaced_by
 */
adminApp.post('/admin/tokens/:token/reissue', async (c) => {
  const db = c.env.DB
  const rawToken = c.req.param('token')
  const token = normalizeToken(rawToken)

  if (!token) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }

  const existing = await db.prepare('SELECT status FROM tokens WHERE token = ?1').bind(token).first<{ status: string }>()
  if (!existing) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }
  if (existing.status === 'used') {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  let attempts = 0
  const maxAttempts = 5
  const now = Date.now()
  const claimId = crypto.randomUUID()

  while (attempts < maxAttempts) {
    attempts++
    const newToken = generateToken()
    try {
      // 舊 token 認領為 void 並寫入 replaced_by，同一 batch 內新增新 token（total_tokens 不變）
      const results = await db.batch([
        db.prepare(`
          UPDATE tokens SET status = 'void', voided_at = ?1, replaced_by = ?2, claim_id = ?3
          WHERE token = ?4 AND status = 'unused'
        `).bind(now, newToken, claimId, token),
        db.prepare(`
          INSERT INTO tokens (token, status, created_at)
          SELECT ?1, 'unused', ?2
          WHERE EXISTS (SELECT 1 FROM tokens WHERE token = ?3 AND claim_id = ?4)
        `).bind(newToken, now, token, claimId)
      ])

      if ((results[0]?.meta?.changes ?? 0) === 0) {
        return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
      }

      return c.json({ ok: true, newToken })
    } catch {
      // 撞號重試
      if (attempts >= maxAttempts) {
        return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
      }
    }
  }

  return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
})

/**
 * POST /api/admin/tokens/:token/reset
 * 重置投票：刪除該票、菜色票數與 voted_count 回扣、token 改回 unused
 */
adminApp.post('/admin/tokens/:token/reset', async (c) => {
  const db = c.env.DB
  const rawToken = c.req.param('token')
  const token = normalizeToken(rawToken)

  if (!token) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }

  const existing = await db.prepare('SELECT status FROM tokens WHERE token = ?1').bind(token).first<{ status: string }>()
  if (!existing) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }
  if (existing.status !== 'used') {
    return c.json({ error: { code: 'TOKEN_NOT_USED' } }, 409)
  }

  const claimId = crypto.randomUUID()

  // 規格書第 7 章：
  // a. 認領 UPDATE tokens SET status='unused', used_at=NULL, claim_id=:claim WHERE token=:t AND status='used'
  // b. 依 vote_items 把三道菜 vote_count - 1
  // c. voted_count - 1
  // d. 刪除該 token 的 vote_items
  // e. 刪除 votes
  const results = await db.batch([
    db.prepare(`
      UPDATE tokens SET status = 'unused', used_at = NULL, claim_id = ?1
      WHERE token = ?2 AND status = 'used'
    `).bind(claimId, token),

    db.prepare(`
      UPDATE dishes SET vote_count = vote_count - 1
      WHERE id IN (SELECT dish_id FROM vote_items WHERE token = ?1)
        AND EXISTS (SELECT 1 FROM tokens WHERE token = ?1 AND claim_id = ?2)
    `).bind(token, claimId),

    db.prepare(`
      UPDATE settings SET voted_count = voted_count - 1
      WHERE id = 1 AND EXISTS (SELECT 1 FROM tokens WHERE token = ?1 AND claim_id = ?2)
    `).bind(token, claimId),

    db.prepare(`
      DELETE FROM vote_items 
      WHERE token = ?1 AND EXISTS (SELECT 1 FROM tokens WHERE token = ?1 AND claim_id = ?2)
    `).bind(token, claimId),

    db.prepare(`
      DELETE FROM votes 
      WHERE token = ?1 AND EXISTS (SELECT 1 FROM tokens WHERE token = ?1 AND claim_id = ?2)
    `).bind(token, claimId)
  ])

  if ((results[0]?.meta?.changes ?? 0) === 0) {
    return c.json({ error: { code: 'TOKEN_NOT_USED' } }, 409)
  }

  return c.json({ ok: true })
})

/**
 * POST /api/admin/status
 * 切換 preparing / open / closed
 * 防呆：已有人投票時不得退回 preparing；切到 open 前至少要有 3 道菜
 */
adminApp.post('/admin/status', async (c) => {
  const db = c.env.DB
  let body: { status?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  const targetStatus = body.status
  if (!['preparing', 'open', 'closed'].includes(targetStatus as string)) {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  const settings = await db.prepare('SELECT status, voted_count FROM settings WHERE id = 1').first<{
    status: string
    voted_count: number
  }>()

  // 1. 已有人投票時不得退回 preparing
  if (targetStatus === 'preparing' && (settings?.voted_count ?? 0) > 0) {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  // 2. 切到 open 前至少要有 3 道菜
  if (targetStatus === 'open') {
    const dishCountRes = await db.prepare('SELECT COUNT(*) as count FROM dishes').first<{ count: number }>()
    if ((dishCountRes?.count ?? 0) < 3) {
      return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
    }
  }

  await db.prepare('UPDATE settings SET status = ?1 WHERE id = 1').bind(targetStatus).run()
  return c.json({ ok: true, status: targetStatus })
})

/**
 * POST /api/admin/show-results
 * 揭曉結果開關 { show: boolean }
 */
adminApp.post('/admin/show-results', async (c) => {
  const db = c.env.DB
  let body: { show?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  if (typeof body.show !== 'boolean') {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  const showVal = body.show ? 1 : 0
  await db.prepare('UPDATE settings SET show_results = ?1 WHERE id = 1').bind(showVal).run()
  return c.json({ ok: true, showResults: body.show })
})

export default adminApp
