import React, { useEffect, useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Lock, AlertCircle, ChefHat, Award, Clock, CheckCircle2, Sparkles } from 'lucide-react'
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

  // 每一道菜色分開加扣分（準時度、完成度、收拾，每項 +10, -10, 0）
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#349282]">✦</span>
              <h1 className="text-xl font-serif_jp font-medium text-[#2E7C94] tracking-wide">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 btn-primary text-xs font-serif_jp font-medium shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-[#ECE2A6]" />
              <span>{i18n.admin.addDish}</span>
            </button>
          )}
        </div>

        {/* 狀態防呆警示 Banner */}
        {!isPreparing && (
          <div className="p-4 bg-[#EDF8F4] border border-[rgba(79,174,200,0.35)] flex items-center gap-3 text-[#2E7C94] text-xs font-serif_jp" style={{ borderRadius: '2px' }}>
            <Lock className="w-4 h-4 shrink-0 text-[#349282]" />
            <div>
              <span className="font-semibold">目前處於進行/結束狀態（{status === 'open' ? '開放投票中' : '已結束'}）</span>
              <p className="text-[#8A9499] mt-0.5">菜色名稱與排序已被鎖定；每道菜色的評審加扣分仍可由管理者隨時評定與調整。</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp flex items-center gap-2" style={{ borderRadius: '2px' }}>
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 依組別分類清單 */}
        {groupedDishes.length === 0 ? (
          <div className="bg-white border border-[rgba(79,174,200,0.25)] p-12 text-center text-[#8A9499] font-serif_jp text-sm shadow-soft" style={{ borderRadius: '2px' }}>
            尚未建立任何菜色，請點擊上方按鈕新增菜色並設定組別。
          </div>
        ) : (
          <div className="space-y-6">
            {groupedDishes.map(([groupName, groupDishList]) => {
              const totalVotes = groupDishList.reduce((sum, d) => sum + d.voteCount, 0)
              const totalExtra = groupDishList.reduce((sum, d) => sum + d.extraScore, 0)
              const groupTotalScore = totalVotes + totalExtra

              return (
                <div
                  key={groupName}
                  className="bg-white border border-[rgba(79,174,200,0.25)] shadow-soft overflow-hidden"
                  style={{ borderRadius: '2px' }}
                >
                  {/* 組別 Header 橫槓 */}
                  <div className="px-5 py-3.5 bg-gradient-to-r from-[#F9FBFA] via-white to-[#EDF8F4] border-b border-[rgba(79,174,200,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#EDF8F4] border border-[rgba(79,174,200,0.3)] flex items-center justify-center text-[#2E7C94]">
                        <Award className="w-4 h-4 text-[#349282]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-serif_jp font-bold text-[#2E7C94] tracking-wide">
                            {groupName}
                          </h2>
                          <span className="text-xs font-serif_jp text-[#8A9499]">
                            ({groupDishList.length} 道參賽菜餚)
                          </span>
                        </div>
                        <p className="text-[11px] font-serif_jp text-[#8A9499]">
                          來賓累計：<span className="font-mono font-semibold text-[#3E4347]">{totalVotes} 票</span>
                          <span className="mx-1.5 text-slate-300">|</span>
                          評審加扣分總計：<span className={`font-mono font-semibold ${totalExtra > 0 ? 'text-[#349282]' : totalExtra < 0 ? 'text-red-500' : 'text-[#8A9499]'}`}>{totalExtra > 0 ? `+${totalExtra}` : totalExtra} 分</span>
                        </p>
                      </div>
                    </div>

                    {/* 組別總得分徽章 */}
                    <div className="flex items-center gap-2">
                      <div className="bg-[#EDF8F4] border border-[rgba(79,174,200,0.35)] px-4 py-1.5 text-right" style={{ borderRadius: '2px' }}>
                        <span className="text-[10px] font-serif_jp text-[#8A9499] block">組別榮耀總得分</span>
                        <span className="font-mono text-base font-bold text-[#2E7C94]">
                          {groupTotalScore} <span className="text-xs font-serif_jp font-normal text-[#8A9499]">分</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 該組菜色清單（每道菜色獨立評判區） */}
                  <div className="divide-y divide-[rgba(79,174,200,0.2)]">
                    {groupDishList.map(dish => {
                      const globalIndex = dishes.findIndex(d => d.id === dish.id)
                      const isUpdating = updatingDishId === dish.id

                      return (
                        <div key={dish.id} className="p-4 sm:p-5 space-y-4 hover:bg-[#FAFDFB]/60 transition-colors">
                          {/* 菜色資訊列 */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 text-center text-xs font-display italic text-[#92C5B7]">
                                {String(globalIndex + 1).padStart(2, '0')}
                              </span>
                              <ChefHat className="w-4 h-4 text-[#349282] shrink-0" />
                              <span className="text-base font-serif_jp font-bold text-[#3E4347] truncate">
                                {dish.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                <span className="text-xs font-mono text-[#2E7C94] px-2.5 py-0.5 bg-[#EDF8F4] border border-[rgba(79,174,200,0.25)]" style={{ borderRadius: '2px' }}>
                                  來賓 {dish.voteCount} 票
                                </span>
                                <span className="text-xs font-mono font-bold text-[#349282] px-2.5 py-0.5 bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)]" style={{ borderRadius: '2px' }}>
                                  菜色總分 {dish.totalScore}
                                </span>
                              </div>
                            </div>

                            {/* 操作按鈕（準備中狀態） */}
                            {isPreparing && (
                              <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                                <button
                                  onClick={() => handleMoveOrder(globalIndex, 'up')}
                                  disabled={globalIndex === 0}
                                  className="p-1.5 text-[#8A9499] hover:text-[#2E7C94] disabled:opacity-20"
                                  title="全域上移"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleMoveOrder(globalIndex, 'down')}
                                  disabled={globalIndex === dishes.length - 1}
                                  className="p-1.5 text-[#8A9499] hover:text-[#2E7C94] disabled:opacity-20"
                                  title="全域下移"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(dish)}
                                  className="p-1.5 text-[#8A9499] hover:text-[#349282] ml-1"
                                  title="編輯菜色與組別"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(dish.id)}
                                  className="p-1.5 text-[#8A9499] hover:text-red-500"
                                  title="刪除菜色"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* 該道菜色專屬評判區（每道菜分開加扣分） */}
                          <div className="bg-[#F9FBFA] border border-[rgba(79,174,200,0.2)] p-3 sm:p-4" style={{ borderRadius: '2px' }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-serif_jp font-semibold text-[#2E7C94]">
                                ✦ 「{dish.name}」專屬評分區（額外加扣分小計：
                                <span className={`font-mono ml-1 ${dish.extraScore > 0 ? 'text-[#349282]' : dish.extraScore < 0 ? 'text-red-500' : 'text-[#8A9499]'}`}>
                                  {dish.extraScore > 0 ? `+${dish.extraScore}` : dish.extraScore} 分
                                </span>）
                              </span>
                              <span className="text-[10px] font-serif_jp text-[#8A9499]">
                                完成一項 +10 分 · 未完成 -10 分 · 隨時可點擊修改
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* 1. 準時度 */}
                              <div className="bg-white border border-[rgba(79,174,200,0.25)] p-3 flex flex-col justify-between gap-2.5 shadow-2xs" style={{ borderRadius: '2px' }}>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-xs font-serif_jp text-[#2E7C94]">
                                      <Clock className="w-3.5 h-3.5 text-[#349282]" />
                                      <span className="font-bold">準時度</span>
                                    </div>
                                    <span className={`font-mono text-xs font-bold px-2 py-0.5 border ${
                                      dish.scorePunctuality > 0
                                        ? 'bg-[#EDF8F4] text-[#349282] border-[rgba(79,174,200,0.3)]'
                                        : dish.scorePunctuality < 0
                                        ? 'bg-red-50 text-red-600 border-red-200'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-slate-200'
                                    }`} style={{ borderRadius: '2px' }}>
                                      {dish.scorePunctuality > 0 ? '+10' : dish.scorePunctuality < 0 ? '-10' : '0'} 分
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] font-serif_jp text-[#8A9499] leading-relaxed bg-[#F9FBFA] p-1.5 border border-[rgba(79,174,200,0.15)]" style={{ borderRadius: '2px' }}>
                                    規定時間前有將該道菜色放置到指定區域且達成指定份數
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-xs font-serif_jp">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scorePunctuality', 10)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scorePunctuality === 10
                                        ? 'bg-[#349282] text-white border-[#349282] font-semibold shadow-xs'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-[#349282]'
                                    }`}
                                    style={{ borderRadius: '2px' }}
                                  >
                                    完成 (+10)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scorePunctuality', -10)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scorePunctuality === -10
                                        ? 'bg-red-500 text-white border-red-500 font-semibold shadow-xs'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-red-500'
                                    }`}
                                    style={{ borderRadius: '2px' }}
                                  >
                                    未完成 (-10)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scorePunctuality', 0)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scorePunctuality === 0
                                        ? 'bg-slate-200 text-[#3E4347] border-slate-300 font-semibold'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-[#3E4347]'
                                    }`}
                                    style={{ borderRadius: '2px' }}
                                  >
                                    未評 (0)
                                  </button>
                                </div>
                              </div>

                              {/* 2. 完成度 */}
                              <div className="bg-white border border-[rgba(79,174,200,0.25)] p-3 flex flex-col justify-between gap-2.5 shadow-2xs" style={{ borderRadius: '2px' }}>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-xs font-serif_jp text-[#2E7C94]">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#349282]" />
                                      <span className="font-bold">完成度</span>
                                    </div>
                                    <span className={`font-mono text-xs font-bold px-2 py-0.5 border ${
                                      dish.scoreCompleteness > 0
                                        ? 'bg-[#EDF8F4] text-[#349282] border-[rgba(79,174,200,0.3)]'
                                        : dish.scoreCompleteness < 0
                                        ? 'bg-red-50 text-red-600 border-red-200'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-slate-200'
                                    }`} style={{ borderRadius: '2px' }}>
                                      {dish.scoreCompleteness > 0 ? '+10' : dish.scoreCompleteness < 0 ? '-10' : '0'} 分
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] font-serif_jp text-[#8A9499] leading-relaxed bg-[#F9FBFA] p-1.5 border border-[rgba(79,174,200,0.15)]" style={{ borderRadius: '2px' }}>
                                    上菜秀之前有將該道菜色完成達到指定份數
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-xs font-serif_jp">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCompleteness', 10)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scoreCompleteness === 10
                                        ? 'bg-[#349282] text-white border-[#349282] font-semibold shadow-xs'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-[#349282]'
                                    }`}
                                    style={{ borderRadius: '2px' }}
                                  >
                                    完成 (+10)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCompleteness', -10)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scoreCompleteness === -10
                                        ? 'bg-red-500 text-white border-red-500 font-semibold shadow-xs'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-red-500'
                                    }`}
                                    style={{ borderRadius: '2px' }}
                                  >
                                    未完成 (-10)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCompleteness', 0)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scoreCompleteness === 0
                                        ? 'bg-slate-200 text-[#3E4347] border-slate-300 font-semibold'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-[#3E4347]'
                                    }`}
                                    style={{ borderRadius: '2px' }}
                                  >
                                    未評 (0)
                                  </button>
                                </div>
                              </div>

                              {/* 3. 收拾 */}
                              <div className="bg-white border border-[rgba(79,174,200,0.25)] p-3 flex flex-col justify-between gap-2.5 shadow-2xs" style={{ borderRadius: '2px' }}>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5 text-xs font-serif_jp text-[#2E7C94]">
                                      <Sparkles className="w-3.5 h-3.5 text-[#349282]" />
                                      <span className="font-bold">收拾環境</span>
                                    </div>
                                    <span className={`font-mono text-xs font-bold px-2 py-0.5 border ${
                                      dish.scoreCleanup > 0
                                        ? 'bg-[#EDF8F4] text-[#349282] border-[rgba(79,174,200,0.3)]'
                                        : dish.scoreCleanup < 0
                                        ? 'bg-red-50 text-red-600 border-red-200'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-slate-200'
                                    }`} style={{ borderRadius: '2px' }}>
                                      {dish.scoreCleanup > 0 ? '+10' : dish.scoreCleanup < 0 ? '-10' : '0'} 分
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] font-serif_jp text-[#8A9499] leading-relaxed bg-[#F9FBFA] p-1.5 border border-[rgba(79,174,200,0.15)]" style={{ borderRadius: '2px' }}>
                                    在指定時間內有將工作區收拾乾淨
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-xs font-serif_jp">
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCleanup', 10)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scoreCleanup === 10
                                        ? 'bg-[#349282] text-white border-[#349282] font-semibold shadow-xs'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-[#349282]'
                                    }`}
                                    style={{ borderRadius: '2px' }}
                                  >
                                    完成 (+10)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCleanup', -10)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scoreCleanup === -10
                                        ? 'bg-red-500 text-white border-red-500 font-semibold shadow-xs'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-red-500'
                                    }`}
                                    style={{ borderRadius: '2px' }}
                                  >
                                    未完成 (-10)
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleDishScoreChange(dish, 'scoreCleanup', 0)}
                                    className={`py-1.5 text-center border transition-all ${
                                      dish.scoreCleanup === 0
                                        ? 'bg-slate-200 text-[#3E4347] border-slate-300 font-semibold'
                                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.25)] hover:text-[#3E4347]'
                                    }`}
                                    style={{ borderRadius: '2px' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/45 backdrop-blur-sm animate-reveal">
          <form onSubmit={handleSaveDish} className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.4)] p-6 shadow-prism space-y-4" style={{ borderRadius: '2px' }}>
            <h3 className="text-base font-serif_jp font-medium text-[#2E7C94]">
              {editingDish.id ? '編輯菜色' : '新增菜色'}
            </h3>

            {/* 所屬組別 */}
            <div className="space-y-1">
              <label className="text-xs font-serif_jp text-[#8A9499]">所屬組別（例如：第 1 組、第 2 組）</label>
              <input
                type="text"
                value={editingDish.groupName}
                onChange={e => setEditingDish(prev => ({ ...prev, groupName: e.target.value }))}
                placeholder="例如：第 1 組"
                className="w-full px-3 py-2 bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)] focus:border-[#4FAEC8] text-sm font-serif_jp text-[#3E4347] outline-none"
                style={{ borderRadius: '2px' }}
              />
              {existingGroups.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#8A9499]">快速選擇：</span>
                  {existingGroups.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditingDish(prev => ({ ...prev, groupName: g }))}
                      className="text-[10px] px-2 py-0.5 bg-[#EDF8F4] text-[#2E7C94] border border-[rgba(79,174,200,0.25)] hover:bg-[#7FCBB3]/20"
                      style={{ borderRadius: '2px' }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 菜色名稱 */}
            <div className="space-y-1">
              <label className="text-xs font-serif_jp text-[#8A9499]">菜色名稱（來賓僅看得到菜名）</label>
              <input
                type="text"
                value={editingDish.name}
                onChange={e => setEditingDish(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：法式紅酒燉牛肉"
                className="w-full px-3 py-2 bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)] focus:border-[#4FAEC8] text-sm font-serif_jp text-[#3E4347] outline-none"
                style={{ borderRadius: '2px' }}
                autoFocus
              />
            </div>

            {/* 排序號碼 */}
            <div className="space-y-1">
              <label className="text-xs font-serif_jp text-[#8A9499]">全域排序號碼（數字越小排越前面）</label>
              <input
                type="number"
                value={editingDish.sortOrder}
                onChange={e => setEditingDish(prev => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3 py-2 bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)] focus:border-[#4FAEC8] text-sm font-mono text-[#3E4347] outline-none"
                style={{ borderRadius: '2px' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp"
                style={{ borderRadius: '2px' }}
              >
                {i18n.common.cancel}
              </button>
              <button
                type="submit"
                disabled={!editingDish.name.trim() || saving}
                className="py-2.5 px-4 btn-primary text-xs font-serif_jp font-medium shadow-md disabled:opacity-40"
              >
                {saving ? i18n.common.loading : i18n.common.confirm}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/45 backdrop-blur-sm animate-reveal">
          <div className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.4)] p-6 shadow-prism space-y-4" style={{ borderRadius: '2px' }}>
            <h3 className="text-base font-serif_jp font-medium text-[#2E7C94] text-center">確認刪除此菜色？</h3>
            <p className="text-xs font-serif_jp text-[#8A9499] text-center">刪除後無法復原，請確認是否繼續。</p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp"
                style={{ borderRadius: '2px' }}
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteDish}
                disabled={deleting}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-serif_jp font-medium shadow-md disabled:opacity-40"
                style={{ borderRadius: '2px' }}
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
