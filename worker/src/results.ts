import { Hono } from 'hono'
import type { Env, DishResult } from './types'
import { verifyAdminSession } from './auth'

const resultsApp = new Hono<{ Bindings: Env }>()

/**
 * 計算同票同名次的競賽排行（例如：1, 1, 3）
 */
export function calculateRankings(
  dishes: { id: string; name: string; vote_count: number }[]
): DishResult[] {
  const sorted = [...dishes].sort((a, b) => b.vote_count - a.vote_count)
  const results: DishResult[] = []

  let currentRank = 1
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (i > 0) {
      if (item.vote_count === sorted[i - 1].vote_count) {
        // 同票數維持同名次
      } else {
        // 不同票數名次為當前順序 (i + 1)
        currentRank = i + 1
      }
    }
    results.push({
      id: item.id,
      name: item.name,
      voteCount: item.vote_count,
      rank: currentRank
    })
  }

  return results
}

/**
 * GET /api/results
 * - 一般使用者：只有 status = 'closed' 且 show_results = 1 時回傳排行；否則回傳 { hidden: true, votedCount, totalTokens }
 * - 管理員（帶有效 Cookie）：任何時候都回傳完整結果
 */
resultsApp.get('/results', async (c) => {
  const db = c.env.DB
  const secret = c.env.SESSION_SECRET

  // 1. 取得設定（活動狀態、揭曉開關、已投票數、總票數）
  const settings = await db.prepare(`
    SELECT status, show_results, voted_count, total_tokens 
    FROM settings WHERE id = 1
  `).first<{
    status: 'preparing' | 'open' | 'closed'
    show_results: number
    voted_count: number
    total_tokens: number
  }>()

  const status = settings?.status ?? 'preparing'
  const showResults = settings?.show_results === 1
  const votedCount = settings?.voted_count ?? 0
  const totalTokens = settings?.total_tokens ?? 0

  // 2. 檢查是否具備有效管理員身份
  const cookieHeader = c.req.header('Cookie')
  const isAdmin = await verifyAdminSession(cookieHeader, secret)

  // 3. 一般使用者且未揭曉（非 closed 或 show_results != 1）
  const canShowResults = isAdmin || (status === 'closed' && showResults)

  if (!canShowResults) {
    return c.json({
      hidden: true,
      votedCount,
      totalTokens
    })
  }

  // 4. 取得全部菜色與票數並計算排名
  const dishes = await db.prepare(
    'SELECT id, name, vote_count FROM dishes ORDER BY vote_count DESC, sort_order ASC'
  ).all<{ id: string; name: string; vote_count: number }>()

  const rankings = calculateRankings(dishes.results ?? [])

  return c.json({
    hidden: false,
    results: rankings,
    votedCount,
    totalTokens
  })
})

export default resultsApp
