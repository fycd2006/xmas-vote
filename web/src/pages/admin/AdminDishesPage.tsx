import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Lock, AlertCircle, ChefHat } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import { api, ApiException } from '../../lib/api'
import { i18n } from '../../i18n/zh-TW'

interface DishItem {
  id: string
  name: string
  sortOrder: number
  voteCount: number
}

export default function AdminDishesPage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'preparing' | 'open' | 'closed'>('preparing')
  const [dishes, setDishes] = useState<DishItem[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 編輯/新增 Modal 狀態
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<{ id?: string; name: string; sortOrder: number }>({ name: '', sortOrder: 1 })
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

  const handleOpenAddModal = () => {
    if (!isPreparing) return
    const maxSort = dishes.length > 0 ? Math.max(...dishes.map(d => d.sortOrder)) : 0
    setEditingDish({ name: '', sortOrder: maxSort + 1 })
    setEditModalOpen(true)
  }

  const handleOpenEditModal = (dish: DishItem) => {
    if (!isPreparing) return
    setEditingDish({ id: dish.id, name: dish.name, sortOrder: dish.sortOrder })
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

  // 上下微調排序
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (!isPreparing) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= dishes.length) return

    const currentDish = dishes[index]
    const swapDish = dishes[targetIndex]

    setLoading(true)
    try {
      // 交換兩者 sortOrder
      await Promise.all([
        api.saveAdminDish({ id: currentDish.id, name: currentDish.name, sortOrder: swapDish.sortOrder }),
        api.saveAdminDish({ id: swapDish.id, name: swapDish.name, sortOrder: currentDish.sortOrder })
      ])
      await fetchData()
    } catch (err) {
      if (err instanceof ApiException) setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && dishes.length === 0) {
    return (
      <AdminLayout>
        <div className="flex justify-center p-12 text-xmas-gold text-sm animate-pulse">
          {i18n.common.loading}
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">
              {i18n.admin.dishesTitle}
            </h1>
            <p className="text-xs text-slate-400">
              管理參賽菜色清單與排列順序（共 {dishes.length} 道菜）
            </p>
          </div>

          {isPreparing && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-xmas-green to-xmas-green-light hover:from-xmas-green-light hover:to-xmas-green text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{i18n.admin.addDish}</span>
            </button>
          )}
        </div>

        {/* 狀態防呆警示 Banner */}
        {!isPreparing && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-200 text-xs">
            <Lock className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <span className="font-bold">目前非準備中狀態（當前：{status === 'open' ? '開放投票中' : '已結束'}）</span>
              <p className="text-amber-300/80 mt-0.5">為確保投票資料一致性與公平，菜色已被鎖定為唯讀模式，無法新增、修改或刪除。</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 菜色列表表格 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-800">
            {dishes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                尚未建立任何菜色，請點擊上方按鈕新增。
              </div>
            ) : (
              dishes.map((dish, idx) => (
                <div key={dish.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-xs font-mono text-slate-500">
                      #{idx + 1}
                    </span>
                    <ChefHat className="w-4 h-4 text-xmas-gold shrink-0" />
                    <span className="text-sm font-semibold text-slate-100 truncate">
                      {dish.name}
                    </span>
                    <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 shrink-0">
                      {dish.voteCount} 票
                    </span>
                  </div>

                  {isPreparing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 rounded"
                        title="上移"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === dishes.length - 1}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 rounded"
                        title="下移"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(dish)}
                        className="p-1.5 text-slate-400 hover:text-xmas-gold rounded ml-1"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(dish.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded"
                        title="刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 新增/編輯菜色 Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleSaveDish} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingDish.id ? '編輯菜色' : '新增菜色'}
            </h3>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">菜色名稱（來賓只看得到菜名）</label>
              <input
                type="text"
                value={editingDish.name}
                onChange={e => setEditingDish(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：香烤聖誕火雞"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-xmas-gold rounded-xl text-sm text-white outline-none"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">排序號碼（數字越小排越前面）</label>
              <input
                type="number"
                value={editingDish.sortOrder}
                onChange={e => setEditingDish(prev => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 1 }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-xmas-gold rounded-xl text-sm text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="submit"
                disabled={!editingDish.name.trim() || saving}
                className="py-2.5 px-4 bg-gradient-to-r from-xmas-green to-xmas-green-light hover:from-xmas-green-light hover:to-xmas-green text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-40"
              >
                {saving ? i18n.common.loading : i18n.common.confirm}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white text-center">確認刪除此菜色？</h3>
            <p className="text-xs text-slate-400 text-center">刪除後無法復原，請確認是否繼續。</p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteDish}
                disabled={deleting}
                className="py-2.5 px-4 bg-gradient-to-r from-xmas-red to-xmas-red-dark hover:from-xmas-red-hover hover:to-xmas-red text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-40"
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
