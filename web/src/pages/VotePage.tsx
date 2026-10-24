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

      // 施放空氣感日系清新彩帶（晴空藍、薄荷綠、晨曦淡檸黃、耀光白、青黛綠）
      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#4FAEC8', '#7FCBB3', '#ECE2A6', '#FFFFFF', '#349282']
      })
    } catch (err) {
      if (err instanceof ApiException) {
        setErrorMessage(err.message)
        if (err.code === 'TOKEN_USED') {
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
      <div className="min-h-screen bg-white text-[#3E4347] flex items-center justify-center p-4 relative overflow-hidden">
        {/* 背景光斑與幾何切面 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-[#7FCBB3]/25 via-[#4FAEC8]/20 to-[#ECE2A6]/30 blur-3xl pointer-events-none animate-bokeh" />
        <div className="refraction-slash top-24 -left-10 w-96 opacity-60" />
        <div className="refraction-slash bottom-32 -right-10 w-96 opacity-50" />

        {/* 邊界縱向手寫花體 */}
        <div className="fixed left-4 top-1/3 marginal-script text-[#92C5B7]/25 text-3xl hidden md:block">
          culinary banquet
        </div>
        <div className="fixed right-4 bottom-1/3 marginal-script text-[#92C5B7]/25 text-3xl hidden md:block">
          airy transparency
        </div>

        <div className="w-full max-w-sm bg-white/90 border border-[#7FCBB3]/35 rounded-2xl p-7 shadow-[0_12px_40px_rgba(79,174,200,0.12)] backdrop-blur-md text-center relative z-10">
          {/* 中央方框散景寫真視窗 */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-[#7FCBB3]/40 via-[#4FAEC8]/35 to-[#ECE2A6]/45 p-1 flex items-center justify-center shadow-inner relative overflow-hidden group">
            <div className="absolute inset-1 rounded-xl bg-white/70 backdrop-blur-sm flex items-center justify-center text-3xl">
              <span className="text-[#349282] font-serif">🍽️</span>
            </div>
          </div>

          <div className="relative inline-block mb-1">
            <div className="framing-corner-tl" />
            <div className="framing-corner-br" />
            <h1 className="text-xl sm:text-2xl font-serif font-medium tracking-wider">
              <span className="text-[#349282]">聖</span>
              <span className="text-[#2E7C94]">誕</span>
              <span className="text-[#3E4347]">廚藝競賽</span>
            </h1>
          </div>
          <p className="font-display italic text-[11px] tracking-[0.2em] text-[#349282]/80 uppercase mb-5">
            guest ballot verification
          </p>

          <p className="text-[#61676C] text-xs font-serif leading-relaxed mb-6">
            {i18n.vote.manualInputTitle}
          </p>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={inputToken}
                onChange={e => setInputToken(e.target.value.toUpperCase())}
                placeholder={i18n.vote.manualInputPlaceholder}
                className="w-full px-4 py-3 bg-[#F9FCFB] border border-[#7FCBB3]/45 focus:border-[#2E7C94] focus:ring-2 focus:ring-[#2E7C94]/20 rounded-xl text-center font-mono text-lg tracking-widest text-[#3E4347] uppercase placeholder:text-slate-400 transition-all outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!inputToken.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-[#349282] to-[#2E7C94] hover:opacity-95 text-white font-serif tracking-wider font-medium rounded-xl shadow-[0_4px_16px_rgba(46,124,148,0.25)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>{i18n.vote.manualInputSubmit}</span>
              <Send className="w-4 h-4 text-[#ECE2A6]" />
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 2. 載入中狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#7FCBB3]/30 via-[#4FAEC8]/25 to-[#ECE2A6]/30 blur-2xl animate-bokeh mb-4" />
        <div className="w-12 h-12 rounded-full border-2 border-[#7FCBB3]/40 border-t-[#2E7C94] animate-spin mb-4" />
        <p className="text-[#349282] font-serif text-sm tracking-widest">{i18n.common.loading}</p>
        <span className="font-display italic text-xs text-[#92C5B7] mt-1">loading ballot...</span>
      </div>
    )
  }

  // 3. 投票成功狀態
  if (voteSuccess) {
    return (
      <div className="min-h-screen bg-white text-[#3E4347] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-[#7FCBB3]/30 via-[#4FAEC8]/25 to-[#ECE2A6]/30 blur-3xl animate-bokeh pointer-events-none" />
        
        <div className="w-full max-w-sm bg-white/95 border border-[#7FCBB3]/40 rounded-2xl p-7 text-center shadow-[0_16px_40px_rgba(79,174,200,0.15)] backdrop-blur-md relative z-10">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-tr from-[#7FCBB3]/20 to-[#4FAEC8]/25 border border-[#7FCBB3]/40 rounded-full flex items-center justify-center text-[#2E7C94] shadow-sm">
            <Sparkles className="w-8 h-8 text-[#349282] animate-pulse" />
          </div>

          <div className="relative inline-block mb-2">
            <div className="framing-corner-tl" />
            <div className="framing-corner-br" />
            <h2 className="text-xl sm:text-2xl font-serif font-medium text-[#2E7C94] tracking-wider">
              {i18n.vote.submitSuccess}
            </h2>
          </div>

          <p className="font-display italic text-xs tracking-widest text-[#349282] uppercase mb-4">
            ballot successfully cast
          </p>
          <p className="text-[#61676C] text-xs font-serif leading-relaxed mb-6">
            {i18n.vote.alreadyVotedTip}
          </p>

          <div className="p-3 bg-[#F9FCFB] rounded-xl border border-[#7FCBB3]/25 text-xs text-[#349282] font-serif flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7FCBB3]" />
            <span>感謝您的熱情參與 · 期待揭曉</span>
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
      <div className="min-h-screen bg-white text-[#3E4347] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-sm bg-white border border-[#7FCBB3]/30 rounded-2xl p-7 text-center shadow-[0_10px_30px_rgba(0,0,0,0.06)] relative z-10">
          <div className="w-14 h-14 mx-auto mb-4 bg-[#F0F7F5] border border-[#7FCBB3]/30 rounded-full flex items-center justify-center text-2xl text-[#349282]">
            {ballot.state === 'used' ? '🔖' : ballot.state === 'closed' ? '🔒' : '⏳'}
          </div>
          <h2 className="text-lg font-serif font-medium text-[#2E7C94] mb-2 tracking-wide">
            {ballot.title || i18n.common.title}
          </h2>
          <p className="text-[#61676C] text-sm font-serif leading-relaxed mb-4">
            {message}
          </p>
          <p className="font-display italic text-xs text-[#92C5B7]">
            {ballot.state === 'used' ? 'ticket already redeemed' : 'voting window closed'}
          </p>
        </div>
      </div>
    )
  }

  // 5. 投票進行中（ready 狀態）
  const dishes = ballot?.dishes || []
  const isSelectedMax = selectedDishIds.length >= 3

  return (
    <div className="min-h-screen bg-white text-[#3E4347] pb-28 relative">
      {/* 頂部柔和光斑底圖 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-56 bg-gradient-to-b from-[#EDF8F4] to-transparent pointer-events-none -z-10" />

      {/* 邊緣縱向花體水印 */}
      <div className="fixed left-3 top-1/4 marginal-script text-[#92C5B7]/20 text-3xl hidden lg:block">
        culinary memory
      </div>
      <div className="fixed right-3 bottom-1/4 marginal-script text-[#92C5B7]/20 text-3xl hidden lg:block">
        airy breeze
      </div>

      {/* 頂部固定狀態列 */}
      <header className="sticky top-0 z-30 bg-white/90 border-b border-[#7FCBB3]/25 backdrop-blur-md px-4 py-3 shadow-[0_2px_12px_rgba(79,174,200,0.06)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base text-[#349282]">✦</span>
            <span className="font-serif font-medium text-sm tracking-wider">
              <span className="text-[#349282]">聖</span>
              <span className="text-[#2E7C94]">誕</span>
              <span className="text-[#3E4347]">廚藝競賽</span>
            </span>
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-serif transition-all flex items-center gap-1.5 ${
            isSelectedMax 
              ? 'bg-gradient-to-r from-[#349282] to-[#2E7C94] text-white shadow-[0_2px_8px_rgba(46,124,148,0.3)]' 
              : 'bg-[#F0F7F5] text-[#349282] border border-[#7FCBB3]/40'
          }`}>
            <span className="font-mono">{selectedDishIds.length}</span>
            <span>/ 3 票</span>
          </div>
        </div>
      </header>

      {/* 主內容區：菜色清單 */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {/* 引言與導覽裝幀區 */}
        <div className="mb-4 text-center py-2">
          <h2 className="text-lg font-serif text-[#2E7C94] font-medium tracking-wider mb-1">
            請選出心目中最棒的 3 道菜色
          </h2>
          <p className="font-display italic text-[11px] tracking-[0.18em] text-[#92C5B7]">
            select exactly three distinctive culinary works
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-serif flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          {dishes.map((dish, idx) => {
            const isSelected = selectedDishIds.includes(dish.id)
            const isDisabled = isSelectedMax && !isSelected

            return (
              <div
                key={dish.id}
                onClick={() => !isDisabled && handleToggleDish(dish.id)}
                className={`group relative p-4 rounded-xl border transition-all select-none cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#EDF8F4] to-[#E8F5F8] border-[#2E7C94] shadow-[0_4px_16px_rgba(46,124,148,0.12)] ring-1 ring-[#2E7C94]/20'
                    : isDisabled
                    ? 'bg-[#F9FCFB]/60 border-slate-200/50 opacity-40 cursor-not-allowed'
                    : 'bg-[#F9FCFB] border-[#7FCBB3]/30 hover:border-[#4FAEC8]/60 hover:bg-white active:scale-[0.99] shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-display italic text-xs text-[#92C5B7] w-5 text-center">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <ChefHat className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-[#2E7C94]' : 'text-[#7FCBB3]'}`} />
                    <span className={`text-sm sm:text-base font-serif leading-snug transition-colors ${isSelected ? 'text-[#2E7C94] font-semibold' : 'text-[#3E4347]'}`}>
                      {dish.name}
                    </span>
                  </div>

                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'bg-[#2E7C94] border-[#2E7C94] text-white shadow-sm'
                      : 'border-[#92C5B7]/50 bg-white'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 fill-[#2E7C94] text-white" />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* 底部固定送出按鈕 */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 border-t border-[#7FCBB3]/25 backdrop-blur-md p-4 pb-safe shadow-[0_-4px_20px_rgba(79,174,200,0.08)]">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={!isSelectedMax || submitting}
            className="w-full py-3.5 bg-gradient-to-r from-[#349282] to-[#2E7C94] hover:opacity-95 text-white text-sm sm:text-base font-serif tracking-widest font-medium rounded-xl shadow-[0_4px_14px_rgba(46,124,148,0.25)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>{isSelectedMax ? '送出投票' : `請再挑選 ${3 - selectedDishIds.length} 道佳餚`}</span>
            {isSelectedMax && <Send className="w-4 h-4 text-[#ECE2A6]" />}
          </button>
        </div>
      </footer>

      {/* 確認投票對話盒 (Modal) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-[#7FCBB3]/45 rounded-2xl p-6 shadow-[0_20px_60px_rgba(46,124,148,0.25)] space-y-4">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="framing-corner-tl" />
                <div className="framing-corner-br" />
                <h3 className="text-lg font-serif font-medium text-[#2E7C94] tracking-wide">
                  {i18n.vote.confirmTitle}
                </h3>
              </div>
              <p className="text-xs font-serif text-[#61676C] mt-2">
                {i18n.vote.confirmPrompt}
              </p>
            </div>

            <div className="bg-[#F9FCFB] rounded-xl p-3 divide-y divide-[#7FCBB3]/20 border border-[#7FCBB3]/30">
              {selectedDishes.map((dish, idx) => (
                <div key={dish.id} className="py-2.5 first:pt-1 last:pb-1 flex items-center gap-2 text-sm text-[#3E4347] font-serif">
                  <span className="w-5 h-5 rounded-full bg-[#EDF8F4] text-[#349282] border border-[#7FCBB3]/40 text-xs flex items-center justify-center font-display">
                    {idx + 1}
                  </span>
                  <span className="font-medium truncate">{dish.name}</span>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-[#EDF8F4] border border-[#7FCBB3]/30 rounded-lg text-center text-xs text-[#2E7C94] font-serif">
              ✦ 送出後無法更改，一張卡片限投一次
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs sm:text-sm font-serif rounded-xl transition-all"
              >
                {i18n.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={submitting}
                className="py-2.5 px-4 bg-gradient-to-r from-[#349282] to-[#2E7C94] hover:opacity-95 text-white text-xs sm:text-sm font-serif font-medium rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
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
