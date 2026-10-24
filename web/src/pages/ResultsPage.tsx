import { useEffect, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import { Sparkles, Trophy, Maximize, Minimize } from 'lucide-react'
import { api, type ResultsResponse } from '../lib/api'
import { i18n } from '../i18n/zh-TW'
import BrandLogo from '../components/BrandLogo'

export default function ResultsPage() {
  const [data, setData] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const confettiFiredRef = useRef(false)

  const fetchResults = async () => {
    try {
      const res = await api.getResults()
      setData(res)

      // 當切換為已揭曉時，自動施放盛大金色與薄荷藍冠軍彩帶
      if (!res.hidden && res.results && res.results.length > 0 && !confettiFiredRef.current) {
        confettiFiredRef.current = true
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#4FAEC8', '#7FCBB3', '#ECE2A6', '#FFFFFF', '#349282']
        })
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
        <div className="w-12 h-12 border-2 border-[rgba(79,174,200,0.3)] border-t-[#4FAEC8] animate-spin mb-4" style={{ borderRadius: '2px' }} />
        <p className="text-[#349282] font-serif_jp text-sm tracking-widest">{i18n.common.loading}</p>
        <span className="font-display italic text-xs text-[#92C5B7] mt-1">connecting live results feed...</span>
      </div>
    )
  }

  const votedCount = data?.votedCount ?? 0
  const totalTokens = data?.totalTokens ?? 0
  const percentage = totalTokens > 0 ? Math.round((votedCount / totalTokens) * 100) : 0
  const isHidden = data?.hidden ?? true
  const results = data?.results ?? []

  // 僅篩選第一名（冠軍，包含同票同名次）
  const champions = results.filter(r => r.rank === 1)

  return (
    <div className="min-h-screen bg-white text-[#3E4347] flex flex-col justify-between p-6 sm:p-12 select-none relative overflow-hidden">
      {/* 散景光斑背景與折射線條 */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-tr from-[#7FCBB3]/20 via-[#4FAEC8]/20 to-[#ECE2A6]/25 blur-3xl pointer-events-none animate-bokeh" />
      <div className="refraction-slash top-24 left-10 w-[700px] opacity-40" />
      <div className="refraction-slash bottom-28 right-10 w-[800px] opacity-40" />

      {/* 邊界固定手寫草寫 (Pinyon Script) 水印 */}
      <div className="fixed left-6 top-1/3 marginal-script text-[#92C5B7]/25 text-5xl hidden xl:block">
        culinary exhibition grand stage
      </div>
      <div className="fixed right-6 bottom-1/3 marginal-script text-[#92C5B7]/25 text-5xl hidden xl:block">
        delicate memory of taste
      </div>

      {/* 頂部 Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-[rgba(79,174,200,0.25)] pb-5 relative z-10">
        <BrandLogo size="lg" />

        <div className="flex items-center gap-3">
          {/* 即時連線指標 */}
          <div className="flex items-center gap-2 text-xs text-[#349282] font-serif_jp font-medium bg-[#F9FBFA] border border-[rgba(79,174,200,0.3)] px-3 py-1.5" style={{ borderRadius: '2px' }}>
            <span className="w-2 h-2 rounded-full bg-[#349282] animate-pulse" />
            <span>即時連線中</span>
          </div>

          {/* 全螢幕投影切換按鈕 (便捷性優化) */}
          <button
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1.5 text-xs text-[#2E7C94] font-serif_jp font-medium bg-white hover:bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)] px-3 py-1.5 transition-all shadow-sm"
            style={{ borderRadius: '2px' }}
            title="投影全螢幕模式"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? '退出全螢幕' : '全螢幕投影'}</span>
          </button>
        </div>
      </header>

      {/* 主畫面 */}
      <main className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center py-10 relative z-10">
        {isHidden ? (
          // 狀態 A：未揭曉狀態 (展覽概念扉頁式等待觀景窗)
          <div className="max-w-xl mx-auto w-full text-center space-y-8 bg-white/90 border border-[rgba(79,174,200,0.35)] p-10 sm:p-14 shadow-soft backdrop-blur-md relative animate-reveal" style={{ borderRadius: '2px' }}>
            {/* 中央 1:1 方框散景寫真視窗 */}
            <div className="w-28 h-28 mx-auto border border-[rgba(79,174,200,0.35)] bg-gradient-to-tr from-[#7FCBB3]/35 via-[#4FAEC8]/30 to-[#ECE2A6]/40 p-1 flex items-center justify-center relative shadow-inner overflow-hidden" style={{ borderRadius: '2px' }}>
              <div className="absolute inset-1 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-[#349282] animate-pulse" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative inline-block">
                <div className="framing-corner-tl" />
                <div className="framing-corner-br" />
                <h2 className="text-2xl sm:text-3xl font-serif_jp font-medium text-[#2E7C94] tracking-wider">
                  {i18n.results.hiddenTitle}
                </h2>
              </div>
              <p className="font-display italic text-xs tracking-widest text-[#349282] uppercase">
                culinary memories await the grand revelation
              </p>
              <p className="text-[#8A9499] text-sm sm:text-base font-serif_jp leading-relaxed max-w-md mx-auto">
                美味の記憶を、ここに集めて。<br />所有參賽佳餚已進入最終評選，請稍候盛大揭曉！
              </p>
            </div>

            {/* 即時投票進度條 */}
            <div className="space-y-3 pt-6 border-t border-[rgba(79,174,200,0.2)]">
              <div className="flex justify-between items-baseline text-sm font-serif_jp">
                <span className="text-[#8A9499]">投票完成進度</span>
                <span className="text-[#2E7C94] font-medium text-lg">
                  <span className="font-mono">{votedCount}</span>
                  <span className="text-xs text-[#8A9499] mx-1">/</span>
                  <span className="font-mono text-xs text-[#8A9499]">{totalTokens} 票</span>
                  <span className="font-mono text-xs text-[#349282] ml-2 font-semibold">({percentage}%)</span>
                </span>
              </div>

              <div className="w-full bg-[#F9FBFA] h-3 p-0.5 border border-[rgba(79,174,200,0.3)] shadow-inner" style={{ borderRadius: '2px' }}>
                <div
                  className="bg-gradient-to-r from-[#7FCBB3] via-[#4FAEC8] to-[#2E7C94] h-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(percentage, 100)}%`, borderRadius: '2px' }}
                />
              </div>
            </div>
          </div>
        ) : (
          // 狀態 B：已揭曉狀態（依使用者指示：只公布第一名的組別和菜色，其餘完全隱藏不公開）
          <div className="max-w-2xl mx-auto w-full text-center space-y-8 animate-reveal">
            {champions.length === 0 ? (
              <div className="bg-white border border-[rgba(79,174,200,0.35)] p-12 text-[#8A9499] font-serif_jp" style={{ borderRadius: '2px' }}>
                目前尚無冠軍菜色紀錄
              </div>
            ) : (
              champions.map(champion => (
                <div
                  key={champion.id}
                  className="bg-white/95 border-2 border-[#ECE2A6] p-8 sm:p-14 shadow-prism relative overflow-hidden text-center"
                  style={{ borderRadius: '2px' }}
                >
                  {/* 角落 45 度微光金黃色條 */}
                  <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10px] right-[-10px] w-20 h-20 bg-gradient-to-br from-[#ECE2A6] to-[#7FCBB3] rotate-45 opacity-60" />
                  </div>

                  {/* 冠軍金杯榮耀圖標 */}
                  <div className="w-20 h-20 mx-auto mb-6 border border-[#ECE2A6] bg-gradient-to-tr from-[#FFFDF0] via-white to-[#EDF8F4] flex items-center justify-center shadow-soft" style={{ borderRadius: '2px' }}>
                    <Trophy className="w-10 h-10 text-[#349282] animate-pulse" />
                  </div>

                  {/* 榮譽徽章標題 */}
                  <div className="inline-flex items-center gap-2 bg-[#EDF8F4] border border-[rgba(79,174,200,0.4)] px-4 py-1.5 mb-3 shadow-sm" style={{ borderRadius: '2px' }}>
                    <span className="text-[#349282] text-xs">✦</span>
                    <span className="font-serif_jp font-semibold text-xs tracking-[0.25em] text-[#2E7C94] uppercase">
                      本屆最優秀大賞 · 第一名
                    </span>
                    <span className="text-[#349282] text-xs">✦</span>
                  </div>

                  <p className="font-display italic text-xs tracking-[0.25em] text-[#92C5B7] uppercase mb-5">
                    the grand culinary champion
                  </p>

                  {/* 第一名所屬組別展示 */}
                  {champion.groupName && (
                    <div className="mb-3">
                      <span className="inline-block px-3.5 py-1 bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)] font-serif_jp text-sm sm:text-base font-semibold text-[#349282] tracking-wider" style={{ borderRadius: '2px' }}>
                        ✦ 冠軍組別：{champion.groupName} ✦
                      </span>
                    </div>
                  )}

                  {/* 冠軍菜色名稱展示 (大字號明朝體文學裝幀) */}
                  <div className="relative inline-block my-2 px-6 py-4">
                    <div className="framing-corner-tl" />
                    <div className="framing-corner-br" />
                    <h2 className="text-2xl sm:text-4xl font-serif_jp font-bold text-[#2E7C94] tracking-wider leading-relaxed">
                      {champion.name}
                    </h2>
                  </div>

                  {/* 總得分與得票榮耀標記 */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
                    <span className="font-mono text-sm sm:text-base font-bold text-[#349282] bg-[#EDF8F4] border border-[rgba(79,174,200,0.35)] px-3.5 py-1" style={{ borderRadius: '2px' }}>
                      總得分 {champion.totalScore} 分
                    </span>
                    <span className="text-xs font-serif_jp text-[#8A9499]">
                      (來賓 {champion.voteCount} 票 · 評審加分 {champion.extraScore > 0 ? `+${champion.extraScore}` : champion.extraScore} 分)
                    </span>
                  </div>
                </div>
              ))
            )}

            <div className="text-center pt-2">
              <span className="font-display italic text-xs tracking-widest text-[#92C5B7]">
                congratulations to the champion team · culinary memory shines forever
              </span>
            </div>
          </div>
        )}
      </main>

      {/* 底部 Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-[#8A9499] font-serif_jp pt-5 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[rgba(79,174,200,0.2)]">
        <span>聖誕廚藝競賽 · 公開即時投影結果系統</span>
        <span className="font-display italic text-[#92C5B7]">Airy Japanese Minimalist Editorial Edition</span>
      </footer>
    </div>
  )
}
