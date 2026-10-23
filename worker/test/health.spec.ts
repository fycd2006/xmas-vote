import { env } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Worker Health Check', () => {
  it('responds with healthy status and no-store header', async () => {
    const res = await app.fetch(new Request('http://localhost/api/health'), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const body = await res.json() as { ok: boolean; status: string }
    expect(body.ok).toBe(true)
    expect(body.status).toBe('healthy')
  })
})
