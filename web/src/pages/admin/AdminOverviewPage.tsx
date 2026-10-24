import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ExternalLink, AlertTriangle, UtensilsCrossed, Award, ChefHat, Check, Copy, ArrowRight, Sparkles, QrCode } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import { api, ApiException, type ResultsResponse } from '../../lib/api'
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

  const [dishesCount, setDishesCount] = useState<number>(0)
  const [groupsCount, setGroupsCount] = useState<number>(0)
  const [leaderboard, setLeaderboard] = useState<ResultsResponse | null>(null)

  const [confirmStatusModal, setConfirmStatusModal] = useState<'preparing' | 'open' | 'closed' | null>(null)
  const [updating, setUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedType, setCopiedType] = useState<'vote' | 'results' | null>(null)

  const fetchAllData = async () => {
    try {
      const [overviewData, dishesData, resultsData] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminDishes().catch(() => ({ dishes: [] })),
        api.getResults().catch(() => null)
      ])

      setOverview(overviewData)
      setDishesCount(dishesData.dishes.length)

      const groupSet = new Set(dishesData.dishes.map(d => d.groupName?.trim() || '未分組'))
      setGroupsCount(groupSet.size)

      setLeaderboard(resultsData)
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const handleStatusChange = async (targetStatus: 'preparing' | 'open' | 'closed') => {
    setUpdating(true)
    setErrorMessage(null)
    try {
      await api.updateStatus(targetStatus)
      setConfirmStatusModal(null)
      await fetchAllData()
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
      await fetchAllData()
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

  const handleCopy = (type: 'vote' | 'results') => {
    const origin = window.location.origin
    const url = type === 'vote' ? `${origin}/vote` : `${origin}/results`
    navigator.clipboard.writeText(url)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
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

  const topChampionGroup = leaderboard?.groups?.find(g => g.rank === 1)
  const topChampionDish = leaderboard?.results?.find(d => d.rank === 1)

  return (
    <AdminLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* 頂部 Header：標題與快捷捷徑 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[rgba(79,174,200,0.25)] p-4 sm:p-5 shadow-soft" style={{ borderRadius: '2px' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#349282]">✦</span>
              <h1 className="text-lg sm:text-xl font-serif_jp font-bold text-[#2E7C94] tracking-wide">
                {overview.title} · 控制總覽中心
              </h1>
            </div>
            <p className="text-xs font-serif_jp text-[#8A9499]">
              一站式活動指揮中心：整合活動推進、大螢幕連動、投票進度與菜色評審概況
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/results"
              target="_blank"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 btn-primary text-xs font-serif_jp font-medium shadow-sm transition-all"
              style={{ borderRadius: '2px' }}
            >
              <span>開啟大螢幕投影</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#ECE2A6]" />
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp flex items-center gap-2" style={{ borderRadius: '2px' }}>
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ✦ 核心整合區塊 1：一體化活動進行狀態控制中樞 ✦ */}
        <div className="bg-white border border-[rgba(79,174,200,0.3)] shadow-soft p-4 sm:p-6 space-y-4" style={{ borderRadius: '2px' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[rgba(79,174,200,0.2)]">
            <div>
              <span className="text-xs font-serif_jp font-bold text-[#2E7C94] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#349282]" />
                <span>活動階段推進與大螢幕揭曉連動</span>
              </span>
              <p className="text-[11px] font-serif_jp text-[#8A9499] mt-0.5">
                點選下方階段可切換活動狀態；結束投票後可直接在此一鍵揭曉大螢幕第一名
              </p>
            </div>

            {/* 大螢幕揭曉狀態直接合流顯示 */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`w-2 h-2 rounded-full ${overview.showResults ? 'bg-[#349282] animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-xs font-serif_jp font-semibold text-[#3E4347]">
                {overview.showResults ? '大螢幕：已揭曉第一名' : '大螢幕：目前隱藏中'}
              </span>
            </div>
          </div>

          {/* 三階段狀態按鈕列 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. 準備中 */}
            <button
              type="button"
              onClick={() => overview.status !== 'preparing' && setConfirmStatusModal('preparing')}
              disabled={overview.status === 'preparing' || updating}
              className={`p-3.5 border text-left transition-all ${
                overview.status === 'preparing'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm ring-1 ring-[#349282]/30'
                  : 'bg-[#F9FBFA] border-[rgba(79,174,200,0.2)] text-[#8A9499] hover:border-[rgba(79,174,200,0.4)] hover:text-[#3E4347]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif_jp font-bold text-sm text-[#2E7C94]">1. 準備中</span>
                {overview.status === 'preparing' && <span className="text-[10px] font-serif_jp bg-[#349282] text-white px-2 py-0.5 font-semibold" style={{ borderRadius: '2px' }}>進行中</span>}
              </div>
              <p className="text-[11px] font-serif_jp text-[#8A9499]">菜色名稱與組別可自由增修；來賓尚未開放投票。</p>
            </button>

            {/* 2. 開放投票中 */}
            <button
              type="button"
              onClick={() => overview.status !== 'open' && setConfirmStatusModal('open')}
              disabled={overview.status === 'open' || updating}
              className={`p-3.5 border text-left transition-all ${
                overview.status === 'open'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm ring-1 ring-[#349282]/30'
                  : 'bg-[#F9FBFA] border-[rgba(79,174,200,0.2)] text-[#8A9499] hover:border-[rgba(79,174,200,0.4)] hover:text-[#3E4347]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif_jp font-bold text-sm text-[#2E7C94]">2. 開放投票中</span>
                {overview.status === 'open' && <span className="text-[10px] font-serif_jp bg-[#349282] text-white px-2 py-0.5 font-semibold" style={{ borderRadius: '2px' }}>進行中</span>}
              </div>
              <p className="text-[11px] font-serif_jp text-[#8A9499]">菜色鎖定唯讀；來賓可掃碼選 3 道菜送出投票。</p>
            </button>

            {/* 3. 結束投票 */}
            <button
              type="button"
              onClick={() => overview.status !== 'closed' && setConfirmStatusModal('closed')}
              disabled={overview.status === 'closed' || updating}
              className={`p-3.5 border text-left transition-all ${
                overview.status === 'closed'
                  ? 'bg-[#EDF8F4] border-[#349282] text-[#3E4347] shadow-sm ring-1 ring-[#349282]/30'
                  : 'bg-[#F9FBFA] border-[rgba(79,174,200,0.2)] text-[#8A9499] hover:border-[rgba(79,174,200,0.4)] hover:text-[#3E4347]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif_jp font-bold text-sm text-[#2E7C94]">3. 結束投票</span>
                {overview.status === 'closed' && <span className="text-[10px] font-serif_jp bg-[#349282] text-white px-2 py-0.5 font-semibold" style={{ borderRadius: '2px' }}>進行中</span>}
              </div>
              <p className="text-[11px] font-serif_jp text-[#8A9499]">停止投票；評審現場評分，可隨時公布大螢幕結果。</p>
            </button>
          </div>

          {/* 大螢幕揭曉一鍵控制列（直接整合在推進軸下方，不再分成兩塊） */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFDFB] p-3.5 border border-[rgba(79,174,200,0.25)]" style={{ borderRadius: '2px' }}>
            <div className="text-xs font-serif_jp">
              <span className="font-semibold text-[#2E7C94] block sm:inline mr-2">大螢幕結果投影開關：</span>
              <span className="text-[#8A9499]">
                {overview.showResults
                  ? '投影頁面目前正公開展示冠軍組別與冠軍菜色（其他組別保密）。'
                  : '目前處於等待畫面；隨時可點選右側按鈕向全場盛大揭曉冠軍！'}
              </span>
            </div>

            <button
              onClick={handleToggleShowResults}
              disabled={updating}
              className={`px-5 py-2 text-xs font-serif_jp font-medium border transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                overview.showResults
                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 shadow-sm'
                  : 'btn-primary shadow-sm'
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
                  <Eye className="w-4 h-4 text-[#ECE2A6]" />
                  <span>立即盛大揭曉第一名</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ✦ 核心整合區塊 2：三張高效營運指標卡片 ✦ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. 投票進度卡 */}
          <div className="bg-white border border-[rgba(79,174,200,0.25)] p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-soft" style={{ borderRadius: '2px' }}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-serif_jp font-bold text-[#2E7C94] flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#349282]" />
                  <span>來賓投票進度</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#EDF8F4] text-[#349282] border border-[rgba(79,174,200,0.25)]" style={{ borderRadius: '2px' }}>
                  {votePercentage}%
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-[#2E7C94]">
                  {overview.votedCount}
                </span>
                <span className="text-xs text-[#8A9499] font-mono">
                  / {overview.totalTokens} 張卡片
                </span>
              </div>
              <div className="w-full bg-[#F9FBFA] h-2.5 p-0.5 border border-[rgba(79,174,200,0.25)] mt-2" style={{ borderRadius: '2px' }}>
                <div
                  className="bg-gradient-to-r from-[#7FCBB3] via-[#4FAEC8] to-[#2E7C94] h-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(votePercentage, 100)}%`, borderRadius: '2px' }}
                />
              </div>
            </div>

            <Link
              to="/admin/tokens"
              className="inline-flex items-center gap-1 text-[11px] text-[#349282] hover:text-[#2E7C94] font-serif_jp font-medium self-end"
            >
              <span>管理與補發卡片代碼</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 2. 菜色總表與評分概況卡 (直通菜色總表) */}
          <div className="bg-white border border-[rgba(79,174,200,0.25)] p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-soft" style={{ borderRadius: '2px' }}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-serif_jp font-bold text-[#2E7C94] flex items-center gap-1.5">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#349282]" />
                  <span>參賽菜色與組別總表</span>
                </span>
                <span className="text-[10px] font-serif_jp text-[#349282] px-2 py-0.5 bg-[#EDF8F4] border border-[rgba(79,174,200,0.25)]" style={{ borderRadius: '2px' }}>
                  隨時可評分
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-[#2E7C94]">
                  {dishesCount}
                </span>
                <span className="text-xs text-[#8A9499] font-serif_jp">
                  道參賽菜餚（涵蓋 {groupsCount} 組）
                </span>
              </div>
              <p className="text-[11px] font-serif_jp text-[#8A9499] mt-2 leading-relaxed">
                評審加扣分（準時度、完成度、收拾）可在菜色總表中隨時微調與評定。
              </p>
            </div>

            <Link
              to="/admin/dishes"
              className="inline-flex items-center gap-1 text-[11px] text-[#349282] hover:text-[#2E7C94] font-serif_jp font-medium self-end"
            >
              <span>進入菜色總表與現場評分</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 3. 現場快捷連結與分享 */}
          <div className="bg-white border border-[rgba(79,174,200,0.25)] p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-soft" style={{ borderRadius: '2px' }}>
            <div>
              <span className="text-xs font-serif_jp font-bold text-[#2E7C94] block mb-2">
                活動現場快捷連結
              </span>
              <div className="space-y-2">
                <button
                  onClick={() => handleCopy('vote')}
                  className="w-full flex items-center justify-between p-2 bg-[#F9FBFA] border border-[rgba(79,174,200,0.25)] hover:border-[#4FAEC8] text-xs font-serif_jp text-[#3E4347] transition-all"
                  style={{ borderRadius: '2px' }}
                >
                  <span className="text-slate-500">來賓投票頁面</span>
                  <span className="flex items-center gap-1 text-[#2E7C94] font-medium">
                    {copiedType === 'vote' ? <Check className="w-3 h-3 text-[#349282]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'vote' ? '已複製' : '複製網址'}</span>
                  </span>
                </button>

                <button
                  onClick={() => handleCopy('results')}
                  className="w-full flex items-center justify-between p-2 bg-[#F9FBFA] border border-[rgba(79,174,200,0.25)] hover:border-[#4FAEC8] text-xs font-serif_jp text-[#3E4347] transition-all"
                  style={{ borderRadius: '2px' }}
                >
                  <span className="text-slate-500">大螢幕結果看板</span>
                  <span className="flex items-center gap-1 text-[#2E7C94] font-medium">
                    {copiedType === 'results' ? <Check className="w-3 h-3 text-[#349282]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'results' ? '已複製' : '複製網址'}</span>
                  </span>
                </button>
              </div>
            </div>

            <Link
              to="/admin/print"
              className="inline-flex items-center gap-1 text-[11px] text-[#349282] hover:text-[#2E7C94] font-serif_jp font-medium self-end"
            >
              <span>前往列印或下載 A4 卡片</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ✦ 核心整合區塊 3：即時競賽排行榜預覽（主辦人專屬視角，一目了然領先冠軍） ✦ */}
        <div className="bg-white border border-[rgba(79,174,200,0.25)] shadow-soft p-4 sm:p-6 space-y-4" style={{ borderRadius: '2px' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[rgba(79,174,200,0.2)]">
            <div>
              <h2 className="text-sm font-serif_jp font-bold text-[#2E7C94] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#349282]" />
                <span>現場即時戰況預覽（管理者即時視角）</span>
              </h2>
              <p className="text-[11px] font-serif_jp text-[#8A9499] mt-0.5">
                此處為後台即時動態總分統計（一票 1 分 ＋ 各道菜評審加扣分），大螢幕僅在揭曉時公布第一名
              </p>
            </div>

            <Link
              to="/admin/dishes"
              className="text-xs font-serif_jp text-[#349282] hover:text-[#2E7C94] flex items-center gap-1 font-medium"
            >
              <span>進入菜色總表調整分數</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 目前領先：冠軍組別 */}
            <div className="p-4 bg-gradient-to-r from-[#FAFDFB] to-white border border-[rgba(79,174,200,0.25)] space-y-2" style={{ borderRadius: '2px' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif_jp font-semibold text-[#8A9499] flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#349282]" />
                  <span>目前第一名組別（即時領先）</span>
                </span>
                {topChampionGroup && (
                  <span className="text-xs font-mono font-bold text-[#349282] bg-[#EDF8F4] px-2 py-0.5 border border-[rgba(79,174,200,0.25)]" style={{ borderRadius: '2px' }}>
                    總分 {topChampionGroup.totalScore} 分
                  </span>
                )}
              </div>
              <h3 className="text-lg font-serif_jp font-bold text-[#2E7C94]">
                {topChampionGroup ? topChampionGroup.groupName : '尚未產生領先組別'}
              </h3>
              {topChampionGroup && (
                <p className="text-xs text-[#8A9499] font-serif_jp">
                  來賓 {topChampionGroup.voteCount} 票 · 評審加分 {topChampionGroup.extraScore > 0 ? `+${topChampionGroup.extraScore}` : topChampionGroup.extraScore} 分
                </p>
              )}
            </div>

            {/* 目前領先：冠軍菜色 */}
            <div className="p-4 bg-gradient-to-r from-[#FAFDFB] to-white border border-[rgba(79,174,200,0.25)] space-y-2" style={{ borderRadius: '2px' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif_jp font-semibold text-[#8A9499] flex items-center gap-1">
                  <ChefHat className="w-3.5 h-3.5 text-[#349282]" />
                  <span>目前第一名菜色（即時領先）</span>
                </span>
                {topChampionDish && (
                  <span className="text-xs font-mono font-bold text-[#349282] bg-[#EDF8F4] px-2 py-0.5 border border-[rgba(79,174,200,0.25)]" style={{ borderRadius: '2px' }}>
                    總分 {topChampionDish.totalScore} 分
                  </span>
                )}
              </div>
              <h3 className="text-lg font-serif_jp font-bold text-[#2E7C94] truncate">
                {topChampionDish ? topChampionDish.name : '尚未產生領先菜色'}
              </h3>
              {topChampionDish && (
                <p className="text-xs text-[#8A9499] font-serif_jp">
                  出品組別：{topChampionDish.groupName || '未分組'} · 來賓 {topChampionDish.voteCount} 票
                </p>
              )}
            </div>
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
