import { env } from 'cloudflare:test'

/**
 * 重設測試資料庫並套用 0001_init.sql
 */
export async function setupTestDatabase() {
  const db = env.DB

  // 清空所有表格（若存在）
  await db.batch([
    db.prepare('DROP TABLE IF EXISTS rate_limits'),
    db.prepare('DROP TABLE IF EXISTS vote_items'),
    db.prepare('DROP TABLE IF EXISTS votes'),
    db.prepare('DROP TABLE IF EXISTS tokens'),
    db.prepare('DROP TABLE IF EXISTS dishes'),
    db.prepare('DROP TABLE IF EXISTS settings'),
  ])

  // 重新建立 schema
  await db.batch([
    db.prepare(`
      CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        title TEXT NOT NULL DEFAULT '聖誕廚藝競賽',
        status TEXT NOT NULL DEFAULT 'preparing'
          CHECK (status IN ('preparing','open','closed')),
        show_results INTEGER NOT NULL DEFAULT 0,
        voted_count INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0
      );
    `),
    db.prepare('INSERT INTO settings (id) VALUES (1);'),
    db.prepare(`
      CREATE TABLE dishes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
        group_name TEXT NOT NULL DEFAULT '',
        score_punctuality INTEGER NOT NULL DEFAULT 0,
        score_completeness INTEGER NOT NULL DEFAULT 0,
        score_cleanup INTEGER NOT NULL DEFAULT 0
      );
    `),
    db.prepare(`
      CREATE TABLE tokens (
        token TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'unused'
          CHECK (status IN ('unused','used','void')),
        created_at INTEGER NOT NULL,
        used_at INTEGER,
        voided_at INTEGER,
        replaced_by TEXT,
        owner_dish_id TEXT,
        claim_id TEXT
      );
    `),
    db.prepare(`
      CREATE TABLE votes (
        token TEXT PRIMARY KEY REFERENCES tokens(token),
        created_at INTEGER NOT NULL
      );
    `),
    db.prepare(`
      CREATE TABLE vote_items (
        token TEXT NOT NULL REFERENCES votes(token),
        dish_id TEXT NOT NULL REFERENCES dishes(id),
        PRIMARY KEY (token, dish_id)
      );
    `),
    db.prepare(`
      CREATE TABLE rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL
      );
    `)
  ])
}

/**
 * 插入基礎測試菜色與 token（皆符合 10 碼 Crockford Base32: 無 I, L, O, U）
 */
export async function seedTestData() {
  const db = env.DB
  const now = Date.now()

  // 插入 4 道菜色
  await db.batch([
    db.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES (?1, ?2, ?3, 0)').bind('dish-1', '香烤聖誕火雞', 1),
    db.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES (?1, ?2, ?3, 0)').bind('dish-2', '經典威靈頓牛排', 2),
    db.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES (?1, ?2, ?3, 0)').bind('dish-3', '龍蝦濃湯', 3),
    db.prepare('INSERT INTO dishes (id, name, sort_order, vote_count) VALUES (?1, ?2, ?3, 0)').bind('dish-4', '草莓聖誕蛋糕', 4),
  ])

  // 插入 3 個 10 碼 token：一個 unused, 一個 used, 一個 void
  await db.batch([
    db.prepare('INSERT INTO tokens (token, status, created_at) VALUES (?1, ?2, ?3)').bind('T0KENA1111', 'unused', now),
    db.prepare('INSERT INTO tokens (token, status, created_at, used_at) VALUES (?1, ?2, ?3, ?4)').bind('T0KENB2222', 'used', now, now),
    db.prepare('INSERT INTO tokens (token, status, created_at, voided_at) VALUES (?1, ?2, ?3, ?4)').bind('T0KENC3333', 'void', now, now),
  ])

  // 更新 settings: status = 'open', total_tokens = 3
  await db.prepare('UPDATE settings SET status = ?1, total_tokens = ?2 WHERE id = 1').bind('open', 3).run()
}
