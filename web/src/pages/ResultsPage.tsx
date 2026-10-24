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
            {/* 兩頁切換控制切換列（大螢幕投影導航與手機自適應） */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('group')
                  fireConfetti()
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-serif_jp font-medium rounded-lg transition-all shadow-sm ${
                  activeTab === 'group'
                    ? 'bg-[#2E7C94] text-white shadow-md scale-102 sm:scale-105'
                    : 'bg-white text-[#8A9499] border border-slate-200 hover:text-[#2E7C94]'
                }`}
              >
                <Trophy className="w-4 h-4 text-[#ECE2A6] shrink-0" />
                <span>🏆 冠軍組別</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('dish')
                  fireConfetti()
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 text-xs sm:text-sm font-serif_jp font-medium transition-all shadow-sm ${
                  activeTab === 'dish'
                    ? 'bg-[#2E7C94] text-white border border-[#2E7C94] shadow-md scale-102 sm:scale-105'
                    : 'bg-white text-[#8A9499] border border-[rgba(79,174,200,0.35)] hover:text-[#2E7C94]'
                }`}
                style={{ borderRadius: '2px' }}
              >
                <ChefHat className="w-4 h-4 text-[#ECE2A6] shrink-0" />
                <span>🍽️ 冠軍菜色</span>
              </button>
            </div>

            {/* 頁面 1：🏆 冠軍組別獨立全螢幕頁面 */}
            {activeTab === 'group' && (
              <div className="max-w-2xl mx-auto w-full text-center space-y-6 animate-reveal">
                {championGroups.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-12 text-[#8A9499] font-serif_jp shadow-sm">
                    目前尚無冠軍組別紀錄
                  </div>
                ) : (
                  championGroups.map(group => (
                    <div
                      key={group.groupName}
                      className="bg-white/98 rounded-3xl p-8 sm:p-14 shadow-prism relative overflow-hidden text-center border border-slate-100"
                    >
                      {/* 榮譽圖標 */}
                      <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-[#FFFDF0] flex items-center justify-center shadow-soft">
                        <Trophy className="w-10 h-10 text-[#349282] animate-pulse" />
                      </div>

                      {/* 榮譽徽章標題 */}
                      <div className="inline-flex items-center gap-2 bg-[#EDF8F4] px-4 py-1.5 mb-4 rounded-full shadow-sm">
                        <span className="text-[#349282] text-xs">✦</span>
                        <span className="font-serif_jp font-bold text-xs tracking-wider text-[#2E7C94]">
                          本屆最優秀廚藝團隊 · 冠軍組別
                        </span>
                        <span className="text-[#349282] text-xs">✦</span>
                      </div>

                      {/* 視覺重點：冠軍組別名稱 */}
                      <div className="my-3 px-8 py-4">
                        <h2 className="text-4xl sm:text-6xl font-serif_jp font-bold text-[#2E7C94] tracking-wider leading-relaxed">
                          {group.groupName}
                        </h2>
                      </div>

                      {/* 該組參賽佳餚清單 */}
                      {group.dishes && group.dishes.length > 0 && (
                        <div className="my-4 text-xs font-serif_jp text-[#8A9499]">
                          <span className="text-[#3E4347] font-medium mr-1.5">參賽佳餚：</span>
                          <span>{group.dishes.join(' · ')}</span>
                        </div>
                      )}

                      {/* 總分公布（只公布總分，一票等於一分） */}
                      <div className="mt-6 flex items-center justify-center">
                        <div className="bg-[#EDF8F4] rounded-xl px-6 py-2.5 shadow-sm inline-flex items-center gap-2">
                          <Award className="w-5 h-5 text-[#349282]" />
                          <span className="text-sm font-serif_jp text-[#2E7C94] font-medium">競賽榮耀總分</span>
                          <span className="font-mono text-xl sm:text-2xl font-bold text-[#349282] ml-1">
                            {group.totalScore}
                          </span>
                          <span className="text-xs text-[#8A9499] font-serif_jp">分</span>
                        </div>
                      </div>

                      <p className="mt-5 text-xs text-[#8A9499] font-serif_jp leading-relaxed max-w-sm mx-auto">
                        團隊同心，極致風味。以卓越的默契與精湛料理奪得全場最高榮耀！
                      </p>
                    </div>
                  ))
                )}

                {/* 翻頁引導 */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('dish')
                      fireConfetti()
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-serif_jp text-[#2E7C94] hover:text-[#349282] transition-colors"
                  >
                    <span>接續公布：冠軍菜色</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 頁面 2：🍽️ 冠軍菜色獨立全螢幕頁面 */}
            {activeTab === 'dish' && (
              <div className="max-w-2xl mx-auto w-full text-center space-y-6 animate-reveal">
                {championDishes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-12 text-[#8A9499] font-serif_jp shadow-sm">
                    目前尚無冠軍菜色紀錄
                  </div>
                ) : (
                  championDishes.map(dish => (
                    <div
                      key={dish.id}
                      className="bg-white/98 rounded-3xl p-8 sm:p-14 shadow-prism relative overflow-hidden text-center border border-slate-100"
                    >
                      {/* 廚師圖標 */}
                      <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-[#FFFDF0] flex items-center justify-center shadow-soft">
                        <ChefHat className="w-10 h-10 text-[#349282] animate-pulse" />
                      </div>

                      {/* 榮譽徽章標題 */}
                      <div className="inline-flex items-center gap-2 bg-[#EDF8F4] px-4 py-1.5 mb-3 rounded-full shadow-sm">
                        <span className="text-[#349282] text-xs">✦</span>
                        <span className="font-serif_jp font-bold text-xs tracking-wider text-[#2E7C94]">
                          本屆最受歡迎佳餚 · 冠軍菜色
                        </span>
                        <span className="text-[#349282] text-xs">✦</span>
                      </div>

                      {/* 出品組別標籤 */}
                      {dish.groupName && (
                        <div className="mb-2">
                          <span className="inline-block px-3 py-0.5 bg-[#F9FBFA] rounded-md font-serif_jp text-xs text-[#349282] font-semibold">
                            出品組別：{dish.groupName}
                          </span>
                        </div>
                      )}

                      {/* 視覺重點：冠軍菜色名稱 */}
                      <div className="my-3 px-8 py-4">
                        <h2 className="text-3xl sm:text-5xl font-serif_jp font-bold text-[#2E7C94] tracking-wider leading-relaxed">
                          {dish.name}
                        </h2>
                      </div>

                      {/* 總分公布（只公布總分，一票等於一分） */}
                      <div className="mt-6 flex items-center justify-center">
                        <div className="bg-[#EDF8F4] rounded-xl px-6 py-2.5 shadow-sm inline-flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#349282]" />
                          <span className="text-sm font-serif_jp text-[#2E7C94] font-medium">佳餚榮耀總分</span>
                          <span className="font-mono text-xl sm:text-2xl font-bold text-[#349282] ml-1">
                            {dish.totalScore}
                          </span>
                          <span className="text-xs text-[#8A9499] font-serif_jp">分</span>
                        </div>
                      </div>

                      <p className="mt-5 text-xs text-[#8A9499] font-serif_jp leading-relaxed max-w-sm mx-auto">
                        舌尖上的溫暖驚喜，征服全場評審與全體來賓的聖誕經典之作！
                      </p>
                    </div>
                  ))
                )}

                {/* 翻頁引導 */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('group')
                      fireConfetti()
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-serif_jp text-[#2E7C94] hover:text-[#349282] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>查看：冠軍組別</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 底部 Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-[#8A9499] font-serif_jp pt-5 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
        <span>聖誕趴廚藝競賽 · 公開即時投影結果</span>
        <span className="font-sans text-xs text-[#349282] font-medium">北科崇德青年社 · NTUT Chong De Young Club</span>
      </footer>
    </div>
  )
}
