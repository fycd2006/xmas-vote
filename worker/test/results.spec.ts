import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { setupTestDatabase } from './test-helper'
import { createAdminSessionCookie } from '../src/auth'
import { calculateRankings } from '../src/results'

describe('Results API & Ranking Algorithm', () => {
  beforeEach(async () => {
    await setupTestDatabase()

    // 建立 4 道菜色與不同票數
    // dish-1: 5 票
    // dish-2: 5 票
    // dish-3: 3 票
    // dish-4: 1 票
    await env.DB.batch([
      env.DB.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES (?1, ?2, ?3, ?4)')
        .bind('dish-1', '香烤聖誕火雞', 1, 5),
      env.DB.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES (?1, ?2, ?3, ?4)')
        .bind('dish-2', '經典威靈頓牛排', 2, 5),
      env.DB.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES (?1, ?2, ?3, ?4)')
        .bind('dish-3', '龍蝦濃湯', 3, 3),
      env.DB.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES (?1, ?2, ?3, ?4)')
        .bind('dish-4', '草莓聖誕蛋糕', 4, 1),
      env.DB.prepare('UPDATE settings SET status = "open", show_results = 0, voted_count = 14, total_tokens = 90 WHERE id = 1')
    ])
  })

  describe('calculateRankings unit tests', () => {
    it('correctly calculates competition ranking with ties (e.g. 1, 1, 3, 4)', () => {
      const input = [
        { id: '1', name: 'A', vote_count: 10 },
        { id: '2', name: 'B', vote_count: 10 },
        { id: '3', name: 'C', vote_count: 8 },
        { id: '4', name: 'D', vote_count: 5 },
      ]
      const ranked = calculateRankings(input)
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].rank).toBe(1)
      expect(ranked[2].rank).toBe(3) // 跳過 2，變成 3
      expect(ranked[3].rank).toBe(4)
    })

    it('ranks dishes by totalScore including extra points (punctuality, completeness, cleanup)', () => {
      const input = [
        // A 原本 5 票，額外 +20 (總分 25)
        { id: '1', name: 'A', group_name: '第 1 組', vote_count: 5, score_punctuality: 10, score_completeness: 10, score_cleanup: 0 },
        // B 原本 10 票，額外 -10 (總分 0)
        { id: '2', name: 'B', group_name: '第 2 組', vote_count: 10, score_punctuality: -10, score_completeness: 0, score_cleanup: 0 },
        // C 原本 15 票，無額外分數 (總分 15)
        { id: '3', name: 'C', group_name: '第 3 組', vote_count: 15, score_punctuality: 0, score_completeness: 0, score_cleanup: 0 },
      ]
      const ranked = calculateRankings(input)
      expect(ranked[0].id).toBe('1') // 25 分
      expect(ranked[0].rank).toBe(1)
      expect(ranked[0].totalScore).toBe(25)
      expect(ranked[0].groupName).toBe('第 1 組')

      expect(ranked[1].id).toBe('3') // 15 分
      expect(ranked[1].rank).toBe(2)
      expect(ranked[1].totalScore).toBe(15)

      expect(ranked[2].id).toBe('2') // 0 分
      expect(ranked[2].rank).toBe(3)
      expect(ranked[2].totalScore).toBe(0)
    })
  })

  describe('GET /api/results access control', () => {
    it('returns hidden result for public user when status is open', async () => {
      const res = await app.fetch(new Request('http://localhost/api/results'), env)
      expect(res.status).toBe(200)
      const data = await res.json() as {
        hidden: boolean
        votedCount: number
        totalTokens: number
        results?: unknown
      }
      expect(data.hidden).toBe(true)
      expect(data.votedCount).toBe(14)
      expect(data.totalTokens).toBe(90)
      expect(data.results).toBeUndefined() // 絕不洩漏票數或名次
    })

    it('returns hidden result for public user when status is closed but show_results is 0', async () => {
      await env.DB.prepare('UPDATE settings SET status = "closed", show_results = 0 WHERE id = 1').run()
      const res = await app.fetch(new Request('http://localhost/api/results'), env)
      const data = await res.json() as { hidden: boolean; results?: unknown }
      expect(data.hidden).toBe(true)
      expect(data.results).toBeUndefined()
    })

    it('returns full rankings for public user when status is closed AND show_results is 1', async () => {
      await env.DB.prepare('UPDATE settings SET status = "closed", show_results = 1 WHERE id = 1').run()
      const res = await app.fetch(new Request('http://localhost/api/results'), env)
      expect(res.status).toBe(200)
      const data = await res.json() as {
        hidden: boolean
        votedCount: number
        totalTokens: number
        results: Array<{ id: string; name: string; voteCount: number; rank: number }>
      }
      expect(data.hidden).toBe(false)
      expect(data.results).toHaveLength(4)
      // 名次：dish-1 (5票, 1名), dish-2 (5票, 1名), dish-3 (3票, 3名), dish-4 (1票, 4名)
      expect(data.results[0].voteCount).toBe(5)
      expect(data.results[0].rank).toBe(1)
      expect(data.results[1].voteCount).toBe(5)
      expect(data.results[1].rank).toBe(1)
      expect(data.results[2].voteCount).toBe(3)
      expect(data.results[2].rank).toBe(3)
      expect(data.results[3].voteCount).toBe(1)
      expect(data.results[3].rank).toBe(4)
    })

    it('allows admin with valid session cookie to preview results at any time', async () => {
      // 保持 open 且 show_results = 0
      const secret = 'test-secret-at-least-32-chars-long-123456789'
      const setCookie = await createAdminSessionCookie(secret)
      const cookieHeader = setCookie.split(';')[0]

      const testEnv = {
        ...env,
        SESSION_SECRET: secret
      }

      const res = await app.fetch(new Request('http://localhost/api/results', {
        headers: { Cookie: cookieHeader }
      }), testEnv)

      expect(res.status).toBe(200)
      const data = await res.json() as {
        hidden: boolean
        results: Array<{ id: string; name: string; voteCount: number; rank: number }>
      }
      expect(data.hidden).toBe(false)
      expect(data.results).toBeDefined()
      expect(data.results).toHaveLength(4)
    })
  })
})
