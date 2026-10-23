import { i18n } from '../i18n/zh-TW'

export interface BallotResponse {
  state: 'invalid' | 'used' | 'void' | 'not_open' | 'closed' | 'ready'
  title: string
  dishes?: Array<{ id: string; name: string }>
}

export interface ResultsResponse {
  hidden: boolean
  votedCount: number
  totalTokens: number
  results?: Array<{
    id: string
    name: string
    voteCount: number
    rank: number
  }>
}

export interface ApiError {
  code: string
  message: string
}

export class ApiException extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiException'
  }
}

/**
 * 取得錯誤碼對應的繁體中文說明
 */
export function getErrorMessage(code: string): string {
  const errMap = i18n.errors as Record<string, string>
  return errMap[code] || i18n.common.error
}

/**
 * API 請求基礎函式
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  if (!headers.has('Content-Type') && (options?.method === 'POST' || options?.method === 'DELETE')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let errorCode = 'UNKNOWN_ERROR'
    try {
      const errorJson = await res.json() as { error?: { code?: string } }
      if (errorJson?.error?.code) {
        errorCode = errorJson.error.code
      }
    } catch {
      // 非 JSON 格式錯誤
    }
    throw new ApiException(errorCode, getErrorMessage(errorCode))
  }

  return res.json() as Promise<T>
}

// ---------------- 公開 API ----------------

export const api = {
  getBallot: (token: string) => {
    const encoded = encodeURIComponent(token)
    return request<BallotResponse>(`/api/ballot?t=${encoded}`)
  },

  submitVote: (token: string, dishIds: string[]) => {
    return request<{ ok: boolean }>('/api/vote', {
      method: 'POST',
      body: JSON.stringify({ token, dishIds }),
    })
  },

  getResults: () => {
    return request<ResultsResponse>('/api/results')
  },

  // ---------------- 管理員 API ----------------

  adminLogin: (password: string) => {
    return request<{ ok: boolean }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  },

  adminLogout: () => {
    return request<{ ok: boolean }>('/api/admin/logout', {
      method: 'POST',
    })
  },

  getAdminOverview: () => {
    return request<{
      title: string
      status: 'preparing' | 'open' | 'closed'
      showResults: boolean
      votedCount: number
      totalTokens: number
    }>('/api/admin/overview')
  },

  getAdminDishes: () => {
    return request<{
      dishes: Array<{
        id: string
        name: string
        sortOrder: number
        voteCount: number
      }>
    }>('/api/admin/dishes')
  },

  saveAdminDish: (dish: { id?: string; name: string; sortOrder: number }) => {
    return request<{ ok: boolean; id: string }>('/api/admin/dishes', {
      method: 'POST',
      body: JSON.stringify(dish),
    })
  },

  deleteAdminDish: (id: string) => {
    return request<{ ok: boolean }>(`/api/admin/dishes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  getAdminTokens: () => {
    return request<{
      tokens: Array<{
        token: string
        status: 'unused' | 'used' | 'void'
        createdAt: number
        usedAt: number | null
        voidedAt: number | null
        replacedBy: string | null
        ownerDishId: string | null
      }>
    }>('/api/admin/tokens')
  },

  generateTokens: (count: number = 90) => {
    return request<{ ok: boolean; count: number }>('/api/admin/tokens/generate', {
      method: 'POST',
      body: JSON.stringify({ count }),
    })
  },

  voidToken: (token: string) => {
    return request<{ ok: boolean }>(`/api/admin/tokens/${encodeURIComponent(token)}/void`, {
      method: 'POST',
    })
  },

  reissueToken: (token: string) => {
    return request<{ ok: boolean; newToken: string }>(`/api/admin/tokens/${encodeURIComponent(token)}/reissue`, {
      method: 'POST',
    })
  },

  resetTokenVote: (token: string) => {
    return request<{ ok: boolean }>(`/api/admin/tokens/${encodeURIComponent(token)}/reset`, {
      method: 'POST',
    })
  },

  updateStatus: (status: 'preparing' | 'open' | 'closed') => {
    return request<{ ok: boolean; status: string }>('/api/admin/status', {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  },

  updateShowResults: (show: boolean) => {
    return request<{ ok: boolean; showResults: boolean }>('/api/admin/show-results', {
      method: 'POST',
      body: JSON.stringify({ show }),
    })
  },
}
