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
        <div className="flex justify-center p-12 text-[#349282] text-sm animate-pulse font-serif_jp">
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
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#349282]">✦</span>
              <h1 className="text-xl font-serif_jp font-medium text-[#2E7C94] tracking-wide">
                {i18n.admin.dishesTitle}
              </h1>
            </div>
            <p className="text-xs font-serif_jp text-[#8A9499]">
              管理參賽菜色清單與排列順序（共 {dishes.length} 道佳餚）
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
              <span className="font-semibold">目前非準備中狀態（當前：{status === 'open' ? '開放投票中' : '已結束'}）</span>
              <p className="text-[#8A9499] mt-0.5">為確保投票資料一致性與公平，菜色已被鎖定為唯讀模式，無法新增、修改或刪除。</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp flex items-center gap-2" style={{ borderRadius: '2px' }}>
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 菜色列表表格 */}
        <div className="bg-white border border-[rgba(79,174,200,0.25)] shadow-soft" style={{ borderRadius: '2px' }}>
          <div className="divide-y divide-[rgba(79,174,200,0.15)]">
            {dishes.length === 0 ? (
              <div className="p-8 text-center text-[#8A9499] font-serif_jp text-sm">
                尚未建立任何菜色，請點擊上方按鈕新增。
              </div>
            ) : (
              dishes.map((dish, idx) => (
                <div key={dish.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F9FBFA] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-xs font-display italic text-[#92C5B7]">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <ChefHat className="w-4 h-4 text-[#349282] shrink-0" />
                    <span className="text-sm font-serif_jp font-medium text-[#3E4347] truncate">
                      {dish.name}
                    </span>
                    <span className="text-xs font-mono text-[#2E7C94] px-2 py-0.5 bg-[#EDF8F4] border border-[rgba(79,174,200,0.25)] shrink-0" style={{ borderRadius: '2px' }}>
                      {dish.voteCount} 票
                    </span>
                  </div>

                  {isPreparing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 text-[#8A9499] hover:text-[#2E7C94] disabled:opacity-20"
                        title="上移"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === dishes.length - 1}
                        className="p-1.5 text-[#8A9499] hover:text-[#2E7C94] disabled:opacity-20"
                        title="下移"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(dish)}
                        className="p-1.5 text-[#8A9499] hover:text-[#349282] ml-1"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(dish.id)}
                        className="p-1.5 text-[#8A9499] hover:text-red-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/45 backdrop-blur-sm animate-reveal">
          <form onSubmit={handleSaveDish} className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.4)] p-6 shadow-prism space-y-4" style={{ borderRadius: '2px' }}>
            <h3 className="text-base font-serif_jp font-medium text-[#2E7C94]">
              {editingDish.id ? '編輯菜色' : '新增菜色'}
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-serif_jp text-[#8A9499]">菜色名稱（例如：第 1 組 - 香烤聖誕火雞）</label>
              <input
                type="text"
                value={editingDish.name}
                onChange={e => setEditingDish(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：香烤聖誕火雞"
                className="w-full px-3 py-2 bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)] focus:border-[#4FAEC8] text-sm font-serif_jp text-[#3E4347] outline-none"
                style={{ borderRadius: '2px' }}
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-serif_jp text-[#8A9499]">排序號碼（數字越小排越前面）</label>
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
