import React, { useEffect, useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Lock, AlertCircle, ChefHat, Award, Clock, CheckCircle2, Sparkles, SlidersHorizontal, Info } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import { api, ApiException } from '../../lib/api'
import { i18n } from '../../i18n/zh-TW'

interface DishItem {
  id: string
  name: string
  groupName: string
  sortOrder: number
  voteCount: number
  scorePunctuality: number
  scoreCompleteness: number
  scoreCleanup: number
  extraScore: number
  totalScore: number
}

export default function AdminDishesPage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'preparing' | 'open' | 'closed'>('preparing')
  const [dishes, setDishes] = useState<DishItem[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [updatingDishId, setUpdatingDishId] = useState<string | null>(null)

  // 全域加扣分點數變數（預設 10 分，支援全域即時切換）
  const [scoreUnit, setScoreUnit] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('xmas_score_unit')
      if (saved && !isNaN(Number(saved))) return Number(saved)
    }
    return 10
  })

  const handleUpdateScoreUnit = (val: number) => {
    const valid = Math.max(1, Math.min(100, Math.floor(val)))
    setScoreUnit(valid)
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmas_score_unit', String(valid))
    }
  }

  // 編輯/新增 Modal 狀態
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<{
    id?: string
    name: string
    groupName: string
    sortOrder: number
  }>({ name: '', groupName: '第 1 組', sortOrder: 1 })
  const [saving, setSaving] = useState(false)

  // 刪除確認 Modal 狀態
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isPreparing = status === 'preparing'

  const fetchData = async () => {
    try {
      const [overviewData, dishesData] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminDishes()
      ])
      setStatus(overviewData.status)
      setDishes(dishesData.dishes)
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 取得目前所有既有組別清單（去重）
  const existingGroups = useMemo(() => {
    const set = new Set<string>()
    for (const d of dishes) {
      if (d.groupName?.trim()) {
        set.add(d.groupName.trim())
      }
    }
    return Array.from(set)
  }, [dishes])

  // 依組別分組菜色
  const groupedDishes = useMemo(() => {
    const map = new Map<string, DishItem[]>()
    for (const d of dishes) {
      const g = d.groupName?.trim() || '未分組'
      if (!map.has(g)) {
        map.set(g, [])
      }
      map.get(g)!.push(d)
    }
    return Array.from(map.entries())
  }, [dishes])

  const handleOpenAddModal = () => {
    if (!isPreparing) return
    const maxSort = dishes.length > 0 ? Math.max(...dishes.map(d => d.sortOrder)) : 0
    const defaultGroup = existingGroups.length > 0 ? existingGroups[existingGroups.length - 1] : '第 1 組'
    setEditingDish({ name: '', groupName: defaultGroup, sortOrder: maxSort + 1 })
    setEditModalOpen(true)
  }

  const handleOpenEditModal = (dish: DishItem) => {
    if (!isPreparing) return
    setEditingDish({
      id: dish.id,
      name: dish.name,
      groupName: dish.groupName || '未分組',
      sortOrder: dish.sortOrder
    })
    setEditModalOpen(true)
  }

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDish.name.trim()) return

    setSaving(true)
    setErrorMessage(null)
    try {
      await api.saveAdminDish({
        id: editingDish.id,
        name: editingDish.name.trim(),
        groupName: editingDish.groupName.trim(),
        sortOrder: editingDish.sortOrder
      })
      setEditModalOpen(false)
      await fetchData()
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage(i18n.common.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDish = async () => {
    if (!deleteId || !isPreparing) return
    setDeleting(true)
    setErrorMessage(null)
    try {
      await api.deleteAdminDish(deleteId)
      setDeleteId(null)
      await fetchData()
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      }
    } finally {
      setDeleting(false)
    }
  }

  // 上下微調全域排序
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!isPreparing) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= dishes.length) return

    const currentDish = dishes[index]
    const swapDish = dishes[targetIndex]

    setLoading(true)
    try {
      await Promise.all([
        api.saveAdminDish({ id: currentDish.id, name: currentDish.name, groupName: currentDish.groupName, sortOrder: swapDish.sortOrder }),
        api.saveAdminDish({ id: swapDish.id, name: swapDish.name, groupName: swapDish.groupName, sortOrder: currentDish.sortOrder })
      ])
      await fetchData()
    } catch (err) {
      if (err instanceof ApiException) setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 每一道菜色分開加扣分（依照動態變數 scoreUnit）
  const handleDishScoreChange = async (
    dish: DishItem,
    field: 'scorePunctuality' | 'scoreCompleteness' | 'scoreCleanup',
    value: number
  ) => {
    setUpdatingDishId(dish.id)
    setErrorMessage(null)
    try {
      const scores = {
        scorePunctuality: field === 'scorePunctuality' ? value : dish.scorePunctuality,
        scoreCompleteness: field === 'scoreCompleteness' ? value : dish.scoreCompleteness,
        scoreCleanup: field === 'scoreCleanup' ? value : dish.scoreCleanup,
      }

      await api.saveDishScore(dish.id, scores)
      await fetchData()
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage(i18n.common.error)
      }
    } finally {
      setUpdatingDishId(null)
    }
  }

  if (loading && dishes.length === 0) {
    return (
      <AdminLayout>
        <div className="flex justify-center p-12 text-[#349282] text-sm animate-pulse font-serif_jp">
          {i18n.common.loading}
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* 頂部頁面標題列 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#349282]">✦</span>
              <h1 className="text-lg sm:text-xl font-serif_jp font-bold text-[#2E7C94] tracking-wide">
                {i18n.admin.dishesTitle}
              </h1>
            </div>
            <p className="text-xs font-serif_jp text-[#8A9499]">
              依組別管理參賽菜色，每道菜色獨立評審加扣分（共 {groupedDishes.length} 組 · {dishes.length} 道佳餚）
            </p>
          </div>

          {isPreparing && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 btn-primary text-xs font-serif_jp font-medium shadow-sm transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 text-[#ECE2A6]" />
              <span>{i18n.admin.addDish}</span>
            </button>
          )}
        </div>

        {/* 狀態防呆警示 Banner */}
        {!isPreparing && (
          <div className="p-3.5 sm:p-4 bg-[#EDF8F4] rounded-xl flex items-start sm:items-center gap-3 text-[#2E7C94] text-xs font-serif_jp">
            <Lock className="w-4 h-4 shrink-0 text-[#349282] mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold">目前處於進行/結束狀態（{status === 'open' ? '開放投票中' : '已結束'}）</span>
              <p className="text-[#8A9499] mt-0.5">菜色名稱與排序已被鎖定；每道菜色的評審加扣分仍可由管理者隨時評定與調整。</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 rounded-lg text-red-600 text-xs font-serif_jp flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ✦ 評判標準統一置頂總表 ✦ (加扣分設定為變數，支援全域切換，無框線純淨日系風) */}
        <div className="bg-white rounded-2xl shadow-soft p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EDF8F4] flex items-center justify-center text-[#2E7C94] shrink-0">
                <Info className="w-4 h-4 text-[#349282]" />
              </div>
              <h2 className="text-sm sm:text-base font-serif_jp font-bold text-[#2E7C94]">
                現場評審加扣分評判標準指南
              </h2>
            </div>

            {/* 全域加扣分點數調整變數選擇器 */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-serif_jp">
              <span className="text-[#8A9499] flex items-center gap-1 font-medium">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#349282]" />
                <span>全域加扣點數：</span>
              </span>
              {[5, 10, 15, 20].map(pt => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => handleUpdateScoreUnit(pt)}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                    scoreUnit === pt
                      ? 'bg-[#2E7C94] text-white shadow-xs'
                      : 'bg-slate-100 text-[#8A9499] hover:text-[#2E7C94] hover:bg-slate-200/70'
                  }`}
                >
                  ±{pt} 分
                </button>
              ))}
            </div>
          </div>

          {/* 三大評判項目統一置頂說明 (純色階襯底，去除生硬框線) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* 1. 準時度 */}
            <div className="bg-[#F8FAFB] rounded-xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-serif_jp font-bold text-[#2E7C94]">
                  <Clock className="w-4 h-4 text-[#349282]" />
                  <span>1. 準時度評判</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#0D9488] bg-[#E6F7F2] px-2.5 py-0.5 rounded-full">
                  ±{scoreUnit} 分
                </span>
              </div>
              <p className="text-xs font-serif_jp text-[#334155] leading-relaxed">
                規定時間前有將該道菜色放置到指定區域且達成指定份數。
              </p>
              <div className="text-[11px] text-[#64748B] font-serif_jp">
                完成 <span className="text-[#0D9488] font-bold">+{scoreUnit}</span> 分 · 未完成 <span className="text-rose-600 font-bold">-{scoreUnit}</span> 分
              </div>
            </div>

            {/* 2. 完成度 */}
            <div className="bg-[#F8FAFB] rounded-xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-serif_jp font-bold text-[#2E7C94]">
                  <CheckCircle2 className="w-4 h-4 text-[#349282]" />
                  <span>2. 完成度評判</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#0D9488] bg-[#E6F7F2] px-2.5 py-0.5 rounded-full">
                  ±{scoreUnit} 分
                </span>
              </div>
              <p className="text-xs font-serif_jp text-[#334155] leading-relaxed">
                上菜秀之前有將該道菜色完成達到指定份數。
              </p>
              <div className="text-[11px] text-[#64748B] font-serif_jp">
                完成 <span className="text-[#0D9488] font-bold">+{scoreUnit}</span> 分 · 未完成 <span className="text-rose-600 font-bold">-{scoreUnit}</span> 分
              </div>
            </div>

            {/* 3. 收拾環境 */}
            <div className="bg-[#F8FAFB] rounded-xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-serif_jp font-bold text-[#2E7C94]">
                  <Sparkles className="w-4 h-4 text-[#349282]" />
                  <span>3. 收拾環境評判</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#0D9488] bg-[#E6F7F2] px-2.5 py-0.5 rounded-full">
                  ±{scoreUnit} 分
                </span>
              </div>
              <p className="text-xs font-serif_jp text-[#334155] leading-relaxed">
                在指定時間內有將工作區收拾乾淨。
              </p>
              <div className="text-[11px] text-[#64748B] font-serif_jp">
                完成 <span className="text-[#0D9488] font-bold">+{scoreUnit}</span> 分 · 未完成 <span className="text-rose-600 font-bold">-{scoreUnit}</span> 分
              </div>
            </div>
          </div>
        </div>

        {/* 依組別分類清單 */}
        {groupedDishes.length === 0 ? (
          <div className="bg-white p-12 text-center text-[#8A9499] font-serif_jp text-sm shadow-soft rounded-2xl">
            尚未建立任何菜色，請點擊上方按鈕新增菜色並設定組別。
          </div>
        ) : (
          <div className="space-y-8">
            {groupedDishes.map(([groupName, groupDishList]) => {
              const totalVotes = groupDishList.reduce((sum, d) => sum + d.voteCount, 0)
              const totalExtra = groupDishList.reduce((sum, d) => sum + d.extraScore, 0)
              const groupTotalScore = totalVotes + totalExtra

              return (
                <div
                  key={groupName}
                  className="bg-[#F3F8F6] rounded-3xl p-4 sm:p-6 space-y-4 shadow-sm relative overflow-hidden"
                >
                  {/* 組別 Header 橫幅：大字組名、鮮明色彩、無框線大計分牌 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#EBF6FA] via-[#EDF8F4] to-[#F0FAF7] p-4 sm:p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2E7C94] to-[#349282] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Award className="w-5 h-5 text-[#ECE2A6]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-xl sm:text-2xl font-serif_jp font-black text-[#1E3A44] tracking-wide">
                            {groupName}
                          </h2>
                          <span className="text-xs font-serif_jp font-bold text-[#2E7C94] bg-white/90 px-3 py-1 rounded-full shadow-2xs">
                            {groupDishList.length} 道參賽菜餚
                          </span>
                        </div>
                        <p className="text-xs font-serif_jp text-[#64748B] mt-1">
                          來賓累計：<span className="font-mono font-bold text-[#0F172A] text-sm">{totalVotes} 票</span>
                          <span className="mx-2 text-slate-300">·</span>
                          評審加扣分：<span className={`font-mono font-bold text-sm ${totalExtra > 0 ? 'text-[#0D9488]' : totalExtra < 0 ? 'text-rose-600' : 'text-[#64748B]'}`}>{totalExtra > 0 ? `+${totalExtra}` : totalExtra} 分</span>
                        </p>
                      </div>
                    </div>

                    {/* 組別總得分立體白金大計分牌 */}
                    <div className="flex items-center self-end sm:self-auto">
                      <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-2.5 text-right shadow-sm min-w-[110px]">
                        <span className="text-[10px] font-serif_jp font-bold text-[#64748B] block tracking-wider">組別總得分</span>
                        <span className="font-mono text-2xl sm:text-3xl font-black text-[#0D9488] leading-none mt-0.5 block">
                          {groupTotalScore} <span className="text-xs font-serif_jp font-normal text-[#64748B]">分</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 該組菜色清單：白底獨立浮島卡片群，無生硬格線 */}
                  <div className="space-y-3.5">
                    {groupDishList.map(dish => {
                      const globalIndex = dishes.findIndex(d => d.id === dish.id)
                      const isUpdating = updatingDishId === dish.id

                      return (
                        <div key={dish.id} className="bg-white rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm transition-all hover:shadow-md">
                          {/* 菜色資訊列：大字體、高對比菜名、鮮明總分膠囊 */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* 序號徽章 */}
                              <span className="w-8 h-8 rounded-lg bg-[#EBF6FA] text-[#2E7C94] font-mono font-black text-xs flex items-center justify-center shrink-0">
                                {String(globalIndex + 1).padStart(2, '0')}
                              </span>
                              {/* 廚師帽圖標 */}
                              <div className="w-8 h-8 rounded-lg bg-[#EDF8F4] flex items-center justify-center text-[#349282] shrink-0">
                                <ChefHat className="w-4 h-4" />
                              </div>
                              {/* 菜色名稱 - 大號字體、高對比清晰炭黑 */}
                              <span className="text-base sm:text-xl font-serif_jp font-bold text-[#0F172A] tracking-tight truncate">
                                {dish.name}
                              </span>
                              {/* 票數與總分徽章 */}
                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                <span className="text-xs font-mono font-bold text-[#0284C7] bg-[#E0F2FE] px-2.5 py-1 rounded-full">
                                  {dish.voteCount} 票
                                </span>
                                <span className="text-xs sm:text-sm font-mono font-black text-white bg-gradient-to-r from-[#0D9488] to-[#0284C7] px-3.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                                  總分 {dish.totalScore}
                                </span>
                              </div>
                            </div>

                            {/* 操作按鈕（準備中狀態） */}
                            {isPreparing && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => handleMoveOrder(globalIndex, 'up')}
                                  disabled={globalIndex === 0}
                                  className="p-1.5 rounded-lg text-[#8A9499] hover:text-[#2E7C94] hover:bg-slate-100 disabled:opacity-20 transition-all"
                                  title="全域上移"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveOrder(globalIndex, 'down')}
                                  disabled={globalIndex === dishes.length - 1}
                                  className="p-1.5 rounded-lg text-[#8A9499] hover:text-[#2E7C94] hover:bg-slate-100 disabled:opacity-20 transition-all"
                                  title="全域下移"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(dish)}
                                  className="p-1.5 rounded-lg text-[#8A9499] hover:text-[#349282] hover:bg-slate-100 ml-0.5 transition-all"
                                  title="編輯菜色與組別"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(dish.id)}
                                  className="p-1.5 rounded-lg text-[#8A9499] hover:text-red-500 hover:bg-red-50 transition-all"
                                  title="刪除菜色"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 該道菜色專屬評分按鈕列 (無框線、純色塊階梯、高階分段滑塊按鈕) */}
                          <div className="bg-[#F8FAFC] rounded-xl p-3 sm:p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-serif_jp font-bold text-[#334155] flex items-center gap-2">
                                <span>評審加扣分小計：</span>
                                <span className={`font-mono text-sm font-black px-2.5 py-0.5 rounded-md ${
                                  dish.extraScore > 0
                                    ? 'text-[#0D9488] bg-[#CCFBF1]'
                                    : dish.extraScore < 0
                                    ? 'text-rose-600 bg-rose-100'
                                    : 'text-[#64748B] bg-slate-200/60'
                                }`}>
                                  {dish.extraScore > 0 ? `+${dish.extraScore}` : dish.extraScore} 分
                                </span>
                              </span>
                              <span className="text-[11px] font-serif_jp text-[#94A3B8]">
                                評分單位：±{scoreUnit} 分
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                              {/* 1. 準時度 */}
                              <div className="bg-white rounded-xl p-3 space-y-2 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs font-serif_jp text-[#334155] font-bold">
                                    <Clock className="w-3.5 h-3.5 text-[#349282]" />
                                    <span>準時度</span>
                                  </div>
                                  <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                    dish.scorePunctuality > 0
                                      ? 'bg-[#DCFCE7] text-[#15803D]'
                                      : dish.scorePunctuality < 0
                                      ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {dish.scorePunctuality > 0 ? `+${dish.scorePunctuality} 分` : dish.scorePunctuality < 0 ? `${dish.scorePunctuality} 分` : '未評分'}
                                  </span>
                                </div>
                                <div className="bg-slate-100/80 p-0.5 rounded-lg grid grid-cols-3 gap-0.5 text-xs font-serif_jp">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scorePunctuality', scoreUnit)}
                                    className={`py-1.5 text-center rounded-md transition-all font-medium ${
                                      dish.scorePunctuality > 0
                                        ? 'bg-[#0D9488] text-white font-bold shadow-xs'
                                        : 'text-slate-500 hover:text-[#0D9488] hover:bg-white/60'
                                    }`}
                                  >
                                    完成 (+{scoreUnit})
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scorePunctuality', -scoreUnit)}
                                    className={`py-1.5 text-center rounded-md transition-all font-medium ${
                                      dish.scorePunctuality < 0
                                        ? 'bg-[#E11D48] text-white font-bold shadow-xs'
                                        : 'text-slate-500 hover:text-[#E11D48] hover:bg-white/60'
                                    }`}
                                  >
                                    未完成 (-{scoreUnit})
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scorePunctuality', 0)}
                                    className={`py-1.5 text-center rounded-md transition-all ${
                                      dish.scorePunctuality === 0
                                        ? 'bg-white text-slate-800 font-bold shadow-xs'
                                        : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    未評 (0)
                                  </button>
                                </div>
                              </div>

                              {/* 2. 完成度 */}
                              <div className="bg-white rounded-xl p-3 space-y-2 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs font-serif_jp text-[#334155] font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#349282]" />
                                    <span>完成度</span>
                                  </div>
                                  <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                    dish.scoreCompleteness > 0
                                      ? 'bg-[#DCFCE7] text-[#15803D]'
                                      : dish.scoreCompleteness < 0
                                      ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {dish.scoreCompleteness > 0 ? `+${dish.scoreCompleteness} 分` : dish.scoreCompleteness < 0 ? `${dish.scoreCompleteness} 分` : '未評分'}
                                  </span>
                                </div>
                                <div className="bg-slate-100/80 p-0.5 rounded-lg grid grid-cols-3 gap-0.5 text-xs font-serif_jp">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCompleteness', scoreUnit)}
                                    className={`py-1.5 text-center rounded-md transition-all font-medium ${
                                      dish.scoreCompleteness > 0
                                        ? 'bg-[#0D9488] text-white font-bold shadow-xs'
                                        : 'text-slate-500 hover:text-[#0D9488] hover:bg-white/60'
                                    }`}
                                  >
                                    完成 (+{scoreUnit})
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCompleteness', -scoreUnit)}
                                    className={`py-1.5 text-center rounded-md transition-all font-medium ${
                                      dish.scoreCompleteness < 0
                                        ? 'bg-[#E11D48] text-white font-bold shadow-xs'
                                        : 'text-slate-500 hover:text-[#E11D48] hover:bg-white/60'
                                    }`}
                                  >
                                    未完成 (-{scoreUnit})
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCompleteness', 0)}
                                    className={`py-1.5 text-center rounded-md transition-all ${
                                      dish.scoreCompleteness === 0
                                        ? 'bg-white text-slate-800 font-bold shadow-xs'
                                        : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    未評 (0)
                                  </button>
                                </div>
                              </div>

                              {/* 3. 收拾環境 */}
                              <div className="bg-white rounded-xl p-3 space-y-2 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs font-serif_jp text-[#334155] font-bold">
                                    <Sparkles className="w-3.5 h-3.5 text-[#349282]" />
                                    <span>收拾環境</span>
                                  </div>
                                  <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                    dish.scoreCleanup > 0
                                      ? 'bg-[#DCFCE7] text-[#15803D]'
                                      : dish.scoreCleanup < 0
                                      ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {dish.scoreCleanup > 0 ? `+${dish.scoreCleanup} 分` : dish.scoreCleanup < 0 ? `${dish.scoreCleanup} 分` : '未評分'}
                                  </span>
                                </div>
                                <div className="bg-slate-100/80 p-0.5 rounded-lg grid grid-cols-3 gap-0.5 text-xs font-serif_jp">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCleanup', scoreUnit)}
                                    className={`py-1.5 text-center rounded-md transition-all font-medium ${
                                      dish.scoreCleanup > 0
                                        ? 'bg-[#0D9488] text-white font-bold shadow-xs'
                                        : 'text-slate-500 hover:text-[#0D9488] hover:bg-white/60'
                                    }`}
                                  >
                                    完成 (+{scoreUnit})
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCleanup', -scoreUnit)}
                                    className={`py-1.5 text-center rounded-md transition-all font-medium ${
                                      dish.scoreCleanup < 0
                                        ? 'bg-[#E11D48] text-white font-bold shadow-xs'
                                        : 'text-slate-500 hover:text-[#E11D48] hover:bg-white/60'
                                    }`}
                                  >
                                    未完成 (-{scoreUnit})
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCleanup', 0)}
                                    className={`py-1.5 text-center rounded-md transition-all ${
                                      dish.scoreCleanup === 0
                                        ? 'bg-white text-slate-800 font-bold shadow-xs'
                                        : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    未評 (0)
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 新增/編輯菜色 Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-reveal">
          <form onSubmit={handleSaveDish} className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-serif_jp font-bold text-[#2E7C94]">
              {editingDish.id ? '編輯菜色' : '新增菜色'}
            </h3>

            {/* 所屬組別 */}
            <div className="space-y-1.5">
              <label className="text-xs font-serif_jp font-medium text-[#64748B]">所屬組別（例如：第 1 組、第 2 組）</label>
              <input
                type="text"
                value={editingDish.groupName}
                onChange={e => setEditingDish(prev => ({ ...prev, groupName: e.target.value }))}
                placeholder="例如：第 1 組"
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-sm font-serif_jp text-[#1E293B] outline-none transition-all focus:ring-2 focus:ring-[#349282]/30"
              />
              {existingGroups.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#8A9499]">快速選擇：</span>
                  {existingGroups.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditingDish(prev => ({ ...prev, groupName: g }))}
                      className="text-xs px-2.5 py-1 bg-[#EDF8F4] text-[#2E7C94] rounded-lg hover:bg-[#7FCBB3]/30 transition-all font-medium"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 菜色名稱 */}
            <div className="space-y-1.5">
              <label className="text-xs font-serif_jp font-medium text-[#64748B]">菜色名稱（來賓僅看得到菜名）</label>
              <input
                type="text"
                value={editingDish.name}
                onChange={e => setEditingDish(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：法式紅酒燉牛肉"
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-sm font-serif_jp text-[#1E293B] outline-none transition-all focus:ring-2 focus:ring-[#349282]/30"
                autoFocus
              />
            </div>

            {/* 排序號碼 */}
            <div className="space-y-1.5">
              <label className="text-xs font-serif_jp font-medium text-[#64748B]">全域排序號碼（數字越小排越前面）</label>
              <input
                type="number"
                value={editingDish.sortOrder}
                onChange={e => setEditingDish(prev => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-sm font-mono text-[#1E293B] outline-none transition-all focus:ring-2 focus:ring-[#349282]/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp font-medium rounded-xl transition-all"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="submit"
                disabled={!editingDish.name.trim() || saving}
                className="py-2.5 px-4 btn-primary text-xs font-serif_jp font-bold shadow-md disabled:opacity-40 rounded-xl"
              >
                {saving ? i18n.common.loading : i18n.common.confirm}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-reveal">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-serif_jp font-bold text-[#2E7C94] text-center">確認刪除此菜色？</h3>
            <p className="text-xs font-serif_jp text-[#64748B] text-center">刪除後無法復原，請確認是否繼續。</p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp font-medium rounded-xl transition-all"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteDish}
                disabled={deleting}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-serif_jp font-bold shadow-md rounded-xl transition-all"
              >
                {deleting ? i18n.common.loading : '確定刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
