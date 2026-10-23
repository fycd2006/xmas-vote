import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { CheckCircle2, AlertCircle, Sparkles, ChefHat, Send } from 'lucide-react'
import { api, ApiException, type BallotResponse } from '../lib/api'
import { i18n } from '../i18n/zh-TW'

export default function VotePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawToken = searchParams.get('t') || ''

  const [inputToken, setInputToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [ballot, setBallot] = useState<BallotResponse | null>(null)
  const [selectedDishIds, setSelectedDishIds] = useState<string[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [voteSuccess, setVoteSuccess] = useState(false)

  // 載入卡片狀態
  const loadBallot = async (tokenToFetch: string) => {
    if (!tokenToFetch.trim()) return
    setLoading(true)
    setErrorMessage(null)
    try {
      const data = await api.getBallot(tokenToFetch)
      setBallot(data)
      setSelectedDishIds([])
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage(i18n.common.error)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (rawToken) {
      loadBallot(rawToken)
    } else {
      setBallot(null)
    }
  }, [rawToken])

  // 手動輸入短碼送出
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputToken.trim()) return
    setSearchParams({ t: inputToken.trim() })
  }

  // 點選/取消點選菜色
  const handleToggleDish = (dishId: string) => {
    if (selectedDishIds.includes(dishId)) {
      setSelectedDishIds(prev => prev.filter(id => id !== dishId))
    } else {
      if (selectedDishIds.length < 3) {
        setSelectedDishIds(prev => [...prev, dishId])
      }
    }
  }

  // 送出投票
  const handleConfirmVote = async () => {
    if (selectedDishIds.length !== 3 || !rawToken) return
    setSubmitting(true)
    setErrorMessage(null)

    try {
      await api.submitVote(rawToken, selectedDishIds)
      setShowConfirmModal(false)
      setVoteSuccess(true)

      // 施放聖誕紅綠金色彩帶與雪花
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#bb2528', '#165b33', '#f8b229', '#ffffff']
      })
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
        if (err.code === 'TOKEN_USED') {
          // 若卡片已使用，立即切換為已使用狀態
          setBallot(prev => prev ? { ...prev, state: 'used' } : null)
          setShowConfirmModal(false)
        }
      } else {
        setErrorMessage(i18n.common.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // 已選擇的菜色名稱清單（供確認視窗顯示）
  const selectedDishes = useMemo(() => {
    if (!ballot?.dishes) return []
    return ballot.dishes.filter(d => selectedDishIds.includes(d.id))
  }, [ballot?.dishes, selectedDishIds])

  // 1. 尚未帶入 token：手動輸入短碼畫面
  if (!rawToken) {
    return (
      <div className="min-h-screen bg-xmas-darkBg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900/90 border border-xmas-gold/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-xmas-green/30 border border-xmas-gold/40 rounded-full flex items-center justify-center text-3xl shadow-inner">
            🎄
          </div>
          <h1 className="text-xl font-bold text-xmas-gold tracking-wide mb-2">
            {i18n.common.title}
          </h1>
          <p className="text-slate-300 text-sm mb-6">
            {i18n.vote.manualInputTitle}
          </p>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <input
              type="text"
              value={inputToken}
              onChange={e => setInputToken(e.target.value.toUpperCase())}
              placeholder={i18n.vote.manualInputPlaceholder}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-xmas-gold focus:ring-1 focus:ring-xmas-gold rounded-xl text-center font-mono text-lg tracking-widest text-white uppercase placeholder:text-slate-500 transition-all outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!inputToken.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-xmas-red to-xmas-red-dark hover:from-xmas-red-hover hover:to-xmas-red text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>{i18n.vote.manualInputSubmit}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 2. 載入中狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-xmas-darkBg flex flex-col items-center justify-center p-4 text-center">
        <div className="animate-spin text-4xl mb-4">🎄</div>
        <p className="text-xmas-gold font-medium animate-pulse">{i18n.common.loading}</p>
      </div>
    )
  }

  // 3. 投票成功狀態
  if (voteSuccess) {
    return (
      <div className="min-h-screen bg-xmas-darkBg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900/90 border border-xmas-gold/40 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-xmas-green/30 border border-xmas-gold rounded-full flex items-center justify-center text-xmas-gold text-3xl">
            <Sparkles className="w-8 h-8 text-xmas-gold animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-xmas-gold mb-3">
            {i18n.vote.submitSuccess}
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            {i18n.vote.alreadyVotedTip}
          </p>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
            聖誕節快樂 Merry Christmas!
          </div>
        </div>
      </div>
    )
  }

  // 4. 狀態分流畫面（非 ready 狀態）
  if (ballot && ballot.state !== 'ready') {
    const stateMessages = i18n.ballotStates as Record<string, string>
    const message = stateMessages[ballot.state] || i18n.common.error

    return (
      <div className="min-h-screen bg-xmas-darkBg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900/90 border border-slate-700/60 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center text-3xl">
            {ballot.state === 'used' ? '🎁' : ballot.state === 'closed' ? '🔒' : '🔔'}
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            {ballot.title || i18n.common.title}
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-6">
            {message}
          </p>
        </div>
      </div>
    )
  }

  // 5. 投票進行中（ready 狀態）
  const dishes = ballot?.dishes || []
  const isSelectedMax = selectedDishIds.length >= 3

  return (
    <div className="min-h-screen bg-xmas-darkBg text-slate-100 pb-28">
      {/* 頂部固定狀態列 */}
      <header className="sticky top-0 z-30 bg-slate-900/95 border-b border-xmas-gold/20 backdrop-blur-md px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎄</span>
            <span className="font-bold text-sm tracking-wide text-xmas-gold">
              {ballot?.title || i18n.common.title}
            </span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
            isSelectedMax 
              ? 'bg-xmas-gold text-slate-950 border-xmas-gold shadow-[0_0_12px_rgba(248,178,41,0.5)]' 
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {i18n.vote.selectedCount(selectedDishIds.length)}
          </div>
        </div>
      </header>

      {/* 主內容區：菜色清單 */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          {dishes.map(dish => {
            const isSelected = selectedDishIds.includes(dish.id)
            const isDisabled = isSelectedMax && !isSelected

            return (
              <div
                key={dish.id}
                onClick={() => !isDisabled && handleToggleDish(dish.id)}
                className={`group relative p-4 rounded-xl border transition-all select-none cursor-pointer ${
                  isSelected
                    ? 'bg-xmas-green/20 border-xmas-gold shadow-[0_0_15px_rgba(22,91,51,0.4)]'
                    : isDisabled
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-40 cursor-not-allowed'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ChefHat className={`w-5 h-5 shrink-0 ${isSelected ? 'text-xmas-gold' : 'text-slate-500'}`} />
                    <span className={`text-base font-medium leading-snug ${isSelected ? 'text-white font-semibold' : 'text-slate-200'}`}>
                      {dish.name}
                    </span>
                  </div>

                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'bg-xmas-gold border-xmas-gold text-slate-950'
                      : 'border-slate-600 bg-slate-950/50'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-5 h-5 fill-xmas-gold text-slate-950" />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* 底部固定送出按鈕 */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md p-4 pb-safe">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={!isSelectedMax || submitting}
            className="w-full py-3.5 bg-gradient-to-r from-xmas-red to-xmas-red-dark hover:from-xmas-red-hover hover:to-xmas-red text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>{isSelectedMax ? '送出投票' : `請再挑選 ${3 - selectedDishIds.length} 道菜`}</span>
            {isSelectedMax && <Send className="w-4 h-4" />}
          </button>
        </div>
      </footer>

      {/* 確認投票對話盒 (Modal) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-xmas-gold/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-xmas-gold text-center">
              {i18n.vote.confirmTitle}
            </h3>
            <p className="text-xs text-slate-400 text-center">
              {i18n.vote.confirmPrompt}
            </p>

            <div className="bg-slate-950/80 rounded-xl p-3 divide-y divide-slate-800/80 border border-slate-800">
              {selectedDishes.map((dish, idx) => (
                <div key={dish.id} className="py-2.5 first:pt-1 last:pb-1 flex items-center gap-2 text-sm text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-xmas-green/30 text-xmas-gold text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-medium truncate">{dish.name}</span>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-red-950/40 border border-red-500/20 rounded-lg text-center text-xs text-red-300">
              ⚠️ 送出後無法修改，每張卡片限投一次
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={submitting}
                className="py-2.5 px-4 bg-gradient-to-r from-xmas-red to-xmas-red-dark hover:from-xmas-red-hover hover:to-xmas-red text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{i18n.common.submitting}</span>
                  </>
                ) : (
                  <span>{i18n.common.submit}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
