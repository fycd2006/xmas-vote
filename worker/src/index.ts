import { Hono } from 'hono'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// 所有 /api/* 回應加上 Cache-Control: no-store
app.use('/api/*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
})

app.get('/api/health', (c) => {
  return c.json({ ok: true, status: 'healthy' })
})

export default app
