import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ExternalLink, AlertTriangle } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import { api, ApiException } from '../../lib/api'
import { i18n } from '../../i18n/zh-TW'

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<{
    title: string
    status: 'preparing' | 'open' | 'closed'
    showResults: boolean
    votedCount: number
    totalTokens: number
  } | null>(null)

  const [confirmStatusModal, setConfirmStatusModal] = useState<'preparing' | 'open' | 'closed' | null>(null)
  const [updating, setUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchOverview = async () => {
    try {
      const data = await api.getAdminOverview()
      setOverview(data)
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  const handleStatusChange = async (targetStatus: 'preparing' | 'open' | 'closed') => {
    setUpdating(true)
    setErrorMessage(null)
    try {
      await api.updateStatus(targetStatus)
      setConfirmStatusModal(null)
      await fetchOverview()
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage(i18n.common.error)
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleShowResults = async () => {
    if (!overview) return
    setUpdating(true)
    setErrorMessage(null)
    try {
      await api.updateShowResults(!overview.showResults)
      await fetchOverview()
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      }
    } finally {
      setUpdating(false)
    }
  }

  if (loading || !overview) {
    return (
      <AdminLayout>
        <div className="flex justify-center p-12 text-[#349282] text-sm animate-pulse font-serif_jp">
          {i18n.common.loading}
        </div>
      </AdminLayout>
    )
  }

  const votePercentage = overview.totalTokens > 0
    ? Math.round((overview.votedCount / overview.totalTokens) * 100)
    : 0

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 標題與預覽結果連結 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[rgba(79,174,200,0.25)] p-6 shadow-soft" style={{ borderRadius: '2px' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#349282]">✦</span>
              <h1 className="text-xl font-serif_jp font-medium text-[#2E7C94] tracking-wide">
                {overview.title}
              </h1>
            </div>
            <p className="text-xs font-serif_jp text-[#8A9499]">
              活動狀況即時監控與控制中心 · Airy Japanese Editorial Edition
            </p>
          </div>

          <Link
            to="/results"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EDF8F4] hover:bg-[#E8F5F8] border border-[rgba(79,174,200,0.35)] text-[#2E7C94] text-xs font-serif_jp font-medium transition-all shadow-sm"
            style={{ borderRadius: '2px' }}
          >
            <span>投影大螢幕看板</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#349282]" />
          </Link>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp flex items-center gap-2" style={{ borderRadius: '2px' }}>
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 核心指標卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 投票進度卡 */}
          <div className="bg-white border border-[rgba(79,174,200,0.25)] p-6 space-y-4 shadow-soft" style={{ borderRadius: '2px' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif_jp text-[#8A9499]">目前投票進度</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 bg-[#EDF8F4] text-[#349282] border border-[rgba(79,174,200,0.3)]" style={{ borderRadius: '2px' }}>
                {votePercentage}%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-[#2E7C94] tracking-tight">
                {overview.votedCount}
              </span>
              <span className="text-[#8A9499] text-sm font-mono">
                / {overview.totalTokens} 張票卡
              </span>
            </div>

            <div className="w-full bg-[#F9FBFA] h-3 p-0.5 border border-[rgba(79,174,200,0.25)] shadow-inner" style={{ borderRadius: '2px' }}>
              <div
                className="bg-gradient-to-r from-[#7FCBB3] via-[#4FAEC8] to-[#2E7C94] h-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(votePercentage, 100)}%`, borderRadius: '2px' }}
              />
            </div>
          </div>

          {/* 結果揭曉控制卡 */}
          <div className="bg-white border border-[rgba(79,174,200,0.25)] p-6 flex flex-col justify-between gap-4 shadow-soft" style={{ borderRadius: '2px' }}>
            <div>
              <span className="text-xs font-serif_jp text-[#8A9499]">大螢幕結果揭曉控制</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${overview.showResults ? 'bg-[#349282] shadow-[0_0_8px_#349282]' : 'bg-amber-400'}`} />
                <span className="text-lg font-serif_jp font-medium text-[#3E4347]">
                  {overview.showResults ? '已在螢幕上揭曉第一名結果' : '結果目前隱藏中（稍後揭曉）'}
                </span>
              </div>
              <p className="text-xs font-serif_jp text-[#8A9499] mt-1">
                開啟時，投影螢幕將以最盛大的光斑視窗僅公布本屆第一名冠軍組別與菜色，其餘組別完全保密不公開。
              </p>
            </div>

            <button
              onClick={handleToggleShowResults}
              disabled={updating}
              className={`w-full py-2.5 px-4 text-xs font-serif_jp font-medium border transition-all flex items-center justify-center gap-2 ${
                overview.showResults
                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  : 'bg-[#EDF8F4] border-[rgba(79,174,200,0.5)] text-[#349282] hover:bg-[#E8F5F8]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              {overview.showResults ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>隱藏結果 (切回等待狀態)</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>立即盛大揭曉第一名</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 三段式活動狀態切換控制 */}
        <div className="bg-white border border-[rgba(79,174,200,0.25)] p-6 space-y-4 shadow-soft" style={{ borderRadius: '2px' }}>
          <div>
            <h2 className="text-sm font-serif_jp font-medium text-[#2E7C94]">
              活動三段式狀態控制
            </h2>
            <p className="text-xs font-serif_jp text-[#8A9499] mt-0.5">
              嚴格控制各階段權限：準備中（可改菜色）、開放投票（來賓可投票）、結束投票（準備揭曉）
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. 準備中 */}
            <button
              type="button"
              onClick={() => overview.status !== 'preparing' && setConfirmStatusModal('preparing')}
              disabled={overview.status === 'preparing' || updating}
              className={`p-4 border text-left transition-all ${
                overview.status === 'preparing'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm'
                  : 'bg-[#F9FBFA] border-[rgba(79,174,200,0.2)] text-[#8A9499] hover:border-[rgba(79,174,200,0.4)] hover:text-[#3E4347]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif_jp font-medium text-sm text-[#2E7C94]">1. 準備中 (Preparing)</span>
                {overview.status === 'preparing' && <span className="text-[10px] font-serif_jp bg-[#349282] text-white px-2 py-0.5" style={{ borderRadius: '2px' }}>目前狀態</span>}
              </div>
              <p className="text-xs font-serif_jp text-[#8A9499]">菜色可自由新增、修改、刪除；來賓無法投票。</p>
            </button>

            {/* 2. 開放投票中 */}
            <button
              type="button"
              onClick={() => overview.status !== 'open' && setConfirmStatusModal('open')}
              disabled={overview.status === 'open' || updating}
              className={`p-4 border text-left transition-all ${
                overview.status === 'open'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm'
                  : 'bg-[#F9FBFA] border-[rgba(79,174,200,0.2)] text-[#8A9499] hover:border-[rgba(79,174,200,0.4)] hover:text-[#3E4347]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif_jp font-medium text-sm text-[#2E7C94]">2. 開放投票 (Open)</span>
                {overview.status === 'open' && <span className="text-[10px] font-serif_jp bg-[#349282] text-white px-2 py-0.5" style={{ borderRadius: '2px' }}>目前狀態</span>}
              </div>
              <p className="text-xs font-serif_jp text-[#8A9499]">菜色鎖定唯讀；來賓可掃碼選 3 道菜送出。</p>
            </button>

            {/* 3. 結束投票 */}
            <button
              type="button"
              onClick={() => overview.status !== 'closed' && setConfirmStatusModal('closed')}
              disabled={overview.status === 'closed' || updating}
              className={`p-4 border text-left transition-all ${
                overview.status === 'closed'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm'
                  : 'bg-[#F9FBFA] border-[rgba(79,174,200,0.2)] text-[#8A9499] hover:border-[rgba(79,174,200,0.4)] hover:text-[#3E4347]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif_jp font-medium text-sm text-[#2E7C94]">3. 結束投票 (Closed)</span>
                {overview.status === 'closed' && <span className="text-[10px] font-serif_jp bg-[#349282] text-white px-2 py-0.5" style={{ borderRadius: '2px' }}>目前狀態</span>}
              </div>
              <p className="text-xs font-serif_jp text-[#8A9499]">停止接收投票；可開啟大螢幕揭曉開關公布第一名。</p>
            </button>
          </div>
        </div>
      </div>

      {/* 狀態切換二次確認視窗 */}
      {confirmStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/45 backdrop-blur-sm animate-reveal">
          <div className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.4)] p-6 shadow-prism space-y-4" style={{ borderRadius: '2px' }}>
            <h3 className="text-base font-serif_jp font-medium text-[#2E7C94] text-center">
              {i18n.admin.switchStatusPrompt}
            </h3>
            <p className="text-xs font-serif_jp text-[#8A9499] text-center leading-relaxed">
              即將將活動狀態切換為：
              <span className="text-[#349282] font-semibold ml-1">
                {confirmStatusModal === 'preparing' ? '準備中' : confirmStatusModal === 'open' ? '開放投票' : '結束投票'}
              </span>
              {confirmStatusModal === 'preparing' && overview.votedCount > 0 && (
                <span className="block mt-2 text-red-500 font-serif_jp">⚠️ 注意：已有人投票時，伺服器將拒絕退回準備中。</span>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmStatusModal(null)}
                disabled={updating}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp transition-all"
                style={{ borderRadius: '2px' }}
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(confirmStatusModal)}
                disabled={updating}
                className="py-2.5 px-4 btn-primary text-xs font-serif_jp flex items-center justify-center"
              >
                {updating ? i18n.common.loading : i18n.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
