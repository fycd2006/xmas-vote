import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Check, AlertCircle, Sparkles, ChefHat, Send, Search, X, Clipboard, ArrowRight } from 'lucide-react'
import { api, ApiException, type BallotResponse } from '../lib/api'
import { i18n } from '../i18n/zh-TW'
import { audio } from '../lib/audio'
import BrandLogo from '../components/BrandLogo'

export default function VotePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawToken = searchParams.get('t') || ''

  const [inputToken, setInputToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [ballot, setBallot] = useState<BallotResponse | null>(null)
  const [selectedDishIds, setSelectedDishIds] = useState<string[]>([])
  const [dishSearch, setDishSearch] = useState('')
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

  // 短碼輸入處理（支援自動擷取網址中的 token 與格式化）
  const handleInputChange = (val: string) => {
    let clean = val.trim()
    // 若來賓貼上完整 URL (e.g. https://.../vote?t=ABCDE12345)
    if (clean.includes('?t=')) {
      const match = clean.match(/[?&]t=([A-Za-z0-9]+)/)
      if (match && match[1]) {
        clean = match[1]
      }
    }
    // 移除非字母與數字字元並轉大寫
    const alphanumeric = clean.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (alphanumeric.length > 5) {
      setInputToken(`${alphanumeric.slice(0, 5)}-${alphanumeric.slice(5, 10)}`)
    } else {
      setInputToken(alphanumeric)
    }
  }

  // 剪貼簿一鍵貼上
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) handleInputChange(text)
    } catch {
      // 瀏覽器若未授權剪貼簿則靜默忽略
    }
  }

  // 手動輸入短碼送出
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanToken = inputToken.replace(/[-\s]/g, '').trim()
    if (!cleanToken) return
    setSearchParams({ t: cleanToken })
  }

  // 點選/取消點選菜色
  const handleToggleDish = (dishId: string) => {
    audio.playChime()
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

      audio.playConfettiPop()
      audio.playChime()

      // 施放清新彩帶（晴空藍、薄荷綠、晨曦淡檸黃、耀光白、青黛綠）
      confetti({
        particleCount: 120,
        spread: 80,
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

  // 菜色即時搜尋過濾
  const filteredDishes = useMemo(() => {
    if (!ballot?.dishes) return []
    const q = dishSearch.trim().toLowerCase()
    if (!q) return ballot.dishes
    return ballot.dishes.filter(d => d.name.toLowerCase().includes(q))
  }, [ballot?.dishes, dishSearch])

  // 1. 尚未帶入 token：手動輸入短碼畫面
  if (!rawToken) {
    return (
      <div className="min-h-screen bg-white text-[#3E4347] flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none">
        {/* 背景柔和散景光斑 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-[#7FCBB3]/20 via-[#4FAEC8]/15 to-[#ECE2A6]/20 blur-3xl pointer-events-none" />

        {/* 頂部極簡品牌標識 */}
        <header className="max-w-md mx-auto w-full pt-4 flex justify-center">
          <BrandLogo size="md" />
        </header>

        {/* 中央 Hero 視窗與輸入表單 */}
        <main className="max-w-sm mx-auto w-full my-auto py-8 relative z-10 animate-reveal">
          <div className="bg-white/95 rounded-xl p-8 shadow-soft text-center relative border border-slate-100">
            {/* 中央簡約圖標 */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-tr from-[#7FCBB3]/20 via-[#4FAEC8]/15 to-[#ECE2A6]/30 flex items-center justify-center text-[#2E7C94] shadow-sm">
              <Sparkles className="w-8 h-8 text-[#349282]" />
            </div>

            <h1 className="text-xl sm:text-2xl font-serif_jp font-bold text-[#2E7C94] tracking-wide mb-1">
              聖誕趴廚藝競賽
            </h1>
            <p className="text-xs text-[#349282] font-medium mb-5">
              北科崇德青年社 · NTUT Chong De Young Club
            </p>

            <p className="text-[#8A9499] text-xs font-serif_jp leading-relaxed mb-6">
              請輸入專屬卡片上的 10 碼短碼，或直接點選卡片 QR Code 進入
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={inputToken}
                  onChange={e => handleInputChange(e.target.value)}
                  placeholder="例如：8F3K9-N2A4B"
                  className="w-full px-4 py-3 bg-[#F9FBFA] rounded-lg border border-[rgba(79,174,200,0.25)] focus:border-[#2E7C94] focus:ring-2 focus:ring-[#2E7C94]/10 text-center font-mono text-lg tracking-widest text-[#3E4347] uppercase placeholder:text-slate-400 outline-none transition-all"
                  autoFocus
                />
                {inputToken ? (
                  <button
                    type="button"
                    onClick={() => setInputToken('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title="清除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#349282] hover:text-[#2E7C94] p-1 text-xs font-serif_jp flex items-center gap-0.5 bg-white rounded-md px-2 py-0.5 shadow-sm border border-slate-100"
                    title="貼上剪貼簿"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>貼上</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputToken.trim()}
                className="w-full py-3.5 btn-primary rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-widest font-medium shadow-sm"
              >
                <span>進入投票頁</span>
                <ArrowRight className="w-4 h-4 text-[#ECE2A6]" />
              </button>
            </form>
          </div>
        </main>

        <footer className="max-w-md mx-auto w-full text-center text-xs text-[#8A9499] pb-3 font-serif_jp">
          聖誕趴廚藝競賽 · 北科崇德青年社 (NTUT Chong De Young Club)
        </footer>
      </div>
    )
  }

  // 2. 載入中狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-[#349282] rounded-full animate-spin mb-4" />
        <p className="text-[#349282] font-serif_jp text-sm tracking-widest">{i18n.common.loading}</p>
      </div>
    )
  }

  // 3. 投票成功狀態
  if (voteSuccess) {
    return (
      <div className="min-h-screen bg-white text-[#3E4347] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-sm bg-white rounded-xl p-8 text-center shadow-soft relative z-10 border border-slate-100 animate-reveal">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#EDF8F4] flex items-center justify-center text-[#2E7C94] shadow-sm">
            <Sparkles className="w-8 h-8 text-[#349282]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-serif_jp font-bold text-[#2E7C94] tracking-wide mb-2">
            {i18n.vote.submitSuccess}
          </h2>

          <p className="text-[#8A9499] text-xs font-serif_jp leading-relaxed mb-6">
            您的 3 票已完成匿名送出，靜待大螢幕揭曉本屆冠軍！
          </p>

          <div className="p-3 bg-[#F9FBFA] rounded-lg text-xs text-[#349282] font-serif_jp flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7FCBB3]" />
            <span>北科崇德青年社 · 感謝您的熱情參與</span>
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
        <div className="w-full max-w-sm bg-white rounded-xl p-8 text-center shadow-soft relative z-10 border border-slate-100">
          <div className="w-14 h-14 mx-auto mb-4 bg-[#F9FBFA] rounded-xl flex items-center justify-center text-2xl text-[#349282] shadow-sm">
            {ballot.state === 'used' ? '🔖' : ballot.state === 'closed' ? '🔒' : '⏳'}
          </div>
          <h2 className="text-lg font-serif_jp font-bold text-[#2E7C94] mb-2 tracking-wide">
            {ballot.title || i18n.common.title}
          </h2>
          <p className="text-[#8A9499] text-sm font-serif_jp leading-relaxed mb-4">
            {message}
          </p>
          <p className="text-xs text-[#349282] font-medium">
            北科崇德青年社 · NTUT Chong De Young Club
          </p>
        </div>
      </div>
    )
  }

  // 5. 投票進行中（ready 狀態）
  const isSelectedMax = selectedDishIds.length >= 3

  return (
    <div className="min-h-screen bg-white text-[#3E4347] pb-32 relative">
      {/* 頂部柔和背景 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-40 bg-gradient-to-b from-[#F0F7F5] to-transparent pointer-events-none -z-10" />

      {/* 頂部固定導航與進度列 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <BrandLogo size="sm" />

          {/* 3 格進度微光指示 */}
          <div className="flex items-center gap-1.5 bg-[#EDF8F4] px-3 py-1 rounded-full shadow-sm">
            <span className="font-serif_jp text-xs text-[#349282] font-medium">已選</span>
            <span className="font-mono text-sm font-bold text-[#2E7C94]">
              {selectedDishIds.length} / 3
            </span>
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* 標題與簡介 */}
        <div className="text-center py-2">
          <h2 className="text-lg font-serif_jp text-[#2E7C94] font-bold tracking-wide">
            挑選您最讚賞的 3 道佳餚
          </h2>
          <p className="text-xs text-[#8A9499] font-serif_jp mt-1">
            每張卡片限投一次，請投出心目中最棒的 3 道菜色
          </p>
        </div>

        {/* 菜色搜尋與快篩輸入框 */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={dishSearch}
            onChange={e => setDishSearch(e.target.value)}
            placeholder="搜尋菜名關鍵字..."
            className="w-full pl-9 pr-8 py-2.5 bg-[#F9FBFA] rounded-lg border border-slate-200 focus:border-[#4FAEC8] focus:bg-white text-xs font-serif_jp text-[#3E4347] placeholder:text-slate-400 outline-none transition-all"
          />
          {dishSearch && (
            <button
              onClick={() => setDishSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 rounded-lg text-red-600 text-xs font-serif_jp flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 菜色卡片清單 */}
        <div className="space-y-2.5">
          {filteredDishes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-serif_jp bg-[#F9FBFA] rounded-xl border border-slate-100">
              無相符的菜色名稱
            </div>
          ) : (
            filteredDishes.map((dish, idx) => {
              const isSelected = selectedDishIds.includes(dish.id)
              const isDisabled = isSelectedMax && !isSelected

              return (
                <div
                  key={dish.id}
                  onClick={() => !isDisabled && handleToggleDish(dish.id)}
                  className={`group relative p-3.5 rounded-xl border transition-all duration-200 select-none cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-[#EDF8F4] border-[#349282] shadow-sm'
                      : isDisabled
                      ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                      : 'bg-white border-slate-100 hover:border-[#7FCBB3] hover:shadow-soft active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-[#92C5B7] w-5 text-center shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <ChefHat className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-[#2E7C94]' : 'text-[#7FCBB3]'}`} />
                      <span className={`text-sm sm:text-base font-serif_jp leading-snug transition-colors truncate ${
                        isSelected ? 'text-[#2E7C94] font-bold' : 'text-[#3E4347]'
                      }`}>
                        {dish.name}
                      </span>
                    </div>

                    {/* 選取狀態圓形指示器 */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#2E7C94] text-white shadow-sm'
                        : 'border border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* 底部固定懸浮送出欄 */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 p-4 shadow-lg"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={!isSelectedMax || submitting}
            className="w-full py-3.5 btn-primary rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base tracking-widest font-medium shadow-sm"
          >
            <span>{isSelectedMax ? '送出投票確認' : `請再挑選 ${3 - selectedDishIds.length} 道佳餚`}</span>
            {isSelectedMax && <Send className="w-4 h-4 text-[#ECE2A6]" />}
          </button>
        </div>
      </footer>

      {/* 確認投票對話盒 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/40 backdrop-blur-sm animate-reveal">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl space-y-4 border border-slate-100">
            <div className="text-center">
              <h3 className="text-lg font-serif_jp font-bold text-[#2E7C94] tracking-wide">
                {i18n.vote.confirmTitle}
              </h3>
              <p className="text-xs font-serif_jp text-[#8A9499] mt-1.5">
                請確認您所挑選的 3 道佳餚：
              </p>
            </div>

            <div className="bg-[#F9FBFA] rounded-xl p-3 divide-y divide-slate-100">
              {selectedDishes.map((dish, idx) => (
                <div key={dish.id} className="py-2.5 first:pt-1 last:pb-1 flex items-center gap-2.5 text-sm text-[#3E4347] font-serif_jp">
                  <span className="w-5 h-5 bg-[#EDF8F4] text-[#349282] rounded-full text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-medium truncate">{dish.name}</span>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-[#EDF8F4] rounded-lg text-center text-xs text-[#2E7C94] font-serif_jp font-medium">
              ✦ 送出後無法修改，一張卡片限投一次
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp rounded-lg transition-all"
              >
                返回修改
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={submitting}
                className="py-2.5 px-4 btn-primary text-xs font-serif_jp rounded-lg flex items-center justify-center gap-1.5 font-medium shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>送出中...</span>
                  </>
                ) : (
                  <span>確認送出</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
