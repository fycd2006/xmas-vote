import { useEffect, useState, useMemo } from 'react'
import { Plus, Search, RotateCcw, Ban, RefreshCw, AlertCircle, CheckCircle, Clock, Copy, Check } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import { api, ApiException } from '../../lib/api'
import { i18n } from '../../i18n/zh-TW'

interface TokenItem {
  token: string
  status: 'unused' | 'used' | 'void'
  createdAt: number
  usedAt: number | null
  voidedAt: number | null
  replacedBy: string | null
  ownerDishId: string | null
}

function formatShortCode(token: string): string {
  if (token.length === 10) {
    return `${token.slice(0, 5)}-${token.slice(5, 10)}`
  }
  return token
}

export default function AdminTokensPage() {
  const [loading, setLoading] = useState(true)
  const [tokens, setTokens] = useState<TokenItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used' | 'void'>('all')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // 彈跳確認視窗狀態
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false)
  const [actionConfirm, setActionConfirm] = useState<{
    type: 'void' | 'reissue' | 'reset'
    token: string
  } | null>(null)
  const [operating, setOperating] = useState(false)

  const fetchTokens = async () => {
    try {
      const data = await api.getAdminTokens()
      setTokens(data.tokens)
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [])

  // 產生 90 張卡片
  const handleGenerate90 = async () => {
    setOperating(true)
    setErrorMessage(null)
    try {
      await api.generateTokens(90)
      setGenerateConfirmOpen(false)
      setSuccessMessage('成功批次產生 90 張全新投票卡片！')
      await fetchTokens()
    } catch (err) {
      if (err instanceof ApiException) setErrorMessage(err.message)
    } finally {
      setOperating(false)
    }
  }

  // 作廢 / 重發 / 重置投票 操作
  const handleExecuteAction = async () => {
    if (!actionConfirm) return
    setOperating(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      if (actionConfirm.type === 'void') {
        await api.voidToken(actionConfirm.token)
        setSuccessMessage(`已成功作廢卡片代碼 ${formatShortCode(actionConfirm.token)}`)
      } else if (actionConfirm.type === 'reissue') {
        const res = await api.reissueToken(actionConfirm.token)
        setSuccessMessage(`已成功作廢舊卡並補發新卡碼：${formatShortCode(res.newToken)}`)
      } else if (actionConfirm.type === 'reset') {
        await api.resetTokenVote(actionConfirm.token)
        setSuccessMessage(`已成功重置投票！該卡片 (${formatShortCode(actionConfirm.token)}) 現已可重新投票。`)
      }
      setActionConfirm(null)
      await fetchTokens()
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage(i18n.common.error)
      }
    } finally {
      setOperating(false)
    }
  }

  // 一鍵複製卡片投票連結
  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/vote?t=${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 1800)
  }

  // 篩選與搜尋過濾
  const filteredTokens = useMemo(() => {
    const q = searchQuery.trim().toUpperCase().replace(/[-\s]/g, '')
    return tokens.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false
      if (q && !t.token.includes(q)) return false
      return true
    })
  }, [tokens, filterStatus, searchQuery])

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#349282]">✦</span>
              <h1 className="text-xl font-serif_jp font-medium text-[#2E7C94] tracking-wide">
                {i18n.admin.tokensTitle}
              </h1>
            </div>
            <p className="text-xs font-serif_jp text-[#8A9499]">
              全場票卡金鑰管理（目前共 {tokens.length} 張卡片）
            </p>
          </div>

          <button
            onClick={() => {
              if (tokens.length > 0) {
                setGenerateConfirmOpen(true)
              } else {
                handleGenerate90()
              }
            }}
            disabled={operating}
            className="inline-flex items-center gap-1.5 px-4 py-2 btn-primary text-xs font-serif_jp font-medium shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-[#ECE2A6]" />
            <span>{i18n.admin.generateTokens}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp flex items-center gap-2" style={{ borderRadius: '2px' }}>
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-[#EDF8F4] border border-[rgba(79,174,200,0.4)] text-[#349282] text-xs font-serif_jp flex items-center gap-2" style={{ borderRadius: '2px' }}>
            <CheckCircle className="w-4 h-4 shrink-0 text-[#349282]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 搜尋與狀態篩選工具列 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[rgba(79,174,200,0.25)] p-3 shadow-soft" style={{ borderRadius: '2px' }}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋短碼或 Token..."
              className="w-full pl-9 pr-3 py-2 bg-[#F9FBFA] border border-[rgba(79,174,200,0.25)] focus:border-[#4FAEC8] text-xs text-[#3E4347] placeholder:text-slate-400 outline-none uppercase font-mono"
              style={{ borderRadius: '2px' }}
            />
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'unused', 'used', 'void'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 text-xs font-serif_jp transition-all ${
                  filterStatus === st
                    ? 'bg-[#EDF8F4] text-[#2E7C94] border border-[rgba(79,174,200,0.4)] font-medium shadow-sm'
                    : 'text-[#8A9499] hover:text-[#2E7C94]'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {st === 'all' ? '全部' : st === 'unused' ? '未使用' : st === 'used' ? '已使用' : '已作廢'}
              </button>
            ))}
          </div>
        </div>

        {/* Token 列表清單 */}
        <div className="bg-white border border-[rgba(79,174,200,0.25)] shadow-soft" style={{ borderRadius: '2px' }}>
          {loading ? (
            <div className="p-12 text-center text-[#349282] text-sm animate-pulse font-serif_jp">
              {i18n.common.loading}
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="p-8 text-center text-[#8A9499] font-serif_jp text-sm">
              查無符合條件的卡片代碼。
            </div>
          ) : (
            <div className="divide-y divide-[rgba(79,174,200,0.15)]">
              {filteredTokens.map(item => {
                const isUnused = item.status === 'unused'
                const isUsed = item.status === 'used'

                return (
                  <div key={item.token} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F9FBFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-[#2E7C94] tracking-widest bg-[#F9FBFA] px-2.5 py-1 border border-[rgba(79,174,200,0.25)]" style={{ borderRadius: '2px' }}>
                        {formatShortCode(item.token)}
                      </span>

                      {/* 狀態標籤 */}
                      <span className={`px-2 py-0.5 text-[11px] font-serif_jp border ${
                        item.status === 'unused'
                          ? 'bg-[#EDF8F4] text-[#349282] border-[rgba(79,174,200,0.4)]'
                          : item.status === 'used'
                          ? 'bg-[#E8F5F8] text-[#2E7C94] border-[rgba(79,174,200,0.4)]'
                          : 'bg-slate-100 text-[#8A9499] border-slate-200 line-through'
                      }`} style={{ borderRadius: '2px' }}>
                        {item.status === 'unused' ? '未使用' : item.status === 'used' ? '已投票' : '已作廢'}
                      </span>

                      {item.replacedBy && (
                        <span className="text-[11px] text-[#8A9499] font-mono">
                          → 重發為: {formatShortCode(item.replacedBy)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {/* 時間資訊 */}
                      <div className="text-[11px] text-[#8A9499] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#92C5B7]" />
                        <span>
                          {item.usedAt
                            ? `使用: ${new Date(item.usedAt).toLocaleTimeString()}`
                            : item.voidedAt
                            ? `作廢: ${new Date(item.voidedAt).toLocaleTimeString()}`
                            : `建於: ${new Date(item.createdAt).toLocaleDateString()}`}
                        </span>
                      </div>

                      {/* 操作按鈕群（含一鍵複製卡片專屬連結） */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnused && (
                          <button
                            onClick={() => handleCopyLink(item.token)}
                            className="px-2 py-1 bg-white hover:bg-[#F9FBFA] text-[#2E7C94] border border-[rgba(79,174,200,0.25)] text-xs font-serif_jp flex items-center gap-1 transition-all"
                            style={{ borderRadius: '2px' }}
                            title="複製此卡專屬投票連結"
                          >
                            {copiedToken === item.token ? <Check className="w-3 h-3 text-[#349282]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedToken === item.token ? '已複製' : '連結'}</span>
                          </button>
                        )}

                        {isUnused && (
                          <>
                            <button
                              onClick={() => setActionConfirm({ type: 'reissue', token: item.token })}
                              className="px-2.5 py-1 bg-[#EDF8F4] hover:bg-[#E8F5F8] text-[#2E7C94] border border-[rgba(79,174,200,0.3)] text-xs font-serif_jp font-medium flex items-center gap-1 transition-all"
                              style={{ borderRadius: '2px' }}
                              title="作廢舊卡並發行新短碼"
                            >
                              <RefreshCw className="w-3 h-3 text-[#349282]" />
                              <span>補發</span>
                            </button>

                            <button
                              onClick={() => setActionConfirm({ type: 'void', token: item.token })}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 text-[#8A9499] hover:text-red-600 text-xs font-serif_jp font-medium flex items-center gap-1 transition-all"
                              style={{ borderRadius: '2px' }}
                              title="直接作廢此卡"
                            >
                              <Ban className="w-3 h-3" />
                              <span>作廢</span>
                            </button>
                          </>
                        )}

                        {isUsed && (
                          <button
                            onClick={() => setActionConfirm({ type: 'reset', token: item.token })}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-serif_jp font-medium flex items-center gap-1 transition-all"
                            style={{ borderRadius: '2px' }}
                            title="清除該卡投票紀錄，允許重新投票"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>重置投票</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 產生 90 張追加確認 Modal */}
      {generateConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/45 backdrop-blur-sm animate-reveal">
          <div className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.4)] p-6 shadow-prism space-y-4" style={{ borderRadius: '2px' }}>
            <h3 className="text-base font-serif_jp font-medium text-[#2E7C94] text-center">確認追加產生 90 張票卡？</h3>
            <p className="text-xs font-serif_jp text-[#8A9499] text-center leading-relaxed">
              系統目前已有 <span className="font-mono text-[#349282] font-bold">{tokens.length}</span> 張卡片。按下確認後將會「追加」90 張全新未使用的卡片。
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setGenerateConfirmOpen(false)}
                disabled={operating}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp"
                style={{ borderRadius: '2px' }}
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleGenerate90}
                disabled={operating}
                className="py-2.5 px-4 btn-primary text-xs font-serif_jp font-medium shadow-md disabled:opacity-40 flex items-center justify-center"
              >
                {operating ? i18n.common.loading : '確認追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作二次確認 Modal */}
      {actionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/45 backdrop-blur-sm animate-reveal">
          <div className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.4)] p-6 shadow-prism space-y-4" style={{ borderRadius: '2px' }}>
            <h3 className="text-base font-serif_jp font-medium text-[#2E7C94] text-center">
              {actionConfirm.type === 'void'
                ? '確認作廢此卡片？'
                : actionConfirm.type === 'reissue'
                ? '確認作廢並補發新卡？'
                : '確認重置此卡片的投票？'}
            </h3>
            <p className="text-xs font-serif_jp text-[#8A9499] text-center leading-relaxed">
              目標短碼：
              <span className="font-mono text-[#2E7C94] font-bold ml-1">
                {formatShortCode(actionConfirm.token)}
              </span>
              <br />
              <span className="mt-1 block">
                {actionConfirm.type === 'void' && '作廢後此卡片將永遠無法用於投票，總票卡數將扣減 1。'}
                {actionConfirm.type === 'reissue' && '舊卡將立即作廢，並在同一筆交易內自動換發一張全新有效短碼。'}
                {actionConfirm.type === 'reset' && '該卡已投的三道菜票數與已投票人數將自動回扣，卡片改回未使用狀態。'}
              </span>
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionConfirm(null)}
                disabled={operating}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp"
                style={{ borderRadius: '2px' }}
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={operating}
                className="py-2.5 px-4 btn-primary text-xs font-serif_jp font-medium shadow-md disabled:opacity-40 flex items-center justify-center"
              >
                {operating ? i18n.common.loading : i18n.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
