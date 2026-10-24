import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { setupTestDatabase, seedTestData } from './test-helper'

describe('Vote & Ballot API', () => {
  beforeEach(async () => {
    await setupTestDatabase()
    await seedTestData()
  })

  describe('GET /api/ballot', () => {
    it('returns "invalid" for missing or invalid token', async () => {
      const res1 = await app.fetch(new Request('http://localhost/api/ballot'), env)
      const data1 = await res1.json() as { state: string }
      expect(data1.state).toBe('invalid')

      const res2 = await app.fetch(new Request('http://localhost/api/ballot?t=N0TEX1ST99'), env)
      const data2 = await res2.json() as { state: string }
      expect(data2.state).toBe('invalid')
    })

    it('returns "used" for already used token', async () => {
      const res = await app.fetch(new Request('http://localhost/api/ballot?t=T0KENB2222'), env)
      const data = await res.json() as { state: string }
      expect(data.state).toBe('used')
    })

    it('returns "void" for voided token', async () => {
      const res = await app.fetch(new Request('http://localhost/api/ballot?t=T0KENC3333'), env)
      const data = await res.json() as { state: string }
      expect(data.state).toBe('void')
    })

    it('returns "not_open" when settings.status is preparing', async () => {
      await env.DB.prepare('UPDATE settings SET status = "preparing" WHERE id = 1').run()
      const res = await app.fetch(new Request('http://localhost/api/ballot?t=T0KENA1111'), env)
      const data = await res.json() as { state: string }
      expect(data.state).toBe('not_open')
    })

    it('returns "closed" when settings.status is closed', async () => {
      await env.DB.prepare('UPDATE settings SET status = "closed" WHERE id = 1').run()
      const res = await app.fetch(new Request('http://localhost/api/ballot?t=T0KENA1111'), env)
      const data = await res.json() as { state: string }
      expect(data.state).toBe('closed')
    })

    it('returns "ready" with only id and name for valid unused token when open', async () => {
      // 測試連字號與 O 容錯輸入 (T0KEN -> TOKEN)
      const res = await app.fetch(new Request('http://localhost/api/ballot?t=TOKEN-A1111'), env)
      expect(res.status).toBe(200)
      const data = await res.json() as {
        state: string
        title: string
        dishes: Array<{ id: string; name: string; vote_count?: unknown; voteCount?: unknown }>
      }
      expect(data.state).toBe('ready')
      expect(data.title).toBe('聖誕趴廚藝競賽')
      expect(data.dishes).toHaveLength(4)

      // 嚴格檢查：來賓只看得到菜名，絕不包含票數欄位
      for (const dish of data.dishes) {
        expect(dish.id).toBeDefined()
        expect(dish.name).toBeDefined()
        expect(dish.vote_count).toBeUndefined()
        expect(dish.voteCount).toBeUndefined()
      }
    })
  })

  describe('POST /api/vote', () => {
    it('rejects if selection is less than 3 dishes', async () => {
      const res = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENA1111', dishIds: ['dish-1', 'dish-2'] })
      }), env)
      expect(res.status).toBe(400)
      const data = await res.json() as { error: { code: string } }
      expect(data.error.code).toBe('INVALID_SELECTION')
    })

    it('rejects if selection has duplicate dishes', async () => {
      const res = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENA1111', dishIds: ['dish-1', 'dish-2', 'dish-1'] })
      }), env)
      expect(res.status).toBe(400)
      const data = await res.json() as { error: { code: string } }
      expect(data.error.code).toBe('INVALID_SELECTION')
    })

    it('rejects if dishes do not exist in database', async () => {
      const res = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENA1111', dishIds: ['dish-1', 'dish-2', 'dish-999'] })
      }), env)
      expect(res.status).toBe(400)
      const data = await res.json() as { error: { code: string } }
      expect(data.error.code).toBe('INVALID_SELECTION')
    })

    it('rejects when voting is closed or preparing', async () => {
      await env.DB.prepare('UPDATE settings SET status = "closed" WHERE id = 1').run()
      const res = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENA1111', dishIds: ['dish-1', 'dish-2', 'dish-3'] })
      }), env)
      expect(res.status).toBe(409)
      const data = await res.json() as { error: { code: string } }
      expect(data.error.code).toBe('VOTING_NOT_OPEN')
    })

    it('rejects when token is void or already used', async () => {
      const resVoid = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENC3333', dishIds: ['dish-1', 'dish-2', 'dish-3'] })
      }), env)
      expect(resVoid.status).toBe(409)
      expect((await resVoid.json() as { error: { code: string } }).error.code).toBe('TOKEN_VOID')

      const resUsed = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENB2222', dishIds: ['dish-1', 'dish-2', 'dish-3'] })
      }), env)
      expect(resUsed.status).toBe(409)
      expect((await resUsed.json() as { error: { code: string } }).error.code).toBe('TOKEN_USED')
    })

    it('successfully votes, increments counts atomically, and rejects second attempt', async () => {
      // 第一次投票：成功（測試容錯大寫/小寫與連字號）
      const res1 = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'token-a1111', dishIds: ['dish-1', 'dish-2', 'dish-3'] })
      }), env)
      expect(res1.status).toBe(200)
      const data1 = await res1.json() as { ok: boolean }
      expect(data1.ok).toBe(true)

      // 檢查資料庫狀態
      const settings = await env.DB.prepare('SELECT voted_count FROM settings WHERE id = 1').first<{ voted_count: number }>()
      expect(settings?.voted_count).toBe(1)

      const d1 = await env.DB.prepare('SELECT vote_count FROM dishes WHERE id = "dish-1"').first<{ vote_count: number }>()
      const d2 = await env.DB.prepare('SELECT vote_count FROM dishes WHERE id = "dish-2"').first<{ vote_count: number }>()
      const d3 = await env.DB.prepare('SELECT vote_count FROM dishes WHERE id = "dish-3"').first<{ vote_count: number }>()
      const d4 = await env.DB.prepare('SELECT vote_count FROM dishes WHERE id = "dish-4"').first<{ vote_count: number }>()
      expect(d1?.vote_count).toBe(1)
      expect(d2?.vote_count).toBe(1)
      expect(d3?.vote_count).toBe(1)
      expect(d4?.vote_count).toBe(0) // 未選的菜票數為 0

      // 第二次以同一個 token 投票：回傳 TOKEN_USED，票數不增加
      const res2 = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENA1111', dishIds: ['dish-1', 'dish-2', 'dish-4'] })
      }), env)
      expect(res2.status).toBe(409)
      const data2 = await res2.json() as { error: { code: string } }
      expect(data2.error.code).toBe('TOKEN_USED')

      // 確認 voted_count 與票數仍維持 1
      const settingsAfter = await env.DB.prepare('SELECT voted_count FROM settings WHERE id = 1').first<{ voted_count: number }>()
      expect(settingsAfter?.voted_count).toBe(1)
      const d4After = await env.DB.prepare('SELECT vote_count FROM dishes WHERE id = "dish-4"').first<{ vote_count: number }>()
      expect(d4After?.vote_count).toBe(0)
    })

    it('race condition protection: Promise.all with the same token results in exactly one success', async () => {
      // 準備另一個全新 10 碼 token
      await env.DB.prepare('INSERT INTO tokens (token, status, created_at) VALUES ("T0KEND4444", "unused", ?1)')
        .bind(Date.now()).run()

      // 兩個請求用 Promise.all 同時發送
      const p1 = app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KEND4444', dishIds: ['dish-1', 'dish-2', 'dish-3'] })
      }), env)

      const p2 = app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KEND4444', dishIds: ['dish-2', 'dish-3', 'dish-4'] })
      }), env)

      const [resA, resB] = await Promise.all([p1, p2])
      const statuses = [resA.status, resB.status]

      // 恰好一個 200，一個 409
      expect(statuses).toContain(200)
      expect(statuses).toContain(409)

      // 檢查資料庫：voted_count 只能增加 1
      const settings = await env.DB.prepare('SELECT voted_count FROM settings WHERE id = 1').first<{ voted_count: number }>()
      expect(settings?.voted_count).toBe(1)
    })
  })
})
