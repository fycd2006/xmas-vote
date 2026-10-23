import { describe, it, expect } from 'vitest'
import { generateToken, formatToken, normalizeToken, CROCKFORD_BASE32 } from '../src/token'

describe('Token Utility', () => {
  it('generates 10-char Crockford Base32 token using crypto.getRandomValues', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const token = generateToken()
      expect(token).toHaveLength(10)
      for (const char of token) {
        expect(CROCKFORD_BASE32).toContain(char)
      }
      tokens.add(token)
    }
    // 100 個隨機 token 應該完全不重複
    expect(tokens.size).toBe(100)
  })

  it('formats token into 5-5 grouped string', () => {
    expect(formatToken('K7M2X9QF4T')).toBe('K7M2X-9QF4T')
    expect(formatToken('k7m2x9qf4t')).toBe('K7M2X-9QF4T')
  })

  it('normalizes tokens with hyphens, spaces, and case-insensitivity', () => {
    expect(normalizeToken('k7m2x-9qf4t')).toBe('K7M2X9QF4T')
    expect(normalizeToken(' K7M2X - 9QF4T ')).toBe('K7M2X9QF4T')
    expect(normalizeToken('K7M2X9QF4T')).toBe('K7M2X9QF4T')
  })

  it('correctly maps confusing characters (O->0, I->1, L->1)', () => {
    // O 轉成 0, I/L 轉成 1
    expect(normalizeToken('KOIXL-9QO4T')).toBe('K01X19Q04T')
    expect(normalizeToken('koixl-9qo4t')).toBe('K01X19Q04T')
  })

  it('rejects invalid tokens', () => {
    expect(normalizeToken('')).toBeNull()
    expect(normalizeToken('12345')).toBeNull() // 太短
    expect(normalizeToken('1234567890123')).toBeNull() // 太長
    expect(normalizeToken('K7M2X-9QF4U')).toBeNull() // U 不在 Crockford Base32 中
    expect(normalizeToken(null)).toBeNull()
    expect(normalizeToken(12345)).toBeNull()
  })
})
