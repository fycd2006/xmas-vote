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
        <div className="flex justify-center p-12 text-[#349282] text-sm animate-pulse">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#7FCBB3]/30 p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#349282]">✦</span>
              <h1 className="text-xl font-serif font-medium text-[#2E7C94] tracking-wide">
                {overview.title}
              </h1>
            </div>
            <p className="text-xs font-serif text-[#61676C]">
              即時活動狀況監控與控制中心 · Japanese Literary Editorial CMS
            </p>
          </div>

          <Link
            to="/results"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EDF8F4] hover:bg-[#E8F5F8] border border-[#7FCBB3]/40 text-[#2E7C94] text-xs font-serif font-medium rounded-xl transition-all shadow-sm"
          >
            <span>投影大螢幕結果頁</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#349282]" />
          </Link>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-serif flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 核心指標卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 投票進度卡 */}
          <div className="bg-white border border-[#7FCBB3]/30 p-6 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif text-[#61676C]">目前投票進度</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-[#EDF8F4] text-[#349282] border border-[#7FCBB3]/30">
                {votePercentage}%
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-[#2E7C94] tracking-tight">
                {overview.votedCount}
              </span>
              <span className="text-[#61676C] text-sm font-mono">
                / {overview.totalTokens} 張票卡
              </span>
            </div>

            <div className="w-full bg-[#F0F7F5] rounded-full h-3 p-0.5 border border-[#7FCBB3]/25">
              <div
                className="bg-gradient-to-r from-[#7FCBB3] via-[#4FAEC8] to-[#2E7C94] h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(votePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* 結果揭曉控制卡 */}
          <div className="bg-white border border-[#7FCBB3]/30 p-6 rounded-2xl flex flex-col justify-between gap-4 shadow-sm">
            <div>
              <span className="text-xs font-serif text-[#61676C]">大螢幕結果揭曉狀態</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${overview.showResults ? 'bg-[#349282] shadow-[0_0_8px_#349282]' : 'bg-amber-400'}`} />
                <span className="text-lg font-serif font-medium text-[#3E4347]">
                  {overview.showResults ? '已在螢幕上揭曉結果' : '結果目前隱藏中（稍後揭曉）'}
                </span>
              </div>
              <p className="text-xs font-serif text-[#61676C] mt-1">
                開啟時，投影螢幕將展示前三名頒獎台與各菜色票數排行。
              </p>
            </div>

            <button
              onClick={handleToggleShowResults}
              disabled={updating}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-serif font-medium border transition-all flex items-center justify-center gap-2 ${
                overview.showResults
                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  : 'bg-[#EDF8F4] border-[#7FCBB3]/50 text-[#349282] hover:bg-[#E8F5F8]'
              }`}
            >
              {overview.showResults ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>{i18n.admin.hideResults}</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>{i18n.admin.showResults}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 三段式活動狀態切換控制 */}
        <div className="bg-white border border-[#7FCBB3]/30 p-6 rounded-2xl space-y-4 shadow-sm">
          <div>
            <h2 className="text-sm font-serif font-medium text-[#2E7C94]">
              活動三段式狀態控制
            </h2>
            <p className="text-xs font-serif text-[#61676C] mt-0.5">
              嚴格控制各階段權限：準備中（可改菜色）、開放投票（來賓可投票）、結束投票（準備揭曉）
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. 準備中 */}
            <button
              type="button"
              onClick={() => overview.status !== 'preparing' && setConfirmStatusModal('preparing')}
              disabled={overview.status === 'preparing' || updating}
              className={`p-4 rounded-xl border text-left transition-all ${
                overview.status === 'preparing'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm'
                  : 'bg-[#F9FCFB] border-[#7FCBB3]/25 text-[#61676C] hover:border-[#7FCBB3]/50 hover:text-[#3E4347]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-medium text-sm text-[#2E7C94]">1. 準備中 (Preparing)</span>
                {overview.status === 'preparing' && <span className="text-[10px] font-serif bg-[#349282] text-white px-2 py-0.5 rounded-full">目前狀態</span>}
              </div>
              <p className="text-xs font-serif text-[#61676C]">菜色可新增、修改、刪除；來賓無法投票。</p>
            </button>

            {/* 2. 開放投票中 */}
            <button
              type="button"
              onClick={() => overview.status !== 'open' && setConfirmStatusModal('open')}
              disabled={overview.status === 'open' || updating}
              className={`p-4 rounded-xl border text-left transition-all ${
                overview.status === 'open'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm'
                  : 'bg-[#F9FCFB] border-[#7FCBB3]/25 text-[#61676C] hover:border-[#7FCBB3]/50 hover:text-[#3E4347]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-medium text-sm text-[#2E7C94]">2. 開放投票 (Open)</span>
                {overview.status === 'open' && <span className="text-[10px] font-serif bg-[#349282] text-white px-2 py-0.5 rounded-full">目前狀態</span>}
              </div>
              <p className="text-xs font-serif text-[#61676C]">菜色鎖定禁止改動；來賓可掃碼選 3 道菜送出。</p>
            </button>

            {/* 3. 結束投票 */}
            <button
              type="button"
              onClick={() => overview.status !== 'closed' && setConfirmStatusModal('closed')}
              disabled={overview.status === 'closed' || updating}
              className={`p-4 rounded-xl border text-left transition-all ${
                overview.status === 'closed'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm'
                  : 'bg-[#F9FCFB] border-[#7FCBB3]/25 text-[#61676C] hover:border-[#7FCBB3]/50 hover:text-[#3E4347]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif font-medium text-sm text-[#2E7C94]">3. 結束投票 (Closed)</span>
                {overview.status === 'closed' && <span className="text-[10px] font-serif bg-[#349282] text-white px-2 py-0.5 rounded-full">目前狀態</span>}
              </div>
              <p className="text-xs font-serif text-[#61676C]">停止接收投票；可開啟大螢幕揭曉開關顯示結果。</p>
            </button>
          </div>
        </div>
      </div>

      {/* 狀態切換二次確認視窗 */}
      {confirmStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-[#7FCBB3]/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-serif font-medium text-[#2E7C94] text-center">
              {i18n.admin.switchStatusPrompt}
            </h3>
            <p className="text-xs font-serif text-[#61676C] text-center leading-relaxed">
              即將將活動狀態切換為：
              <span className="text-[#349282] font-semibold ml-1">
                {confirmStatusModal === 'preparing' ? '準備中' : confirmStatusModal === 'open' ? '開放投票' : '結束投票'}
              </span>
              {confirmStatusModal === 'preparing' && overview.votedCount > 0 && (
                <span className="block mt-2 text-red-500 font-serif">⚠️ 注意：已有人投票時，伺服器將拒絕退回準備中。</span>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmStatusModal(null)}
                disabled={updating}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif rounded-xl"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(confirmStatusModal)}
                disabled={updating}
                className="py-2.5 px-4 bg-gradient-to-r from-[#349282] to-[#2E7C94] text-white text-xs font-serif font-medium rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center"
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
