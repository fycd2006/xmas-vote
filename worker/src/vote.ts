import { Hono } from 'hono'
import type { Env, DishPublic, BallotState } from './types'
import { normalizeToken } from './token'
import { rateLimiter } from './rateLimit'

const voteApp = new Hono<{ Bindings: Env }>()

// 限流：同一 IP 每分鐘最多 300 次
const ballotAndVoteRateLimit = rateLimiter({ category: 'ballot_or_vote', limit: 300 })

/**
 * GET /api/ballot?t=TOKEN
 * 回傳卡片狀態與可投菜色清單（僅 ready 狀態且只包含 id 與 name）
 */
voteApp.get('/ballot', ballotAndVoteRateLimit, async (c) => {
  const db = c.env.DB
  const rawToken = c.req.query('t')

  // 1. 取得設定（活動標題與狀態）
  const settings = await db.prepare(
    'SELECT title, status FROM settings WHERE id = 1'
  ).first<{ title: string; status: 'preparing' | 'open' | 'closed' }>()

  const title = settings?.title ?? '聖誕趴廚藝競賽'
  const activityStatus = settings?.status ?? 'preparing'

  // 2. 驗證並正規化 Token
  const token = normalizeToken(rawToken)
  if (!token) {
    return c.json<{ state: BallotState; title: string }>({
      state: 'invalid',
      title
    })
  }

  // 若活動處於準備中狀態
  if (activityStatus === 'preparing') {
    return c.json<{ state: BallotState; title: string }>({
      state: 'not_open',
      title
    })
  }

  // 3. 讀取 Token 狀態
  const tokenRecord = await db.prepare(
    'SELECT status FROM tokens WHERE token = ?1'
  ).bind(token).first<{ status: 'unused' | 'used' | 'void' }>()

  if (!tokenRecord) {
    return c.json<{ state: BallotState; title: string }>({
      state: 'invalid',
      title
    })
  }

  if (tokenRecord.status === 'used') {
    return c.json<{ state: BallotState; title: string }>({
      state: 'used',
      title
    })
  }

  if (tokenRecord.status === 'void') {
    return c.json<{ state: BallotState; title: string }>({
      state: 'void',
      title
    })
  }

  // 若活動已關閉
  if (activityStatus === 'closed') {
    return c.json<{ state: BallotState; title: string }>({
      state: 'closed',
      title
    })
  }

  // 4. 活動開放中且 Token 尚未被使用 -> ready，回傳菜色清單（依 sort_order 排列，只有 id 與 name）
  const dishes = await db.prepare(
    'SELECT id, name FROM dishes ORDER BY sort_order ASC'
  ).all<DishPublic>()

  return c.json<{ state: BallotState; title: string; dishes: DishPublic[] }>({
    state: 'ready',
    title,
    dishes: dishes.results ?? []
  })
})

/**
 * POST /api/vote
 * 投票送出（原子 Claim 模式）
 */
