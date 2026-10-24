export interface Env {
  DB: D1Database
  ADMIN_PASSWORD?: string
  SESSION_SECRET?: string
}

export type BallotState = 'invalid' | 'used' | 'void' | 'not_open' | 'closed' | 'ready'

export interface DishPublic {
  id: string
  name: string
  groupName?: string
}

export interface DishWithVotes extends DishPublic {
  groupName: string
  sortOrder: number
  voteCount: number
  scorePunctuality: number
  scoreCompleteness: number
  scoreCleanup: number
  extraScore: number
  totalScore: number
}

export interface DishResult extends DishPublic {
  groupName: string
  voteCount: number
  scorePunctuality: number
  scoreCompleteness: number
  scoreCleanup: number
  extraScore: number
  totalScore: number
  rank: number
}
