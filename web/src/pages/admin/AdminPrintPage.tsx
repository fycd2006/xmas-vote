import { useEffect, useState, useMemo } from 'react'
import QRCode from 'qrcode'
import { Printer, AlertTriangle, CheckSquare, Square, RefreshCw } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import { api, ApiException } from '../../lib/api'
import { i18n } from '../../i18n/zh-TW'

interface PrintToken {
  token: string
  status: 'unused' | 'used' | 'void'
  qrDataUrl?: string
}

function formatShortCode(token: string): string {
  if (token.length === 10) {
    return `${token.slice(0, 5)}-${token.slice(5, 10)}`
  }
  return token
}

export default function AdminPrintPage() {
  const [tokens, setTokens] = useState<PrintToken[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingQRs, setGeneratingQRs] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 網域確認防呆狀態（主辦人需確認非 localhost）
  const [domainConfirmed, setDomainConfirmed] = useState(false)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')

  // 列印範圍：'unused' (全部未使用), 'all', 'custom'
  const [printScope, setPrintScope] = useState<'unused' | 'all' | 'custom'>('unused')
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())

  // 載入 Token 列表
  const fetchTokens = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await api.getAdminTokens()
      const list: PrintToken[] = res.tokens.map(t => ({
        token: t.token,
        status: t.status as 'unused' | 'used' | 'void',
      }))
      setTokens(list)

      // 預設全選未使用
      const unusedSet = new Set(list.filter(t => t.status === 'unused').map(t => t.token))
      setSelectedTokens(unusedSet)
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
    fetchTokens()
  }, [])

  // 篩選出待列印的 token 清單
  const tokensToPrint = useMemo(() => {
    if (printScope === 'unused') {
      return tokens.filter(t => t.status === 'unused')
    }
    if (printScope === 'all') {
      return tokens
    }
    return tokens.filter(t => selectedTokens.has(t.token))
  }, [tokens, printScope, selectedTokens])

  // 批次產生 QR Code 圖片
  useEffect(() => {
    let cancelled = false
    const generateAllQRs = async () => {
      if (tokensToPrint.length === 0) return
      setGeneratingQRs(true)

      const updated = await Promise.all(
        tokensToPrint.map(async item => {
          if (item.qrDataUrl) return item
          const qrText = `${currentOrigin}/vote?t=${item.token}`
          try {
            const dataUrl = await QRCode.toDataURL(qrText, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 140,
            })
            return { ...item, qrDataUrl: dataUrl }
          } catch {
            return item
          }
        })
      )

      if (!cancelled) {
        setTokens(prev => {
          const map = new Map(updated.map(u => [u.token, u.qrDataUrl]))
          return prev.map(t => ({
            ...t,
            qrDataUrl: map.get(t.token) || t.qrDataUrl,
          }))
        })
        setGeneratingQRs(false)
      }
    }

    generateAllQRs()
    return () => {
      cancelled = true
    }
  }, [tokensToPrint, currentOrigin])

  // 切換單一勾選
  const handleToggleSelect = (token: string) => {
    setSelectedTokens(prev => {
      const next = new Set(prev)
      if (next.has(token)) next.delete(token)
      else next.add(token)
      return next
    })
  }

  // 將待印清單依每頁 20 張（4 欄 × 5 列）分組
  const tokenPages = useMemo(() => {
    const pages: PrintToken[][] = []
    const pageSize = 20
    for (let i = 0; i < tokensToPrint.length; i += pageSize) {
      pages.push(tokensToPrint.slice(i, i + pageSize))
    }
    return pages
  }, [tokensToPrint])

  const handlePrint = () => {
    window.print()
  }

  return (
    <AdminLayout>
      {/* 螢幕操作介面（列印時透過 print:hidden 隱藏） */}
      <div className="print:hidden space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#349282]">✦</span>
            <h1 className="text-xl font-serif_jp font-medium text-[#2E7C94] tracking-wide">
              {i18n.admin.printTitle}
            </h1>
          </div>
          <p className="text-xs font-serif_jp text-[#8A9499]">
            A4 格式同人誌藏書票排版（每頁 4 欄 × 5 列共 20 張，每張約 47 × 55 mm）
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp" style={{ borderRadius: '2px' }}>
            {errorMessage}
          </div>
        )}

        {/* 網址確認防呆警示卡片 */}
        <div className={`p-5 border transition-all ${
          isLocalhost
            ? 'bg-amber-50/70 border-amber-300 text-amber-900'
            : 'bg-white border-[rgba(79,174,200,0.25)] text-[#3E4347] shadow-soft'
        }`} style={{ borderRadius: '2px' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isLocalhost ? 'text-amber-500' : 'text-[#349282]'}`} />
            <div className="space-y-2 text-xs font-serif_jp flex-1">
              <div>
                <span className="font-semibold text-sm block mb-0.5 text-[#2E7C94]">列印前網址確認</span>
                <span className="text-[#8A9499]">目前卡片 QR Code 將指向下列網址：</span>
                <div className="font-mono text-sm font-semibold text-[#2E7C94] bg-[#F9FBFA] px-3 py-1.5 border border-[rgba(79,174,200,0.25)] mt-1 inline-block" style={{ borderRadius: '2px' }}>
                  {currentOrigin}/vote?t=TOKEN
                </div>
              </div>

              {isLocalhost && (
                <p className="text-amber-700 font-medium">
                  ⚠️ 警告：目前處於本機開發環境（localhost）。正式活動列印請務必在部署後的正式網域（*.workers.dev）開啟此頁面，避免印出無法掃描的本地網址！
                </p>
              )}

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={domainConfirmed}
                  onChange={e => setDomainConfirmed(e.target.checked)}
                  className="rounded border-[rgba(79,174,200,0.4)] text-[#349282] focus:ring-[#349282]"
                />
                <span className="font-medium text-[#3E4347]">
                  我已確認上方網址為正確的正式網址，允許進行列印
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 控制工具列 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-[rgba(79,174,200,0.25)] p-4 shadow-soft" style={{ borderRadius: '2px' }}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-serif_jp">
            <span className="text-[#8A9499] font-medium mr-1">列印範圍：</span>
            <button
              onClick={() => setPrintScope('unused')}
              className={`px-3 py-1.5 text-xs font-serif_jp font-medium transition-all ${
                printScope === 'unused'
                  ? 'bg-[#EDF8F4] text-[#2E7C94] border border-[rgba(79,174,200,0.4)] shadow-sm'
                  : 'bg-[#F9FBFA] text-[#8A9499] hover:text-[#2E7C94]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              全部未使用 ({tokens.filter(t => t.status === 'unused').length})
            </button>
            <button
              onClick={() => setPrintScope('all')}
              className={`px-3 py-1.5 text-xs font-serif_jp font-medium transition-all ${
                printScope === 'all'
                  ? 'bg-[#EDF8F4] text-[#2E7C94] border border-[rgba(79,174,200,0.4)] shadow-sm'
                  : 'bg-[#F9FBFA] text-[#8A9499] hover:text-[#2E7C94]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              全部卡片 ({tokens.length})
            </button>
            <button
              onClick={() => setPrintScope('custom')}
              className={`px-3 py-1.5 text-xs font-serif_jp font-medium transition-all ${
                printScope === 'custom'
                  ? 'bg-[#EDF8F4] text-[#2E7C94] border border-[rgba(79,174,200,0.4)] shadow-sm'
                  : 'bg-[#F9FBFA] text-[#8A9499] hover:text-[#2E7C94]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              自訂勾選 ({selectedTokens.size})
            </button>
          </div>

          <button
            onClick={handlePrint}
            disabled={!domainConfirmed || tokensToPrint.length === 0 || generatingQRs}
            className="px-5 py-2.5 btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs font-serif_jp tracking-wider"
          >
            {generatingQRs ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#ECE2A6]" />
                <span>QR 產生中...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4 text-[#ECE2A6]" />
                <span>立即列印 (共 {tokensToPrint.length} 張 / {tokenPages.length} 頁 A4)</span>
              </>
            )}
          </button>
        </div>

        {/* 自訂勾選清單 (若切換為自訂勾選) */}
        {printScope === 'custom' && (
          <div className="bg-white border border-[rgba(79,174,200,0.25)] p-4 space-y-3 shadow-soft" style={{ borderRadius: '2px' }}>
            <span className="text-xs font-serif_jp font-medium text-[#2E7C94]">點選欲列印的卡片短碼：</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {tokens.map(t => {
                const isChecked = selectedTokens.has(t.token)
                return (
                  <button
                    key={t.token}
                    onClick={() => handleToggleSelect(t.token)}
                    className={`p-2 border text-xs font-mono flex items-center justify-between transition-all ${
                      isChecked
                        ? 'bg-[#EDF8F4] text-[#2E7C94] border-[rgba(79,174,200,0.45)]'
                        : 'bg-[#F9FBFA] text-[#8A9499] border-[rgba(79,174,200,0.2)]'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <span>{formatShortCode(t.token)}</span>
                    {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-[#349282]" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 列印預覽 / 實際列印區域（含 @media print 樣式） */}
      <div className="print-area mt-8 print:mt-0">
        {loading ? (
          <div className="p-12 text-center text-[#349282] text-sm animate-pulse print:hidden font-serif_jp">
            {i18n.common.loading}
          </div>
        ) : tokensToPrint.length === 0 ? (
          <div className="p-8 text-center text-[#8A9499] font-serif_jp text-sm print:hidden">
            目前無符合列印條件的卡片。
          </div>
        ) : (
          tokenPages.map((pageTokens, pageIndex) => (
            <div
              key={pageIndex}
              className="a4-page bg-white text-black p-[10mm] mx-auto shadow-2xl rounded-sm print:shadow-none print:rounded-none mb-8 print:mb-0"
              style={{
                width: '210mm',
                minHeight: '297mm',
                pageBreakAfter: pageIndex < tokenPages.length - 1 ? 'always' : 'auto',
                breakAfter: pageIndex < tokenPages.length - 1 ? 'page' : 'auto',
              }}
            >
              {/* 4 欄 × 5 列網格，剛好容納 20 張卡片 */}
              <div className="grid grid-cols-4 grid-rows-5 gap-2 w-full h-[277mm]">
                {pageTokens.map(item => (
                  <div
                    key={item.token}
                    className="border border-dashed border-[#92C5B7]/60 p-2 flex flex-col items-center justify-between text-center bg-white relative overflow-hidden"
                    style={{ height: '53mm', width: '45.5mm', borderRadius: '2px' }}
                  >
                    {/* 卡片標題（宋體 + 雙色標） */}
                    <div className="text-[9.5px] font-serif_jp font-medium text-[#3E4347] tracking-wider flex items-center gap-1">
                      <span className="text-[#349282]">✦</span>
                      <span>
                        <span className="text-[#349282]">聖</span>
                        <span className="text-[#2E7C94]">誕</span>
                        <span>廚藝 · 投票卡</span>
                      </span>
                    </div>

                    {/* QR Code 圖片 */}
                    <div className="w-[31mm] h-[31mm] flex items-center justify-center my-0.5">
                      {item.qrDataUrl ? (
                        <img
                          src={item.qrDataUrl}
                          alt="Vote QR"
                          className="w-[30mm] h-[30mm] object-contain"
                        />
                      ) : (
                        <div className="w-[30mm] h-[30mm] bg-[#F9FBFA] flex items-center justify-center text-[9px] text-[#8A9499]">
                          產生中...
                        </div>
                      )}
                    </div>

                    {/* 分組短碼 */}
                    <div className="font-mono text-[10.5px] font-bold tracking-widest text-[#2E7C94] border-y border-[rgba(79,174,200,0.3)] w-full py-0.5 bg-[#F9FBFA]" style={{ borderRadius: '2px' }}>
                      {formatShortCode(item.token)}
                    </div>

                    {/* 說明文字與微型水印 */}
                    <div className="text-[7.5px] font-serif_jp text-[#8A9499] leading-tight">
                      {i18n.print.instructions}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 列印專屬 CSS 注入 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-page {
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </AdminLayout>
  )
}
