import { Hono } from 'hono'
import type { Env, DishResult, GroupResult } from './types'
import { verifyAdminSession } from './auth'

const resultsApp = new Hono<{ Bindings: Env }>()

/**
 * 計算同分同名次的競賽排行（依 totalScore DESC, voteCount DESC 排序）
 */
export function calculateRankings(
  dishes: {
    id: string
    name: string
    group_name?: string
    vote_count: number
    score_punctuality?: number
    score_completeness?: number
    score_cleanup?: number
    sort_order?: number
  }[]
): DishResult[] {
  const prepared = dishes.map(d => {
    const scorePunctuality = Number(d.score_punctuality ?? 0)
    const scoreCompleteness = Number(d.score_completeness ?? 0)
    const scoreCleanup = Number(d.score_cleanup ?? 0)
    const extraScore = scorePunctuality + scoreCompleteness + scoreCleanup
    const totalScore = d.vote_count + extraScore
    return {
      id: d.id,
      name: d.name,
      groupName: d.group_name || '',
      voteCount: d.vote_count,
      scorePunctuality,
      scoreCompleteness,
      scoreCleanup,
      extraScore,
      totalScore,
      sortOrder: d.sort_order ?? 0
    }
  })

  // 排序：總得分高者優先；若總分相同則票數高者優先；若仍相同依 sortOrder 排序
  const sorted = [...prepared].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore
    }
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount
    }
    return a.sortOrder - b.sortOrder
  })

  const results: DishResult[] = []
  let currentRank = 1

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (i > 0) {
      const prev = sorted[i - 1]
      if (item.totalScore === prev.totalScore && item.voteCount === prev.voteCount) {
        // 同總分且同票數維持同名次
      } else {
        currentRank = i + 1
      }
    }
    results.push({
      id: item.id,
      name: item.name,
      groupName: item.groupName,
      voteCount: item.voteCount,
      scorePunctuality: item.scorePunctuality,
      scoreCompleteness: item.scoreCompleteness,
      scoreCleanup: item.scoreCleanup,
      extraScore: item.extraScore,
      totalScore: item.totalScore,
      rank: currentRank
    })
  }

  return results
}

/**
 * 計算各組別之總分排行（總分 = 來賓票數總和 + 評審加扣分）
 */
export function calculateGroupRankings(
  dishes: {
    id: string
    name: string
    group_name?: string
    vote_count: number
    score_punctuality?: number
    score_completeness?: number
    score_cleanup?: number
    sort_order?: number
  }[]
): GroupResult[] {
  const groupMap = new Map<string, {
    groupName: string
    voteCount: number
    scorePunctuality: number
    scoreCompleteness: number
    scoreCleanup: number
    dishes: string[]
  }>()

  for (const d of dishes) {
    const gName = d.group_name?.trim() || '未分組'
    if (!groupMap.has(gName)) {
      groupMap.set(gName, {
        groupName: gName,
        voteCount: 0,
        scorePunctuality: Number(d.score_punctuality ?? 0),
        scoreCompleteness: Number(d.score_completeness ?? 0),
        scoreCleanup: Number(d.score_cleanup ?? 0),
        dishes: []
      })
    }
    const entry = groupMap.get(gName)!
    entry.voteCount += Number(d.vote_count ?? 0)
    entry.dishes.push(d.name)
  }

  const groupList = Array.from(groupMap.values()).map(g => {
    const extraScore = g.scorePunctuality + g.scoreCompleteness + g.scoreCleanup
    return {
      groupName: g.groupName,
      voteCount: g.voteCount,
      extraScore,
      totalScore: g.voteCount + extraScore,
      dishes: g.dishes
    }
  })

  // 排序：總得分 DESC, 總票數 DESC
  groupList.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore
    }
    return b.voteCount - a.voteCount
  })

  const results: GroupResult[] = []
  let currentRank = 1
  for (let i = 0; i < groupList.length; i++) {
    const item = groupList[i]
    if (i > 0) {
      const prev = groupList[i - 1]
      if (item.totalScore === prev.totalScore && item.voteCount === prev.voteCount) {
        // 同分同名次
      } else {
        currentRank = i + 1
      }
    }
    results.push({
      groupName: item.groupName,
      voteCount: item.voteCount,
      extraScore: item.extraScore,
      totalScore: item.totalScore,
      dishes: item.dishes,
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

  // 4. 取得全部菜色、加扣分與票數並計算排名
  const dishes = await db.prepare(
    'SELECT id, name, group_name, sort_order, vote_count, score_punctuality, score_completeness, score_cleanup FROM dishes ORDER BY sort_order ASC'
  ).all<{
    id: string
    name: string
    group_name: string
    sort_order: number
    vote_count: number
    score_punctuality: number
    score_completeness: number
    score_cleanup: number
  }>()

  const dishRankings = calculateRankings(dishes.results ?? [])
  const groupRankings = calculateGroupRankings(dishes.results ?? [])

  return c.json({
    hidden: false,
    results: dishRankings,
    groups: groupRankings,
    votedCount,
    totalTokens
  })
})

export default resultsApp
