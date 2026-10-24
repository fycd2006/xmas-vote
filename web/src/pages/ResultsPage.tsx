import { useEffect, useState } from 'react'
import { Sparkles, Trophy, Award, Medal } from 'lucide-react'
import { api, type ResultsResponse } from '../lib/api'
import { i18n } from '../i18n/zh-TW'

export default function ResultsPage() {
  const [data, setData] = useState<ResultsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchResults = async () => {
    try {
      const res = await api.getResults()
      setData(res)
    } catch {
      // 輪詢失敗靜默重試
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
    // 每 5 秒輪詢一次 GET /api/results
    const interval = setInterval(fetchResults, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full border-2 border-[#7FCBB3]/40 border-t-[#2E7C94] animate-spin mb-4" />
        <p className="text-[#349282] font-serif text-base tracking-widest">{i18n.common.loading}</p>
        <span className="font-display italic text-xs text-[#92C5B7] mt-1">connecting live results feed...</span>
      </div>
    )
  }

  const votedCount = data?.votedCount ?? 0
  const totalTokens = data?.totalTokens ?? 0
  const percentage = totalTokens > 0 ? Math.round((votedCount / totalTokens) * 100) : 0
  const isHidden = data?.hidden ?? true
  const results = data?.results ?? []

  // 最大票數（用於計算長條圖寬度比例）
  const maxVotes = results.length > 0 ? Math.max(...results.map(r => r.voteCount), 1) : 1

  return (
    <div className="min-h-screen bg-white text-[#3E4347] flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      {/* 背景散景光斑與斜向折射光束 */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-tr from-[#7FCBB3]/20 via-[#4FAEC8]/20 to-[#ECE2A6]/25 blur-3xl pointer-events-none animate-bokeh" />
      <div className="refraction-slash top-20 left-10 w-[600px] opacity-40" />
      <div className="refraction-slash bottom-28 right-10 w-[700px] opacity-40" />

      {/* 邊界縱向文學花體水印 */}
      <div className="fixed left-6 top-1/3 marginal-script text-[#92C5B7]/25 text-4xl hidden xl:block">
        culinary exhibition board
      </div>
      <div className="fixed right-6 bottom-1/3 marginal-script text-[#92C5B7]/25 text-4xl hidden xl:block">
        light of culinary art
      </div>

      {/* 頂部 Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between border-b border-[#7FCBB3]/25 pb-5 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative inline-block">
            <div className="framing-corner-tl" />
            <div className="framing-corner-br" />
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-wider">
              <span className="text-[#349282]">聖</span>
              <span className="text-[#2E7C94]">誕</span>
              <span className="text-[#3E4347]">廚藝競賽 · 結果看板</span>
            </h1>
          </div>
          <span className="hidden sm:inline font-display italic text-xs tracking-widest text-[#92C5B7] uppercase">
            grand revelation
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-[#349282] font-serif font-medium bg-[#F0F7F5] border border-[#7FCBB3]/35 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#349282] animate-pulse" />
          <span>即時連線中</span>
        </div>
      </header>

      {/* 主畫面 */}
      <main className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center py-8 relative z-10">
        {isHidden ? (
          // 狀態 A：未揭曉狀態 (展覽概念扉頁式等待觀景窗)
          <div className="max-w-xl mx-auto w-full text-center space-y-8 bg-white/90 border border-[#7FCBB3]/40 p-8 sm:p-12 rounded-3xl shadow-[0_20px_50px_rgba(79,174,200,0.12)] backdrop-blur-md relative">
            {/* 中央方框散景寫真視窗 */}
            <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-tr from-[#7FCBB3]/35 via-[#4FAEC8]/30 to-[#ECE2A6]/40 p-1 flex items-center justify-center shadow-inner relative overflow-hidden group">
              <div className="absolute inset-1 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-[#349282] animate-pulse" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative inline-block">
                <div className="framing-corner-tl" />
                <div className="framing-corner-br" />
                <h2 className="text-2xl sm:text-3xl font-serif font-medium text-[#2E7C94] tracking-wider">
                  {i18n.results.hiddenTitle}
                </h2>
              </div>
              <p className="font-display italic text-xs tracking-widest text-[#349282] uppercase">
                taste memories await revelation
              </p>
              <p className="text-[#61676C] text-sm sm:text-base font-serif leading-relaxed max-w-md mx-auto">
                所有參賽佳餚正激烈角逐中，請稍候主辦人啟動盛大揭曉！
              </p>
            </div>

            {/* 即時投票進度條 */}
            <div className="space-y-3 pt-4 border-t border-[#7FCBB3]/20">
              <div className="flex justify-between items-baseline text-sm font-serif">
                <span className="text-[#61676C]">目前已投進度</span>
                <span className="text-[#2E7C94] font-medium text-lg">
                  <span className="font-mono">{votedCount}</span>
                  <span className="text-xs text-[#61676C] mx-1">/</span>
                  <span className="font-mono text-xs text-[#61676C]">{totalTokens} 票</span>
                  <span className="font-mono text-xs text-[#349282] ml-2">({percentage}%)</span>
                </span>
              </div>

              <div className="w-full bg-[#F0F7F5] rounded-full h-3.5 p-0.5 border border-[#7FCBB3]/30 shadow-inner">
                <div
                  className="bg-gradient-to-r from-[#7FCBB3] via-[#4FAEC8] to-[#2E7C94] h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          // 狀態 B：已揭曉狀態（幾何結晶頒獎台與純淨長條圖）
          <div className="space-y-10 animate-fade-in">
            {/* 前三名頒獎台 */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-2xl mx-auto pt-4 pb-2">
              {/* 第二名 */}
              {results[1] && (
                <div className="flex flex-col items-center order-1">
                  <Medal className="w-8 h-8 text-[#2E7C94] mb-1" />
                  <span className="text-xs font-serif font-medium text-[#2E7C94] bg-[#E8F5F8] border border-[#2E7C94]/30 px-2.5 py-0.5 rounded-full mb-2">
                    第 2 名
                  </span>
                  <div className="w-full bg-gradient-to-b from-[#F0F7F5] to-white border border-[#2E7C94]/35 rounded-t-2xl p-3 sm:p-4 text-center h-28 flex flex-col justify-center shadow-[0_8px_20px_rgba(46,124,148,0.1)]">
                    <span className="text-xs sm:text-sm font-serif font-medium text-[#3E4347] line-clamp-2">{results[1].name}</span>
                    <span className="text-xs font-mono font-medium text-[#2E7C94] mt-1">{results[1].voteCount} 票</span>
                  </div>
                </div>
              )}

              {/* 第一名 (冠軍) */}
              {results[0] && (
                <div className="flex flex-col items-center order-2">
                  <Trophy className="w-10 h-10 text-[#349282] mb-1 animate-pulse" />
                  <span className="text-xs font-serif font-medium text-[#349282] bg-[#EDF8F4] border border-[#349282]/40 px-3 py-0.5 rounded-full mb-2 shadow-sm">
                    ✦ 冠軍 ✦
                  </span>
                  <div className="w-full bg-gradient-to-b from-[#FFFDF0] via-[#F9FCFB] to-white border-2 border-[#ECE2A6] rounded-t-2xl p-3 sm:p-5 text-center h-36 flex flex-col justify-center shadow-[0_12px_32px_rgba(236,226,166,0.35)]">
                    <span className="text-sm sm:text-base font-serif font-bold text-[#2E7C94] line-clamp-2">{results[0].name}</span>
                    <span className="text-sm font-mono font-bold text-[#349282] mt-1.5">{results[0].voteCount} 票</span>
                  </div>
                </div>
              )}

              {/* 第三名 */}
              {results[2] && (
                <div className="flex flex-col items-center order-3">
                  <Award className="w-8 h-8 text-[#7FCBB3] mb-1" />
                  <span className="text-xs font-serif font-medium text-[#349282] bg-[#EDF8F4] border border-[#7FCBB3]/40 px-2.5 py-0.5 rounded-full mb-2">
                    第 3 名
                  </span>
                  <div className="w-full bg-gradient-to-b from-[#F9FCFB] to-white border border-[#7FCBB3]/35 rounded-t-2xl p-3 sm:p-4 text-center h-24 flex flex-col justify-center shadow-[0_8px_20px_rgba(127,203,179,0.1)]">
                    <span className="text-xs sm:text-sm font-serif font-medium text-[#3E4347] line-clamp-2">{results[2].name}</span>
                    <span className="text-xs font-mono font-medium text-[#349282] mt-1">{results[2].voteCount} 票</span>
                  </div>
                </div>
              )}
            </div>

            {/* 完整票數長條圖清單 */}
            <div className="bg-white/95 border border-[#7FCBB3]/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-[0_10px_30px_rgba(79,174,200,0.08)]">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-serif font-medium text-[#2E7C94]">
                  全體參賽菜色得票一覽
                </h3>
                <span className="font-display italic text-xs text-[#92C5B7]">
                  culinary ranking catalogue
                </span>
              </div>

              <div className="space-y-3">
                {results.map(dish => {
                  const barWidth = Math.max(Math.round((dish.voteCount / maxVotes) * 100), 4)
                  const isTop3 = dish.rank <= 3

                  return (
                    <div key={dish.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm sm:text-base">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-serif font-medium ${
                            dish.rank === 1
                              ? 'bg-[#EDF8F4] text-[#349282] border border-[#349282]/40 font-bold'
                              : isTop3
                              ? 'bg-[#E8F5F8] text-[#2E7C94] border border-[#2E7C94]/30'
                              : 'bg-slate-100 text-[#61676C]'
                          }`}>
                            {dish.rank}
                          </span>
                          <span className="font-serif text-[#3E4347] font-medium">{dish.name}</span>
                        </div>
                        <span className="font-mono font-medium text-[#2E7C94]">
                          {dish.voteCount} 票
                        </span>
                      </div>

                      <div className="w-full bg-[#F0F7F5] rounded-full h-3 p-0.5 border border-[#7FCBB3]/25">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isTop3
                              ? 'bg-gradient-to-r from-[#7FCBB3] via-[#4FAEC8] to-[#2E7C94]'
                              : 'bg-[#92C5B7]/60'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部 Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-[#61676C] font-serif pt-4 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#7FCBB3]/20">
        <span>聖誕廚藝競賽 · 公開即時投影系統</span>
        <span className="font-display italic text-[#92C5B7]">Japanese Airy Literary Editorial Edition</span>
      </footer>
    </div>
  )
}