voteApp.post('/vote', ballotAndVoteRateLimit, async (c) => {
  const db = c.env.DB

  // 1. 檢查 Content-Type
  const contentType = c.req.header('Content-Type') || ''
  if (!contentType.includes('application/json')) {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  let body: { token?: unknown; dishIds?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: { code: 'BAD_REQUEST' } }, 400)
  }

  const { token: rawToken, dishIds } = body

  // 2. 驗證 dishIds 規格：長度恰為 3，元素互不相同
  if (
    !Array.isArray(dishIds) ||
    dishIds.length !== 3 ||
    !dishIds.every(id => typeof id === 'string' && id.trim().length > 0) ||
    new Set(dishIds).size !== 3
  ) {
    return c.json({ error: { code: 'INVALID_SELECTION' } }, 400)
  }

  // 3. 驗證 Token 格式
  const token = normalizeToken(rawToken)
  if (!token) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }

  // 4. 投票前預檢（友好錯誤碼回傳）
  const settings = await db.prepare(
    'SELECT status FROM settings WHERE id = 1'
  ).first<{ status: string }>()

  if (settings?.status !== 'open') {
    return c.json({ error: { code: 'VOTING_NOT_OPEN' } }, 409)
  }

  const tokenRecord = await db.prepare(
    'SELECT status, owner_dish_id FROM tokens WHERE token = ?1'
  ).bind(token).first<{ status: string; owner_dish_id?: string | null }>()

  if (!tokenRecord) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }

  if (tokenRecord.status === 'used') {
    return c.json({ error: { code: 'TOKEN_USED' } }, 409)
  }

  if (tokenRecord.status === 'void') {
    return c.json({ error: { code: 'TOKEN_VOID' } }, 409)
  }

  // 若有 owner_dish_id 且在選擇名單中（預留擴充）
  if (tokenRecord.owner_dish_id && dishIds.includes(tokenRecord.owner_dish_id)) {
    return c.json({ error: { code: 'INVALID_SELECTION' } }, 400)
  }

  // 驗證 3 道菜是否存在於資料庫
  const [d1, d2, d3] = dishIds as [string, string, string]
  const dishCountRes = await db.prepare(
    'SELECT COUNT(*) as count FROM dishes WHERE id IN (?1, ?2, ?3)'
  ).bind(d1, d2, d3).first<{ count: number }>()

  if ((dishCountRes?.count ?? 0) !== 3) {
    return c.json({ error: { code: 'INVALID_SELECTION' } }, 400)
  }

  // 5. 原子批次寫入（Claim 模式）
  const claimId = crypto.randomUUID()
  const now = Date.now()

  const batchResults = await db.batch([
    // a. 認領 token：必須仍是 unused、投票開放中、三道菜都存在
    db.prepare(`
      UPDATE tokens SET status = 'used', used_at = ?1, claim_id = ?2
      WHERE token = ?3 AND status = 'unused'
        AND (SELECT status FROM settings WHERE id = 1) = 'open'
        AND (SELECT COUNT(*) FROM dishes WHERE id IN (?4, ?5, ?6)) = 3;
    `).bind(now, claimId, token, d1, d2, d3),

    // b. 寫入投票紀錄（只有認領成功才會寫）
    db.prepare(`
      INSERT INTO votes (token, created_at)
      SELECT ?1, ?2
      WHERE EXISTS (SELECT 1 FROM tokens WHERE token = ?1 AND claim_id = ?3);
    `).bind(token, now, claimId),

    // c. 寫入三道菜的選擇
    db.prepare(`
      INSERT INTO vote_items (token, dish_id)
      SELECT ?1, id FROM dishes WHERE id IN (?2, ?3, ?4)
        AND EXISTS (SELECT 1 FROM tokens WHERE token = ?1 AND claim_id = ?5);
    `).bind(token, d1, d2, d3, claimId),

    // d. 三道菜票數 +1
    db.prepare(`
      UPDATE dishes SET vote_count = vote_count + 1
      WHERE id IN (?1, ?2, ?3)
        AND EXISTS (SELECT 1 FROM tokens WHERE token = ?4 AND claim_id = ?5);
    `).bind(d1, d2, d3, token, claimId),

    // e. 已投票人數 +1
    db.prepare(`
      UPDATE settings SET voted_count = voted_count + 1
      WHERE id = 1
        AND EXISTS (SELECT 1 FROM tokens WHERE token = ?1 AND claim_id = ?2);
    `).bind(token, claimId)
  ])

  // 檢查語句 a 的影響列數
  const claimChanges = batchResults[0]?.meta?.changes ?? 0

  if (claimChanges === 1) {
    return c.json({ ok: true })
  }

  // 若認領失敗（可能並發競爭已被別人搶先搶下），重新查詢最新狀態給予對應的友善錯誤碼
  const recheckSettings = await db.prepare(
    'SELECT status FROM settings WHERE id = 1'
  ).first<{ status: string }>()

  if (recheckSettings?.status !== 'open') {
    return c.json({ error: { code: 'VOTING_NOT_OPEN' } }, 409)
  }

  const recheckToken = await db.prepare(
    'SELECT status FROM tokens WHERE token = ?1'
  ).bind(token).first<{ status: string }>()

  if (!recheckToken) {
    return c.json({ error: { code: 'TOKEN_NOT_FOUND' } }, 404)
  }
  if (recheckToken.status === 'used') {
    return c.json({ error: { code: 'TOKEN_USED' } }, 409)
  }
  if (recheckToken.status === 'void') {
    return c.json({ error: { code: 'TOKEN_VOID' } }, 409)
  }

  return c.json({ error: { code: 'INVALID_SELECTION' } }, 400)
})

export default voteApp
