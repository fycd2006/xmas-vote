import { useEffect, useState, useMemo } from 'react'
import { Plus, Search, RotateCcw, Ban, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
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
            <h1 className="text-xl font-bold text-white mb-1">
              {i18n.admin.tokensTitle}
            </h1>
            <p className="text-xs text-slate-400">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-xmas-green to-xmas-green-light hover:from-xmas-green-light hover:to-xmas-green text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{i18n.admin.generateTokens}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-950/80 border border-green-500/50 rounded-xl text-green-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 搜尋與狀態篩選工具列 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋短碼或 Token..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-xmas-gold rounded-xl text-xs text-white placeholder:text-slate-500 outline-none uppercase font-mono"
            />
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'unused', 'used', 'void'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === st
                    ? 'bg-slate-800 text-xmas-gold border border-xmas-gold/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all' ? '全部' : st === 'unused' ? '未使用' : st === 'used' ? '已使用' : '已作廢'}
              </button>
            ))}
          </div>
        </div>

        {/* Token 列表清單 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xmas-gold text-sm animate-pulse">
              {i18n.common.loading}
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              查無符合條件的卡片代碼。
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredTokens.map(item => {
                const isUnused = item.status === 'unused'
                const isUsed = item.status === 'used'

                return (
                  <div key={item.token} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-white tracking-widest bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {formatShortCode(item.token)}
                      </span>

                      {/* 狀態標籤 */}
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        item.status === 'unused'
                          ? 'bg-green-950/60 text-green-300 border-green-700/50'
                          : item.status === 'used'
                          ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 line-through'
                      }`}>
                        {item.status === 'unused' ? '未使用' : item.status === 'used' ? '已投票' : '已作廢'}
                      </span>

                      {item.replacedBy && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          $\rightarrow$ 重發為: {formatShortCode(item.replacedBy)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {/* 時間資訊 */}
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {item.usedAt
                            ? `使用: ${new Date(item.usedAt).toLocaleTimeString()}`
                            : item.voidedAt
                            ? `作廢: ${new Date(item.voidedAt).toLocaleTimeString()}`
                            : `建於: ${new Date(item.createdAt).toLocaleDateString()}`}
                        </span>
                      </div>

                      {/* 操作按鈕群 */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnused && (
                          <>
                            <button
                              onClick={() => setActionConfirm({ type: 'reissue', token: item.token })}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xmas-gold text-xs font-medium flex items-center gap-1 transition-all"
                              title="作廢舊卡並發行新短碼"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>補發</span>
                            </button>

                            <button
                              onClick={() => setActionConfirm({ type: 'void', token: item.token })}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-xs font-medium flex items-center gap-1 transition-all"
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
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-950/60 text-amber-300 text-xs font-medium flex items-center gap-1 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white text-center">確認追加產生 90 張票卡？</h3>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              系統目前已有 <span className="text-xmas-gold font-bold">{tokens.length}</span> 張卡片。按下確認後將會「追加」90 張全新未使用的卡片。
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setGenerateConfirmOpen(false)}
                disabled={operating}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleGenerate90}
                disabled={operating}
                className="py-2.5 px-4 bg-gradient-to-r from-xmas-green to-xmas-green-light hover:from-xmas-green-light hover:to-xmas-green text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-40 flex items-center justify-center"
              >
                {operating ? i18n.common.loading : '確認追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作二次確認 Modal */}
      {actionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white text-center">
              {actionConfirm.type === 'void'
                ? '確認作廢此卡片？'
                : actionConfirm.type === 'reissue'
                ? '確認作廢並補發新卡？'
                : '確認重置此卡片的投票？'}
            </h3>
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              目標短碼：
              <span className="font-mono text-xmas-gold font-bold ml-1">
                {formatShortCode(actionConfirm.token)}
              </span>
              <br />
              {actionConfirm.type === 'void' && '作廢後此卡片將永遠無法用於投票，總票卡數將扣減 1。'}
              {actionConfirm.type === 'reissue' && '舊卡將立即作廢，並在同一筆交易內自動換發一張全新有效短碼。'}
              {actionConfirm.type === 'reset' && '該卡已投的三道菜票數與已投票人數將自動回扣，卡片改回未使用狀態。'}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionConfirm(null)}
                disabled={operating}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={operating}
                className="py-2.5 px-4 bg-gradient-to-r from-xmas-red to-xmas-red-dark hover:from-xmas-red-hover hover:to-xmas-red text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-40 flex items-center justify-center"
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
