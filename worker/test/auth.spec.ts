import { describe, it, expect } from 'vitest'
import {
  verifyPassword,
  createAdminSessionCookie,
  verifyAdminSession,
  clearAdminSessionCookie,
  ADMIN_COOKIE_NAME,
  signHmac
} from '../src/auth'

describe('Auth & Session Security', () => {
  const secret = 'test-secret-at-least-32-chars-long-123456789'
  const adminPassword = 'super-secret-password-123'

  describe('Password Verification', () => {
    it('returns true for matching passwords', async () => {
      const ok = await verifyPassword(adminPassword, adminPassword)
      expect(ok).toBe(true)
    })

    it('returns false for wrong passwords', async () => {
      const ok = await verifyPassword('wrong-password', adminPassword)
      expect(ok).toBe(false)
    })

    it('returns false for empty passwords', async () => {
      expect(await verifyPassword('', adminPassword)).toBe(false)
      expect(await verifyPassword(adminPassword, '')).toBe(false)
    })
  })

  describe('Session Cookie', () => {
    it('creates a valid admin session cookie with HMAC and verifies it', async () => {
      const setCookie = await createAdminSessionCookie(secret)
      expect(setCookie).toContain(`${ADMIN_COOKIE_NAME}=`)
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('Secure')
      expect(setCookie).toContain('SameSite=Strict')

      const match = setCookie.match(new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`))
      expect(match).not.toBeNull()
      const cookieHeader = `${ADMIN_COOKIE_NAME}=${match![1]}`

      const isValid = await verifyAdminSession(cookieHeader, secret)
      expect(isValid).toBe(true)
    })

    it('rejects tampered signature', async () => {
      const setCookie = await createAdminSessionCookie(secret)
      const match = setCookie.match(new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`))
      const [expiresAt] = match![1].split('.')
      const tamperedCookie = `${ADMIN_COOKIE_NAME}=${expiresAt}.tampered_signature_123`

      const isValid = await verifyAdminSession(tamperedCookie, secret)
      expect(isValid).toBe(false)
    })

    it('rejects expired session', async () => {
      const pastTime = Date.now() - 1000 // 1 秒前已過期
      const sig = await signHmac(secret, pastTime.toString())
      const expiredCookie = `${ADMIN_COOKIE_NAME}=${pastTime}.${sig}`

      const isValid = await verifyAdminSession(expiredCookie, secret)
      expect(isValid).toBe(false)
    })

    it('returns false when cookie header is missing or secret is missing', async () => {
      expect(await verifyAdminSession(undefined, secret)).toBe(false)
      expect(await verifyAdminSession('', secret)).toBe(false)
      expect(await verifyAdminSession('foo=bar', secret)).toBe(false)
      expect(await verifyAdminSession(`${ADMIN_COOKIE_NAME}=123.abc`, undefined)).toBe(false)
    })

    it('produces valid clear cookie header', () => {
      const clearHeader = clearAdminSessionCookie()
      expect(clearHeader).toContain('Max-Age=0')
      expect(clearHeader).toContain(`${ADMIN_COOKIE_NAME}=;`)
    })
  })
})
