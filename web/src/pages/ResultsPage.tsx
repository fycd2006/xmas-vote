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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin text-5xl mb-4">🎄</div>
        <p className="text-xmas-gold text-lg font-medium">{i18n.common.loading}</p>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* 頂部 Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎄</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-xmas-gold to-xmas-gold-light tracking-wide">
            {i18n.common.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span>即時連線中</span>
        </div>
      </header>

      {/* 主畫面 */}
      <main className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-center py-8">
        {isHidden ? (
          // 狀態 A：未揭曉狀態
          <div className="max-w-xl mx-auto w-full text-center space-y-8 bg-slate-900/60 border border-slate-800/80 p-8 sm:p-12 rounded-3xl shadow-2xl backdrop-blur-md">
            <div className="w-24 h-24 mx-auto bg-xmas-green/20 border-2 border-xmas-gold/50 rounded-full flex items-center justify-center text-4xl shadow-inner">
              <Sparkles className="w-12 h-12 text-xmas-gold animate-bounce" />
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {i18n.results.hiddenTitle}
              </h2>
              <p className="text-slate-400 text-base">
                所有參賽佳餚正激烈角逐中，請稍候主辦人揭曉！
              </p>
            </div>

            {/* 即時投票進度條 */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-slate-400 font-semibold">目前投票進度</span>
                <span className="text-xmas-gold font-bold text-lg">
                  {i18n.results.progress(votedCount, totalTokens)}
                  <span className="text-slate-400 text-xs ml-1.5">({percentage}%)</span>
                </span>
              </div>

              <div className="w-full bg-slate-950 rounded-full h-4 p-0.5 border border-slate-800 shadow-inner">
                <div
                  className="bg-gradient-to-r from-xmas-green to-xmas-gold h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          // 狀態 B：已揭曉狀態（頒獎台與長條圖排行）
          <div className="space-y-10 animate-fade-in">
            {/* 前三名頒獎台 */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end max-w-2xl mx-auto pt-4 pb-2">
              {/* 第二名 */}
              {results[1] && (
                <div className="flex flex-col items-center order-1">
                  <Medal className="w-8 h-8 text-slate-300 mb-1" />
                  <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full mb-2">第 2 名</span>
                  <div className="w-full bg-slate-800/80 border border-slate-700 rounded-t-2xl p-3 sm:p-4 text-center h-28 flex flex-col justify-center shadow-lg">
                    <span className="text-xs sm:text-sm font-bold text-white line-clamp-2">{results[1].name}</span>
                    <span className="text-xs font-semibold text-xmas-gold mt-1">{results[1].voteCount} 票</span>
                  </div>
                </div>
              )}

              {/* 第一名 (冠軍) */}
              {results[0] && (
                <div className="flex flex-col items-center order-2">
                  <Trophy className="w-10 h-10 text-xmas-gold mb-1 animate-pulse" />
                  <span className="text-xs font-extrabold text-black bg-xmas-gold px-2.5 py-0.5 rounded-full mb-2 shadow-md">冠軍</span>
                  <div className="w-full bg-gradient-to-b from-xmas-green/40 to-slate-850 border-2 border-xmas-gold rounded-t-2xl p-3 sm:p-4 text-center h-36 flex flex-col justify-center shadow-2xl">
                    <span className="text-sm sm:text-base font-extrabold text-white line-clamp-2">{results[0].name}</span>
                    <span className="text-sm font-bold text-xmas-gold mt-1.5">{results[0].voteCount} 票</span>
                  </div>
                </div>
              )}

              {/* 第三名 */}
              {results[2] && (
                <div className="flex flex-col items-center order-3">
                  <Award className="w-8 h-8 text-amber-600 mb-1" />
                  <span className="text-xs font-bold text-amber-500 bg-amber-950/60 px-2 py-0.5 rounded-full mb-2">第 3 名</span>
                  <div className="w-full bg-slate-800/80 border border-slate-700 rounded-t-2xl p-3 sm:p-4 text-center h-24 flex flex-col justify-center shadow-lg">
                    <span className="text-xs sm:text-sm font-bold text-white line-clamp-2">{results[2].name}</span>
                    <span className="text-xs font-semibold text-xmas-gold mt-1">{results[2].voteCount} 票</span>
                  </div>
                </div>
              )}
            </div>

            {/* 完整票數長條圖清單 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-slate-300 mb-2">
                全體參賽菜色得票一覽
              </h3>

              <div className="space-y-3">
                {results.map(dish => {
                  const barWidth = Math.max(Math.round((dish.voteCount / maxVotes) * 100), 4)
                  const isTop3 = dish.rank <= 3

                  return (
                    <div key={dish.id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm sm:text-base">
                        <div className="flex items-center gap-2.5 font-bold">
                          <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-extrabold ${
                            dish.rank === 1
                              ? 'bg-xmas-gold text-black'
                              : isTop3
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {dish.rank}
                          </span>
                          <span className="text-slate-100">{dish.name}</span>
                        </div>
                        <span className="font-extrabold text-xmas-gold">
                          {dish.voteCount} 票
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isTop3
                              ? 'bg-gradient-to-r from-xmas-green to-xmas-gold'
                              : 'bg-slate-600'
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
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 pt-4">
        聖誕廚藝競賽 · 公開即時投影系統
      </footer>
    </div>
  )
}
