import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import { Sparkles, Trophy, Maximize, Minimize, Award, ChefHat, ChevronLeft, ChevronRight } from 'lucide-react'
import { api, type ResultsResponse } from '../lib/api'
import { i18n } from '../i18n/zh-TW'
import BrandLogo from '../components/BrandLogo'

export default function ResultsPage() {
  const [data, setData] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<'group' | 'dish'>('group')
  const confettiFiredRef = useRef(false)

  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#4FAEC8', '#7FCBB3', '#ECE2A6', '#FFFFFF', '#349282']
    })
  }

  const fetchResults = async () => {
    try {
      const res = await api.getResults()
      setData(res)

      // 當切換為已揭曉時，自動施放盛大金色與薄荷藍冠軍彩帶
      if (!res.hidden && !confettiFiredRef.current) {
        confettiFiredRef.current = true
        fireConfetti()
      }
    } catch {
      // 輪詢失敗靜默重試
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
    // 每 4 秒輪詢一次 GET /api/results
    const interval = setInterval(fetchResults, 4000)
    return () => clearInterval(interval)
  }, [])

  // 鍵盤左右方向鍵快速切換投影分頁
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setActiveTab(prev => (prev === 'group' ? 'dish' : 'group'))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setActiveTab(prev => (prev === 'group' ? 'dish' : 'group'))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 全螢幕投影切換
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="w-12 h-12 border-2 border-slate-200 border-t-[#349282] rounded-full animate-spin mb-4" />
        <p className="text-[#349282] font-serif_jp text-sm tracking-widest">{i18n.common.loading}</p>
      </div>
    )
  }

  const votedCount = data?.votedCount ?? 0
  const totalTokens = data?.totalTokens ?? 0
  const percentage = totalTokens > 0 ? Math.round((votedCount / totalTokens) * 100) : 0
  const isHidden = data?.hidden ?? true
  const results = data?.results ?? []
  const groups = data?.groups ?? []

  // 篩選第 1 名冠軍（含同分同名次）
  const championDishes = results.filter(r => r.rank === 1)
  const championGroups = groups.filter(g => g.rank === 1)

  return (
    <div className="min-h-screen bg-white text-[#3E4347] flex flex-col justify-between p-6 sm:p-12 select-none relative overflow-hidden">
      {/* 散景光斑背景 */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-tr from-[#7FCBB3]/15 via-[#4FAEC8]/15 to-[#ECE2A6]/20 blur-3xl pointer-events-none" />

      {/* 頂部 Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-slate-100 pb-5 relative z-10">
        <BrandLogo size="lg" />

        <div className="flex items-center gap-3">
          {/* 即時連線指標 */}
          <div className="flex items-center gap-2 text-xs text-[#349282] font-serif_jp font-medium bg-[#EDF8F4] px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#349282] animate-pulse" />
            <span>即時連線中</span>
          </div>

          {/* 全螢幕投影切換按鈕 */}
          <button
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1.5 text-xs text-[#2E7C94] font-serif_jp font-medium bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg transition-all shadow-sm"
            title="投影全螢幕模式"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? '退出全螢幕' : '全螢幕投影'}</span>
          </button>
        </div>
      </header>

      {/* 主畫面 */}
      <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center py-6 sm:py-10 relative z-10">
        {isHidden ? (
          // 狀態 A：未揭曉狀態 (等待觀景窗)
          <div className="max-w-xl mx-auto w-full text-center space-y-8 bg-white/95 rounded-2xl border border-slate-100 p-10 sm:p-14 shadow-soft backdrop-blur-md relative animate-reveal">
            {/* 中央簡約圖標 */}
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-tr from-[#7FCBB3]/20 via-[#4FAEC8]/20 to-[#ECE2A6]/30 flex items-center justify-center relative shadow-sm">
              <Sparkles className="w-12 h-12 text-[#349282] animate-pulse" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-serif_jp font-bold text-[#2E7C94] tracking-wide">
                {i18n.results.hiddenTitle}
              </h2>
              <p className="text-xs font-serif_jp text-[#349282] font-medium tracking-wide">
                北科崇德青年社 · NTUT Chong De Young Club
              </p>
              <p className="text-[#8A9499] text-sm sm:text-base font-serif_jp leading-relaxed max-w-md mx-auto">
                各組參賽佳餚評選中，投票即將截止，請稍候盛大揭曉！
              </p>
            </div>

            {/* 即時投票進度條 */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-baseline text-sm font-serif_jp">
                <span className="text-[#8A9499]">目前投票完成進度</span>
                <span className="text-[#2E7C94] font-medium text-lg">
                  <span className="font-mono">{votedCount}</span>
                  <span className="text-xs text-[#8A9499] mx-1">/</span>
                  <span className="font-mono text-xs text-[#8A9499]">{totalTokens} 票</span>
                  <span className="font-mono text-xs text-[#349282] ml-2 font-bold">({percentage}%)</span>
                </span>
              </div>

              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-[#7FCBB3] via-[#4FAEC8] to-[#2E7C94] h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          // 狀態 B：已揭曉狀態（依指示拆分成獨立兩頁：一頁為冠軍組別，一頁為冠軍菜色）
          <div className="space-y-6 animate-reveal">
            {/* 兩頁切換控制列（高階分段控制器，徹底拿掉重複廉價 Emoji） */}
            <div className="flex items-center justify-center p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-full max-w-sm mx-auto shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('group')
                  fireConfetti()
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-serif_jp font-bold rounded-xl transition-all ${
                  activeTab === 'group'
                    ? 'bg-white text-[#2E7C94] shadow-md scale-[1.02]'
                    : 'text-[#8A9499] hover:text-[#2E7C94]'
                }`}
              >
                <Trophy className={`w-4 h-4 ${activeTab === 'group' ? 'text-amber-500' : 'text-[#8A9499]'}`} />
                <span>冠軍組別</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('dish')
                  fireConfetti()
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-serif_jp font-bold rounded-xl transition-all ${
                  activeTab === 'dish'
                    ? 'bg-white text-[#2E7C94] shadow-md scale-[1.02]'
                    : 'text-[#8A9499] hover:text-[#2E7C94]'
                }`}
              >
                <ChefHat className={`w-4 h-4 ${activeTab === 'dish' ? 'text-amber-500' : 'text-[#8A9499]'}`} />
                <span>冠軍菜色</span>
              </button>
            </div>

            {/* 頁面 1：🏆 冠軍組別獨立全螢幕頒獎頁面 */}
            {activeTab === 'group' && (
              <div className="max-w-3xl mx-auto w-full text-center space-y-6 animate-reveal">
                {championGroups.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-16 text-[#8A9499] font-serif_jp shadow-sm">
                    目前尚無冠軍組別紀錄
                  </div>
                ) : (
                  championGroups.map(group => (
                    <div
                      key={group.groupName}
                      className="bg-white/95 rounded-3xl p-8 sm:p-14 shadow-prism relative overflow-hidden text-center border border-slate-100/80 backdrop-blur-md"
                    >
                      {/* 金光微暈背景飾光 */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-[#FFF7D6]/40 via-[#E8F8F3]/20 to-transparent pointer-events-none -z-10" />

                      {/* 金牌榮譽獎盃徽章 */}
                      <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-tr from-[#FFF7D6] via-[#FFFDF0] to-[#E8F8F3] border border-[#ECE2A6]/60 flex items-center justify-center shadow-md">
                        <Trophy className="w-12 h-12 text-amber-500 animate-pulse" />
                      </div>

                      {/* 榮譽稱號標題 */}
                      <div className="inline-flex items-center gap-2 bg-[#EDF8F4] px-4 py-1.5 mb-2 rounded-full shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-[#349282]" />
                        <span className="font-serif_jp font-bold text-xs tracking-widest text-[#2E7C94] uppercase">
                          年度廚藝爭霸 · 冠軍組別
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-[#349282]" />
                      </div>

                      {/* 視覺核心：冠軍組別名稱 */}
                      <div className="my-4">
                        <h2 className="text-5xl sm:text-7xl font-serif_jp font-black text-[#2E7C94] tracking-wider leading-tight">
                          {group.groupName}
                        </h2>
                      </div>

                      {/* 該組參賽佳餚標籤清單 */}
                      {group.dishes && group.dishes.length > 0 && (
                        <div className="my-5 flex flex-wrap items-center justify-center gap-2">
                          <span className="text-xs font-serif_jp font-medium text-[#8A9499] mr-1">參賽佳餚：</span>
                          {group.dishes.map((dishName, idx) => (
                            <span
                              key={idx}
                              className="px-3.5 py-1 bg-[#F9FBFA] border border-slate-200/80 rounded-full text-xs sm:text-sm font-serif_jp font-bold text-[#3E4347] shadow-xs"
                            >
                              {dishName}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 榮譽總分大看板（只公布總分，一目了然） */}
                      <div className="mt-8 flex justify-center">
                        <div className="inline-flex flex-col items-center justify-center py-4 px-10 rounded-2xl bg-gradient-to-b from-[#FAFDFB] to-[#EDF8F4] border border-[#7FCBB3]/40 shadow-sm">
                          <span className="text-xs font-serif_jp font-bold text-[#349282] tracking-widest flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            <span>競賽榮耀總得分</span>
                          </span>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-5xl sm:text-6xl font-mono font-black text-[#2E7C94]">
                              {group.totalScore}
                            </span>
                            <span className="text-base font-serif_jp text-[#8A9499] font-bold">分</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* 翻頁引導按鈕 */}
                <div className="flex justify-center pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('dish')
                      fireConfetti()
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif_jp font-bold text-[#2E7C94] shadow-sm transition-all"
                  >
                    <span>接續公布：冠軍菜色</span>
                    <ChevronRight className="w-4 h-4 text-[#349282]" />
                  </button>
                </div>
              </div>
            )}

            {/* 頁面 2：🍽️ 冠軍菜色獨立全螢幕頒獎頁面 */}
            {activeTab === 'dish' && (
              <div className="max-w-3xl mx-auto w-full text-center space-y-6 animate-reveal">
                {championDishes.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-16 text-[#8A9499] font-serif_jp shadow-sm">
                    目前尚無冠軍菜色紀錄
                  </div>
                ) : (
                  championDishes.map(dish => (
                    <div
                      key={dish.id}
                      className="bg-white/95 rounded-3xl p-8 sm:p-14 shadow-prism relative overflow-hidden text-center border border-slate-100/80 backdrop-blur-md"
                    >
                      {/* 金光微暈背景飾光 */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-[#FFF7D6]/40 via-[#E8F8F3]/20 to-transparent pointer-events-none -z-10" />

                      {/* 金牌廚藝大師徽章 */}
                      <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-tr from-[#FFF7D6] via-[#FFFDF0] to-[#E8F8F3] border border-[#ECE2A6]/60 flex items-center justify-center shadow-md">
                        <ChefHat className="w-12 h-12 text-amber-500 animate-pulse" />
                      </div>

                      {/* 榮譽稱號標題 */}
                      <div className="inline-flex items-center gap-2 bg-[#EDF8F4] px-4 py-1.5 mb-2 rounded-full shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-[#349282]" />
                        <span className="font-serif_jp font-bold text-xs tracking-widest text-[#2E7C94] uppercase">
                          年度人氣佳餚 · 冠軍菜色
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-[#349282]" />
                      </div>

                      {/* 出品組別徽飾 */}
                      {dish.groupName && (
                        <div className="my-2">
                          <span className="inline-block px-3.5 py-1 bg-[#F9FBFA] border border-slate-200/80 rounded-full font-serif_jp text-xs text-[#349282] font-bold shadow-xs">
                            出品組別：{dish.groupName}
                          </span>
                        </div>
                      )}

                      {/* 視覺核心：冠軍菜色名稱 */}
                      <div className="my-4">
                        <h2 className="text-4xl sm:text-6xl font-serif_jp font-black text-[#2E7C94] tracking-wider leading-tight">
                          {dish.name}
                        </h2>
                      </div>

                      {/* 榮譽總分大看板（只公布總分，一目了然） */}
                      <div className="mt-8 flex justify-center">
                        <div className="inline-flex flex-col items-center justify-center py-4 px-10 rounded-2xl bg-gradient-to-b from-[#FAFDFB] to-[#EDF8F4] border border-[#7FCBB3]/40 shadow-sm">
                          <span className="text-xs font-serif_jp font-bold text-[#349282] tracking-widest flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            <span>佳餚榮耀總得分</span>
                          </span>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-5xl sm:text-6xl font-mono font-black text-[#2E7C94]">
                              {dish.totalScore}
                            </span>
                            <span className="text-base font-serif_jp text-[#8A9499] font-bold">分</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* 翻頁引導按鈕 */}
                <div className="flex justify-center pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('group')
                      fireConfetti()
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs sm:text-sm font-serif_jp font-bold text-[#2E7C94] shadow-sm transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#349282]" />
                    <span>返回：冠軍組別</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 底部微浮水印 (全螢幕投影時自動沉浸隱藏，避免干擾頒獎聚焦) */}
      {!isFullscreen && (
        <footer className="max-w-6xl mx-auto w-full text-center text-[11px] text-[#8A9499] font-serif_jp pt-4 relative z-10">
          <span>聖誕趴廚藝競賽 · 北科崇德青年社 (NTUT Chong De Young Club)</span>
        </footer>
      )}
    </div>
  )
}
