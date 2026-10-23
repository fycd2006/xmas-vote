export interface Env {
  DB: D1Database
  ADMIN_PASSWORD?: string
  SESSION_SECRET?: string
}

export type BallotState = 'invalid' | 'used' | 'void' | 'not_open' | 'closed' | 'ready'

export interface DishPublic {
  id: string
  name: string
}

export interface DishWithVotes extends DishPublic {
  sortOrder: number
  voteCount: number
}

export interface DishResult extends DishPublic {
  voteCount: number
  rank: number
}
