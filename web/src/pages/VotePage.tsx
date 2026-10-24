import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { Check, AlertCircle, Sparkles, ChefHat, Send, Search, X, Clipboard, ArrowRight } from 'lucide-react'
import { api, ApiException, type BallotResponse } from '../lib/api'
import { i18n } from '../i18n/zh-TW'
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
        {/* 背景散景光斑與斜向折射光束 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-[#7FCBB3]/25 via-[#4FAEC8]/20 to-[#ECE2A6]/25 blur-3xl pointer-events-none animate-bokeh" />
        <div className="refraction-slash top-24 -left-10 w-96 opacity-50" />
        <div className="refraction-slash bottom-32 -right-10 w-96 opacity-40" />

        {/* 邊界固定手寫草寫 (Pinyon Script) 水印 */}
        <div className="fixed left-4 top-1/3 marginal-script text-[#92C5B7]/25 text-4xl hidden md:block">
          culinary banquet
        </div>
        <div className="fixed right-4 bottom-1/3 marginal-script text-[#92C5B7]/25 text-4xl hidden md:block">
          pure transparency
        </div>

        {/* 頂部極簡品牌標識 */}
        <header className="max-w-md mx-auto w-full pt-4 flex justify-center">
          <BrandLogo size="md" />
        </header>

        {/* 中央 Hero 視窗與輸入表單 */}
        <main className="max-w-sm mx-auto w-full my-auto py-8 relative z-10 animate-reveal">
          <div className="bg-white/90 border border-[rgba(79,174,200,0.3)] p-7 shadow-soft backdrop-blur-md text-center relative" style={{ borderRadius: '2px' }}>
            {/* 中央 1:1 光斑寫真視窗 */}
            <div className="w-24 h-24 mx-auto mb-5 border border-[rgba(79,174,200,0.35)] bg-gradient-to-tr from-[#7FCBB3]/35 via-[#4FAEC8]/30 to-[#ECE2A6]/40 p-1 flex items-center justify-center relative shadow-inner overflow-hidden group" style={{ borderRadius: '2px' }}>
              <div className="absolute inset-1 bg-white/75 backdrop-blur-sm flex flex-col items-center justify-center">
                <span className="font-serif_jp text-sm tracking-widest text-[#2E7C94] font-medium">投票卡</span>
                <span className="font-display italic text-[9px] text-[#349282] uppercase mt-0.5">verification</span>
              </div>
            </div>

            <div className="relative inline-block mb-1">
              <div className="framing-corner-tl" />
              <div className="framing-corner-br" />
              <h1 className="text-xl sm:text-2xl font-serif_jp font-medium tracking-wider">
                <span className="text-[#349282]">聖</span>
                <span className="text-[#2E7C94]">誕</span>
                <span className="text-[#3E4347]">廚藝競賽</span>
              </h1>
            </div>
            <p className="font-display italic text-xs tracking-[0.2em] text-[#349282] uppercase mb-5">
              guest ballot access
            </p>

            <p className="text-[#8A9499] text-xs font-serif_jp leading-relaxed mb-6">
              請輸入專屬卡片上的 10 碼短碼，或直接貼上邀請連結
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={inputToken}
                  onChange={e => handleInputChange(e.target.value)}
                  placeholder="例如：8F3K9-N2A4B"
                  className="w-full px-4 py-3 bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)] focus:border-[#2E7C94] focus:ring-1 focus:ring-[#2E7C94]/20 text-center font-mono text-lg tracking-widest text-[#3E4347] uppercase placeholder:text-slate-400 outline-none transition-all"
                  style={{ borderRadius: '2px' }}
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#349282] hover:text-[#2E7C94] p-1 text-xs font-serif_jp flex items-center gap-0.5 bg-white border border-[rgba(79,174,200,0.25)] px-2 py-0.5"
                    style={{ borderRadius: '2px' }}
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
                className="w-full py-3.5 btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-widest"
              >
                <span>進入投票頁</span>
                <ArrowRight className="w-4 h-4 text-[#ECE2A6]" />
              </button>
            </form>
          </div>
        </main>

        <footer className="max-w-md mx-auto w-full text-center text-[10px] font-display italic text-[#8A9499] pb-2">
          FYCD AIRY EDITORIAL VOTING SYSTEM · 2026
        </footer>
      </div>
    )
  }

  // 2. 載入中狀態
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#7FCBB3]/30 via-[#4FAEC8]/25 to-[#ECE2A6]/30 blur-2xl animate-bokeh mb-4" />
        <div className="w-10 h-10 border-2 border-[rgba(79,174,200,0.25)] border-t-[#4FAEC8] animate-spin mb-4" style={{ borderRadius: '2px' }} />
        <p className="text-[#349282] font-serif_jp text-sm tracking-widest">{i18n.common.loading}</p>
        <span className="font-display italic text-xs text-[#92C5B7] mt-1">loading ballot...</span>
      </div>
    )
  }

  // 3. 投票成功狀態 (文學明信片紀念蓋印風格)
  if (voteSuccess) {
    return (
      <div className="min-h-screen bg-white text-[#3E4347] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-[#7FCBB3]/30 via-[#4FAEC8]/25 to-[#ECE2A6]/30 blur-3xl animate-bokeh pointer-events-none" />

        <div className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.4)] p-8 text-center shadow-soft relative z-10 animate-reveal" style={{ borderRadius: '2px' }}>
          <div className="w-16 h-16 mx-auto mb-4 border border-[rgba(79,174,200,0.35)] bg-gradient-to-tr from-[#7FCBB3]/20 to-[#4FAEC8]/25 flex items-center justify-center text-[#2E7C94]" style={{ borderRadius: '2px' }}>
            <Sparkles className="w-8 h-8 text-[#349282] animate-pulse" />
          </div>

          <div className="relative inline-block mb-2">
            <div className="framing-corner-tl" />
            <div className="framing-corner-br" />
            <h2 className="text-xl sm:text-2xl font-serif_jp font-medium text-[#2E7C94] tracking-wider">
              {i18n.vote.submitSuccess}
            </h2>
          </div>

          <p className="font-display italic text-xs tracking-widest text-[#349282] uppercase mb-4">
            ballot successfully sealed
          </p>
          <p className="text-[#8A9499] text-xs font-serif_jp leading-relaxed mb-6">
            您的 3 票已完成匿名封存，靜待大螢幕揭曉本屆冠軍！
          </p>

          <div className="p-3 bg-[#F9FBFA] border border-[rgba(79,174,200,0.25)] text-xs text-[#349282] font-serif_jp flex items-center justify-center gap-2" style={{ borderRadius: '2px' }}>
            <span className="w-1.5 h-1.5 bg-[#7FCBB3]" style={{ borderRadius: '2px' }} />
            <span>感謝您的熱情參與 · 期待榮耀揭曉</span>
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
        <div className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.3)] p-8 text-center shadow-soft relative z-10" style={{ borderRadius: '2px' }}>
          <div className="w-14 h-14 mx-auto mb-4 bg-[#F9FBFA] border border-[rgba(79,174,200,0.25)] flex items-center justify-center text-2xl text-[#349282]" style={{ borderRadius: '2px' }}>
            {ballot.state === 'used' ? '🔖' : ballot.state === 'closed' ? '🔒' : '⏳'}
          </div>
          <h2 className="text-lg font-serif_jp font-medium text-[#2E7C94] mb-2 tracking-wide">
            {ballot.title || i18n.common.title}
          </h2>
          <p className="text-[#8A9499] text-sm font-serif_jp leading-relaxed mb-4">
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
  const isSelectedMax = selectedDishIds.length >= 3

  return (
    <div className="min-h-screen bg-white text-[#3E4347] pb-32 relative">
      {/* 頂部柔和光斑底圖 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-48 bg-gradient-to-b from-[#F0F7F5] to-transparent pointer-events-none -z-10" />

      {/* 邊緣固定手寫草寫 (Pinyon Script) 水印 */}
      <div className="fixed left-3 top-1/4 marginal-script text-[#92C5B7]/20 text-4xl hidden lg:block">
        culinary banquet
      </div>
      <div className="fixed right-3 bottom-1/4 marginal-script text-[#92C5B7]/20 text-4xl hidden lg:block">
        delicate memory
      </div>

      {/* 頂部固定導航與進度列 */}
      <header className="sticky top-0 z-30 glass-surface border-b border-[rgba(79,174,200,0.25)] px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <BrandLogo size="sm" />

          {/* 3 格進度微光指示寶石 */}
          <div className="flex items-center gap-1.5 bg-[#F9FBFA] border border-[rgba(79,174,200,0.3)] px-2.5 py-1" style={{ borderRadius: '2px' }}>
            <span className="font-serif_jp text-[11px] text-[#8A9499] mr-1">已選</span>
            {[0, 1, 2].map(slotIdx => {
              const isFilled = selectedDishIds.length > slotIdx
              return (
                <div
                  key={slotIdx}
                  className={`w-3.5 h-3.5 flex items-center justify-center text-[9px] transition-all duration-300 ${
                    isFilled
                      ? 'bg-[#4FAEC8] text-white shadow-sm'
                      : 'border border-[rgba(79,174,200,0.35)] bg-white text-slate-300'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  {isFilled ? '✦' : slotIdx + 1}
                </div>
              )
            })}
            <span className="font-mono text-xs font-semibold text-[#2E7C94] ml-1">
              {selectedDishIds.length}/3
            </span>
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* 標題與簡介 */}
        <div className="text-center py-2 relative">
          <div className="relative inline-block mb-1">
            <div className="framing-corner-tl" />
            <div className="framing-corner-br" />
            <h2 className="text-lg font-serif_jp text-[#2E7C94] font-medium tracking-wider">
              挑選您最讚賞的 3 道佳餚
            </h2>
          </div>
          <p className="font-display italic text-[11px] tracking-[0.2em] text-[#92C5B7]">
            select exactly three distinctive culinary works
          </p>
        </div>

        {/* 菜色搜尋與快篩輸入框 (提升操作便捷性) */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={dishSearch}
            onChange={e => setDishSearch(e.target.value)}
            placeholder="搜尋菜名關鍵字..."
            className="w-full pl-9 pr-8 py-2 bg-[#F9FBFA] border border-[rgba(79,174,200,0.25)] focus:border-[#4FAEC8] text-xs font-serif_jp text-[#3E4347] placeholder:text-slate-400 outline-none transition-all"
            style={{ borderRadius: '2px' }}
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
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp flex items-center gap-2" style={{ borderRadius: '2px' }}>
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 菜色卡片清單 (Prism Story Card) */}
        <div className="space-y-2.5">
          {filteredDishes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-serif_jp bg-[#F9FBFA] border border-[rgba(79,174,200,0.2)]" style={{ borderRadius: '2px' }}>
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
                  className={`group relative p-4 border transition-all duration-300 select-none cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#EDF8F4] to-[#E8F5F8] border-[#2E7C94] shadow-prism ring-1 ring-[#2E7C94]/20'
                      : isDisabled
                      ? 'bg-[#F9FBFA]/60 border-slate-200/50 opacity-40 cursor-not-allowed'
                      : 'bg-white border-[rgba(79,174,200,0.25)] hover:border-[#4FAEC8] hover:shadow-soft active:scale-[0.99]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  {/* 選取時右上角 45 度微光色條 Badge */}
                  {isSelected && <div className="badge-slash" />}

                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-display italic text-xs text-[#92C5B7] w-5 text-center shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <ChefHat className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-[#2E7C94]' : 'text-[#7FCBB3]'}`} />
                      <span className={`text-sm sm:text-base font-serif_jp leading-snug transition-colors truncate ${
                        isSelected ? 'text-[#2E7C94] font-semibold' : 'text-[#3E4347]'
                      }`}>
                        {dish.name}
                      </span>
                    </div>

                    {/* 選取狀態指示方框 */}
                    <div className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#2E7C94] border-[#2E7C94] text-white shadow-sm'
                        : 'border-[rgba(79,174,200,0.4)] bg-white'
                    }`} style={{ borderRadius: '2px' }}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* 底部固定懸浮送出欄 (毛玻璃濾鏡，完整支援 iOS Safe Area) */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-30 glass-surface border-t border-[rgba(79,174,200,0.25)] p-4 shadow-[0_-4px_20px_rgba(79,174,200,0.08)]"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={!isSelectedMax || submitting}
            className="w-full py-3.5 btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base tracking-widest font-medium"
          >
            <span>{isSelectedMax ? '送出投票確認' : `請再挑選 ${3 - selectedDishIds.length} 道佳餚`}</span>
            {isSelectedMax && <Send className="w-4 h-4 text-[#ECE2A6]" />}
          </button>
        </div>
      </footer>

      {/* 確認投票對話盒 (Modal，嚴格 2px 微圓角文學質地) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4347]/45 backdrop-blur-sm animate-reveal">
          <div className="w-full max-w-sm bg-white border border-[rgba(79,174,200,0.45)] p-6 shadow-prism space-y-4" style={{ borderRadius: '2px' }}>
            <div className="text-center">
              <div className="relative inline-block">
                <div className="framing-corner-tl" />
                <div className="framing-corner-br" />
                <h3 className="text-lg font-serif_jp font-medium text-[#2E7C94] tracking-wide">
                  {i18n.vote.confirmTitle}
                </h3>
              </div>
              <p className="text-xs font-serif_jp text-[#8A9499] mt-2">
                請確認您所挑選的 3 道佳餚：
              </p>
            </div>

            <div className="bg-[#F9FBFA] p-3 divide-y divide-[rgba(79,174,200,0.15)] border border-[rgba(79,174,200,0.25)]" style={{ borderRadius: '2px' }}>
              {selectedDishes.map((dish, idx) => (
                <div key={dish.id} className="py-2.5 first:pt-1 last:pb-1 flex items-center gap-2.5 text-sm text-[#3E4347] font-serif_jp">
                  <span className="w-5 h-5 bg-[#EDF8F4] text-[#349282] border border-[rgba(79,174,200,0.3)] text-xs flex items-center justify-center font-display" style={{ borderRadius: '2px' }}>
                    {idx + 1}
                  </span>
                  <span className="font-medium truncate">{dish.name}</span>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-[#EDF8F4] border border-[rgba(79,174,200,0.3)] text-center text-xs text-[#2E7C94] font-serif_jp" style={{ borderRadius: '2px' }}>
              ✦ 送出後將自動封存，一張卡片限投一次
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#3E4347] text-xs font-serif_jp transition-all"
                style={{ borderRadius: '2px' }}
              >
                返回修改
              </button>
              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={submitting}
                className="py-2.5 px-4 btn-primary text-xs font-serif_jp flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white animate-spin" style={{ borderRadius: '2px' }} />
                    <span>封存中...</span>
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
