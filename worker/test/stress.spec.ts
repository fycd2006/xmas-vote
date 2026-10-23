import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { setupTestDatabase } from './test-helper'
import { generateToken } from '../src/token'

describe('M6 Stress & Concurrency Test: 90 Tokens Voting', () => {
  beforeEach(async () => {
    await setupTestDatabase()

    // 建立 4 道參賽菜色
    await env.DB.batch([
      env.DB.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES ("dish-1", "香烤聖誕火雞", 1, 0)'),
      env.DB.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES ("dish-2", "經典威靈頓牛排", 2, 0)'),
      env.DB.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES ("dish-3", "龍蝦濃湯", 3, 0)'),
      env.DB.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES ("dish-4", "草莓聖誕蛋糕", 4, 0)'),
      env.DB.prepare('UPDATE settings SET status = "open", total_tokens = 90 WHERE id = 1'),
    ])
  })

  it('simulates 90 guest tokens voting concurrently, ending with exactly 270 total votes and voted_count = 90', async () => {
    const now = Date.now()
    const tokensSet = new Set<string>()
    while (tokensSet.size < 90) {
      tokensSet.add(generateToken())
    }
    const tokenList = Array.from(tokensSet)

    // 批次插入 90 個 unused tokens
    const insertStatements = tokenList.map(t =>
      env.DB.prepare('INSERT INTO tokens (token, status, created_at) VALUES (?1, "unused", ?2)').bind(t, now)
    )
    await env.DB.batch(insertStatements)

    // 定義可選菜色組合（從 4 道中選 3 道，共有 4 種組合）
    const dishCombos = [
      ['dish-1', 'dish-2', 'dish-3'],
      ['dish-1', 'dish-2', 'dish-4'],
      ['dish-1', 'dish-3', 'dish-4'],
      ['dish-2', 'dish-3', 'dish-4'],
    ]

    // 模擬 90 位來賓在短時間內並行送出投票
    // 分批以 Promise.all 併發（每批 15 筆併發，共 6 批快速發送）
    const batchSize = 15
    for (let i = 0; i < tokenList.length; i += batchSize) {
      const slice = tokenList.slice(i, i + batchSize)
      const promises = slice.map((token, index) => {
        const dishIds = dishCombos[(i + index) % dishCombos.length]
        return app.fetch(new Request('http://localhost/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, dishIds }),
        }), env)
      })

      const responses = await Promise.all(promises)
      for (const res of responses) {
        expect(res.status).toBe(200)
        const body = await res.json() as { ok: boolean }
        expect(body.ok).toBe(true)
      }
    }

    // 驗收檢查 1：settings.voted_count 必須恰好為 90
    const settings = await env.DB.prepare('SELECT voted_count, total_tokens FROM settings WHERE id = 1').first<{
      voted_count: number
      total_tokens: number
    }>()
    expect(settings?.voted_count).toBe(90)
    expect(settings?.total_tokens).toBe(90)

    // 驗收檢查 2：4 道菜色的票數總和必須恰好為 270 (90 × 3)
    const dishes = await env.DB.prepare('SELECT id, vote_count FROM dishes').all<{ id: string; vote_count: number }>()
    const totalVotes = (dishes.results ?? []).reduce((sum, d) => sum + d.vote_count, 0)
    expect(totalVotes).toBe(270)

    // 驗收檢查 3：90 個 token 的狀態必須全部為 'used'
    const usedTokenCount = await env.DB.prepare('SELECT COUNT(*) as count FROM tokens WHERE status = "used"').first<{ count: number }>()
    expect(usedTokenCount?.count).toBe(90)

    // 驗收檢查 4：votes 表與 vote_items 表的列數必須恰為 90 與 270
    const votesCount = await env.DB.prepare('SELECT COUNT(*) as count FROM votes').first<{ count: number }>()
    const voteItemsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM vote_items').first<{ count: number }>()
    expect(votesCount?.count).toBe(90)
    expect(voteItemsCount?.count).toBe(270)
  })
})
