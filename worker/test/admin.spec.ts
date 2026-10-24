import { env } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { setupTestDatabase, seedTestData } from './test-helper'
import { createAdminSessionCookie, ADMIN_COOKIE_NAME } from '../src/auth'

describe('Admin API & Protection', () => {
  const secret = 'super-secret-key-at-least-32-chars-long-1234'
  const adminPassword = 'admin-password-1234'
  let adminCookieHeader: string

  const testEnv = {
    ...env,
    ADMIN_PASSWORD: adminPassword,
    SESSION_SECRET: secret
  }

  beforeEach(async () => {
    await setupTestDatabase()
    await seedTestData()
    const setCookie = await createAdminSessionCookie(secret)
    adminCookieHeader = setCookie.split(';')[0]
  })

  describe('Authentication & Middleware', () => {
    it('rejects unauthorized access to /api/admin/* when no cookie is sent', async () => {
      const res = await app.fetch(new Request('http://localhost/api/admin/overview'), testEnv)
      expect(res.status).toBe(401)
      const data = await res.json() as { error: { code: string } }
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('rejects invalid or tampered cookie', async () => {
      const res = await app.fetch(new Request('http://localhost/api/admin/overview', {
        headers: { Cookie: `${ADMIN_COOKIE_NAME}=invalid.signature` }
      }), testEnv)
      expect(res.status).toBe(401)
    })

    it('successfully logs in with correct password and sets admin_session cookie', async () => {
      const res = await app.fetch(new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      }), testEnv)

      expect(res.status).toBe(200)
      const setCookie = res.headers.get('Set-Cookie')
      expect(setCookie).toContain(`${ADMIN_COOKIE_NAME}=`)
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('SameSite=Strict')
    })

    it('rejects login with wrong password', async () => {
      const res = await app.fetch(new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong-password' })
      }), testEnv)

      expect(res.status).toBe(401)
      const data = await res.json() as { error: { code: string } }
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('clears cookie on logout', async () => {
      const res = await app.fetch(new Request('http://localhost/api/admin/logout', {
        method: 'POST',
        headers: { Cookie: adminCookieHeader }
      }), testEnv)

      expect(res.status).toBe(200)
      const setCookie = res.headers.get('Set-Cookie')
      expect(setCookie).toContain('Max-Age=0')
    })
  })

  describe('Dishes Management', () => {
    it('allows adding and editing dishes only in preparing status', async () => {
      // 1. 在 open 狀態嘗試新增菜色：應拒絕
      const resBlocked = await app.fetch(new Request('http://localhost/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ name: '新菜色', sortOrder: 5 })
      }), testEnv)
      expect(resBlocked.status).toBe(400)

      // 2. 切換為 preparing 狀態
      await env.DB.prepare('UPDATE settings SET status = "preparing" WHERE id = 1').run()

      // 新增菜色（含組別）
      const resAdd = await app.fetch(new Request('http://localhost/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ name: '聖誕薑餅屋', groupName: '第 1 組', sortOrder: 5 })
      }), testEnv)
      expect(resAdd.status).toBe(200)
      const addData = await resAdd.json() as { ok: boolean; id: string }
      expect(addData.ok).toBe(true)
      expect(addData.id).toBeDefined()

      // 修改菜色名稱與組別
      const resEdit = await app.fetch(new Request('http://localhost/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ id: addData.id, name: '豪華聖誕薑餅屋', groupName: '第 1 組', sortOrder: 5 })
      }), testEnv)
      expect(resEdit.status).toBe(200)

      // 取得菜色清單，驗證包含 groupName 與加扣分欄位
      const resList = await app.fetch(new Request('http://localhost/api/admin/dishes', {
        headers: { Cookie: adminCookieHeader }
      }), testEnv)
      expect(resList.status).toBe(200)
      const listData = await resList.json() as {
        dishes: Array<{
          id: string
          name: string
          groupName: string
          scorePunctuality: number
          scoreCompleteness: number
          scoreCleanup: number
          extraScore: number
          totalScore: number
        }>
      }
      const added = listData.dishes.find(d => d.id === addData.id)
      expect(added?.groupName).toBe('第 1 組')
      expect(added?.extraScore).toBe(0)

      // 評分微調：準時度 +10，完成度 +10，收拾 -10
      const resScore = await app.fetch(new Request(`http://localhost/api/admin/dishes/${addData.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ scorePunctuality: 10, scoreCompleteness: 10, scoreCleanup: -10 })
      }), testEnv)
      expect(resScore.status).toBe(200)
      const scoreData = await resScore.json() as { extraScore: number }
      expect(scoreData.extraScore).toBe(10)

      // 組別批次評分
      const resGroupScore = await app.fetch(new Request('http://localhost/api/admin/groups/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ groupName: '第 1 組', scorePunctuality: 10, scoreCompleteness: 10, scoreCleanup: 10 })
      }), testEnv)
      expect(resGroupScore.status).toBe(200)
      const groupData = await resGroupScore.json() as { extraScore: number }
      expect(groupData.extraScore).toBe(30)

      // 刪除菜色
      const resDelete = await app.fetch(new Request(`http://localhost/api/admin/dishes/${addData.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader }
      }), testEnv)
      expect(resDelete.status).toBe(200)
    })
  })

  describe('Status Transition Safeguards', () => {
    it('prevents switching to open if there are fewer than 3 dishes', async () => {
      await env.DB.prepare('UPDATE settings SET status = "preparing" WHERE id = 1').run()
      // 清空菜色只留 2 道
      await env.DB.prepare('DELETE FROM dishes WHERE id IN ("dish-3", "dish-4")').run()

      const res = await app.fetch(new Request('http://localhost/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ status: 'open' })
      }), testEnv)

      expect(res.status).toBe(400)
      const data = await res.json() as { error: { code: string } }
      expect(data.error.code).toBe('BAD_REQUEST')
    })

    it('prevents resetting status back to preparing if someone has already voted', async () => {
      // 模擬已有人投票 (voted_count = 1)
      await env.DB.prepare('UPDATE settings SET voted_count = 1, status = "open" WHERE id = 1').run()

      const res = await app.fetch(new Request('http://localhost/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ status: 'preparing' })
      }), testEnv)

      expect(res.status).toBe(400)
      const data = await res.json() as { error: { code: string } }
      expect(data.error.code).toBe('BAD_REQUEST')
    })
  })

  describe('Token Operations (Generate, Void, Reissue, Reset)', () => {
    it('generates 90 tokens in a batch and increments total_tokens', async () => {
      const res = await app.fetch(new Request('http://localhost/api/admin/tokens/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ count: 90 })
      }), testEnv)

      expect(res.status).toBe(200)
      const data = await res.json() as { ok: boolean; count: number }
      expect(data.count).toBe(90)

      // 原本有 3 個，產生 90 個後 total_tokens 應為 93
      const settings = await env.DB.prepare('SELECT total_tokens FROM settings WHERE id = 1').first<{ total_tokens: number }>()
      expect(settings?.total_tokens).toBe(93)
    })

    it('voids an unused token and decrements total_tokens, but rejects voiding a used token', async () => {
      // 1. 作廢 unused token：成功
      const resVoid = await app.fetch(new Request('http://localhost/api/admin/tokens/T0KENA1111/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader }
      }), testEnv)
      expect(resVoid.status).toBe(200)

      const tokenRec = await env.DB.prepare('SELECT status, voided_at FROM tokens WHERE token = "T0KENA1111"').first<{ status: string; voided_at: number }>()
      expect(tokenRec?.status).toBe('void')
      expect(tokenRec?.voided_at).toBeGreaterThan(0)

      // total_tokens 應扣減 1 (3 - 1 = 2)
      const settings = await env.DB.prepare('SELECT total_tokens FROM settings WHERE id = 1').first<{ total_tokens: number }>()
      expect(settings?.total_tokens).toBe(2)

      // 2. 嘗試作廢 used token：拒絕
      const resUsed = await app.fetch(new Request('http://localhost/api/admin/tokens/T0KENB2222/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader }
      }), testEnv)
      expect(resUsed.status).toBe(400)
    })

    it('reissues token: marks old as void with replaced_by and creates new token', async () => {
      const res = await app.fetch(new Request('http://localhost/api/admin/tokens/T0KENA1111/reissue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader }
      }), testEnv)

      expect(res.status).toBe(200)
      const data = await res.json() as { ok: boolean; newToken: string }
      expect(data.newToken).toBeDefined()
      expect(data.newToken).toHaveLength(10)

      // 舊 token 變為 void 且記錄 replaced_by
      const oldRec = await env.DB.prepare('SELECT status, replaced_by FROM tokens WHERE token = "T0KENA1111"').first<{ status: string; replaced_by: string }>()
      expect(oldRec?.status).toBe('void')
      expect(oldRec?.replaced_by).toBe(data.newToken)

      // 新 token 存在且為 unused
      const newRec = await env.DB.prepare('SELECT status FROM tokens WHERE token = ?1').bind(data.newToken).first<{ status: string }>()
      expect(newRec?.status).toBe('unused')

      // total_tokens 保持不變
      const settings = await env.DB.prepare('SELECT total_tokens FROM settings WHERE id = 1').first<{ total_tokens: number }>()
      expect(settings?.total_tokens).toBe(3)
    })

    it('resets a voted token: rolls back vote counts and voted_count, resets token to unused', async () => {
      // 1. 先用 T0KENA1111 投一票
      await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENA1111', dishIds: ['dish-1', 'dish-2', 'dish-3'] })
      }), testEnv)

      // 確認 voted_count = 1, dish-1 票數 = 1
      const d1Before = await env.DB.prepare('SELECT vote_count FROM dishes WHERE id = "dish-1"').first<{ vote_count: number }>()
      expect(d1Before?.vote_count).toBe(1)
      const sBefore = await env.DB.prepare('SELECT voted_count FROM settings WHERE id = 1').first<{ voted_count: number }>()
      expect(sBefore?.voted_count).toBe(1)

      // 2. 執行重置投票
      const resReset = await app.fetch(new Request('http://localhost/api/admin/tokens/T0KENA1111/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader }
      }), testEnv)
      expect(resReset.status).toBe(200)

      // 3. 檢查資料庫：票數回扣為 0，voted_count 回扣為 0，token 狀態回為 unused
      const d1After = await env.DB.prepare('SELECT vote_count FROM dishes WHERE id = "dish-1"').first<{ vote_count: number }>()
      expect(d1After?.vote_count).toBe(0)
      const sAfter = await env.DB.prepare('SELECT voted_count FROM settings WHERE id = 1').first<{ voted_count: number }>()
      expect(sAfter?.voted_count).toBe(0)

      const tokenRec = await env.DB.prepare('SELECT status, used_at FROM tokens WHERE token = "T0KENA1111"').first<{ status: string; used_at: number | null }>()
      expect(tokenRec?.status).toBe('unused')
      expect(tokenRec?.used_at).toBeNull()

      // 4. 驗證該 token 可以重新投票！
      const resRevote = await app.fetch(new Request('http://localhost/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'T0KENA1111', dishIds: ['dish-1', 'dish-2', 'dish-4'] })
      }), testEnv)
      expect(resRevote.status).toBe(200)
    })
  })
})
