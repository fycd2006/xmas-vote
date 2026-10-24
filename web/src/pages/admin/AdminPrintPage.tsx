import { useEffect, useState, useMemo, useRef } from 'react'
import QRCode from 'qrcode'
import { Printer, Download, CheckSquare, Square, RefreshCw } from 'lucide-react'
import AdminLayout from '../../components/AdminLayout'
import { api, ApiException } from '../../lib/api'
import { i18n } from '../../i18n/zh-TW'

interface PrintToken {
  token: string
  status: 'unused' | 'used' | 'void'
}

function formatShortCode(token: string): string {
  if (token.length === 10) {
    return `${token.slice(0, 5)}-${token.slice(5, 10)}`
  }
  return token
}

export default function AdminPrintPage() {
  const [tokens, setTokens] = useState<PrintToken[]>([])
  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [generatingQRs, setGeneratingQRs] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''

  // 列印範圍：'unused' (全部未使用), 'all', 'custom'
  const [printScope, setPrintScope] = useState<'unused' | 'all' | 'custom'>('unused')
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())

  // 用於防重入與排程的 Ref
  const isGeneratingRef = useRef(false)

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

  // 單次安全批次產生 QR Code 快取（避免阻塞主執行緒與無限迴圈）
  useEffect(() => {
    if (tokens.length === 0 || isGeneratingRef.current) return

    const pendingTokens = tokens.filter(t => !qrMap[t.token])
    if (pendingTokens.length === 0) return

    let isCancelled = false
    isGeneratingRef.current = true
    setGeneratingQRs(true)

    const generateBatch = async () => {
      const newEntries: Record<string, string> = {}
      for (const item of pendingTokens) {
        if (isCancelled) break
        const qrText = `${currentOrigin}/vote?t=${item.token}`
        try {
          const dataUrl = await QRCode.toDataURL(qrText, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 140,
          })
          newEntries[item.token] = dataUrl
        } catch {
          // 容錯跳過
        }
      }

      if (!isCancelled) {
        setQrMap(prev => ({ ...prev, ...newEntries }))
        setGeneratingQRs(false)
        isGeneratingRef.current = false
      }
    }

    generateBatch()

    return () => {
      isCancelled = true
      isGeneratingRef.current = false
    }
  }, [tokens, currentOrigin])

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

  // 一鍵匯出下載已排版好的 A4 自包含 HTML 檔案
  const handleDownloadHtml = () => {
    if (tokensToPrint.length === 0) return

    const pageSize = 20
    const exportPages: PrintToken[][] = []
    for (let i = 0; i < tokensToPrint.length; i += pageSize) {
      exportPages.push(tokensToPrint.slice(i, i + pageSize))
    }

    const pagesHtml = exportPages.map((pageTokens, pIdx) => {
      const cardsHtml = pageTokens.map(item => {
        const qrSrc = qrMap[item.token] || ''
        const code = formatShortCode(item.token)
        return `
          <div class="card">
            <div class="card-header">
              <span class="star">✦</span>
              <span class="title-green">聖</span><span class="title-blue">誕</span><span>廚藝 · 投票卡</span>
            </div>
            <div class="qr-box">
              ${qrSrc ? `<img src="${qrSrc}" alt="QR" class="qr-img" />` : '<div class="no-qr">無 QR</div>'}
            </div>
            <div class="code-box">${code}</div>
            <div class="instruction">${i18n.print.instructions}</div>
          </div>
        `
      }).join('')

      return `
        <div class="a4-page" style="${pIdx < exportPages.length - 1 ? 'page-break-after: always; break-after: page;' : ''}">
          <div class="grid-container">
            ${cardsHtml}
          </div>
        </div>
      `
    }).join('')

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>聖誕廚藝競賽 - A4 專用投票 QR Code 卡片</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Shippori Mincho', 'Yu Mincho', 'Source Han Serif', serif;
      background: #F4F6F5;
      color: #3E4347;
      padding: 20px;
    }
    
    .no-print-bar {
      max-width: 210mm;
      margin: 0 auto 20px auto;
      background: #FFFFFF;
      border: 1px solid rgba(79, 174, 200, 0.35);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 2px;
      box-shadow: 0 4px 16px rgba(46, 124, 148, 0.08);
    }
    .no-print-bar h2 {
      font-size: 16px;
      color: #2E7C94;
      font-weight: 600;
    }
    .no-print-bar p {
      font-size: 12px;
      color: #8A9499;
      margin-top: 4px;
    }
    .print-btn {
      background: #2E7C94;
      color: #FFFFFF;
      border: none;
      padding: 10px 20px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      border-radius: 2px;
      transition: background 0.2s;
    }
    .print-btn:hover { background: #349282; }

    .a4-page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      margin: 0 auto 20px auto;
      background: #FFFFFF;
      padding: 8mm 6mm;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 2px;
      box-sizing: border-box;
      overflow: hidden;
    }
    .grid-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(5, 1fr);
      gap: 4mm;
      width: 100%;
      height: 281mm;
      box-sizing: border-box;
    }
    .card {
      border: 1px dashed rgba(146, 197, 183, 0.7);
      padding: 6px 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      background: #FFFFFF;
      border-radius: 2px;
      height: 52mm;
      width: 46mm;
      margin: 0 auto;
      box-sizing: border-box;
      overflow: hidden;
    }
    .card-header {
      font-size: 9.5px;
      font-weight: 500;
      color: #3E4347;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .star { color: #349282; font-size: 10px; }
    .title-green { color: #349282; }
    .title-blue { color: #2E7C94; }
    .qr-box {
      width: 30mm;
      height: 30mm;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 1px 0;
    }
    .qr-img {
      width: 29mm;
      height: 29mm;
      object-fit: contain;
    }
    .code-box {
      font-family: monospace;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #2E7C94;
      background: #F9FBFA;
      border-top: 1px solid rgba(79, 174, 200, 0.3);
      border-bottom: 1px solid rgba(79, 174, 200, 0.3);
      width: 100%;
      padding: 1.5px 0;
      border-radius: 2px;
    }
    .instruction {
      font-size: 7px;
      color: #8A9499;
      line-height: 1.1;
    }

    @media print {
      body, html {
        background: #FFFFFF !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .no-print-bar { display: none !important; }
      .a4-page {
        margin: 0 !important;
        padding: 8mm 6mm !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: hidden !important;
      }
      .a4-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <h2>✦ 聖誕廚藝競賽 · A4 排版完成 QR Code 卡片</h2>
      <p>共計 ${tokensToPrint.length} 張卡片（${exportPages.length} 頁 A4，每頁 20 張）。直接點擊右側按鈕即可列印或另存為 PDF。</p>
    </div>
    <button class="print-btn" onclick="window.print()">立即列印 / 另存為 PDF</button>
  </div>
  ${pagesHtml}
</body>
</html>`

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `xmas-vote-cards-${Date.now()}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
            A4 格式日系空氣感藏書票排版（每頁 4 欄 × 5 列共 20 張，每張約 45.5 × 53 mm）
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp" style={{ borderRadius: '2px' }}>
            {errorMessage}
          </div>
        )}

        {/* 控制工具列 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-[rgba(79,174,200,0.25)] p-4 shadow-soft" style={{ borderRadius: '2px' }}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-serif_jp">
            <span className="text-[#8A9499] font-medium mr-1">卡片篩選：</span>
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

          <div className="flex items-center gap-2.5">
            {/* 一鍵下載排版好的 A4 離線 HTML 檔案 */}
            <button
              onClick={handleDownloadHtml}
              disabled={tokensToPrint.length === 0}
              className="px-4 py-2.5 bg-white border border-[rgba(79,174,200,0.4)] text-[#2E7C94] hover:bg-[#F9FBFA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs font-serif_jp tracking-wider transition-all shadow-sm"
              style={{ borderRadius: '2px' }}
              title="下載獨立的 A4 排版 HTML 檔案，離線在任何電腦開啟列印"
            >
              <Download className="w-4 h-4 text-[#349282]" />
              <span>下載 A4 卡片檔</span>
            </button>

            {/* 立即觸發列印 */}
            <button
              onClick={handlePrint}
              disabled={tokensToPrint.length === 0}
              className="px-5 py-2.5 btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs font-serif_jp tracking-wider"
            >
              {generatingQRs ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#ECE2A6]" />
                  <span>QR 載入中...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-[#ECE2A6]" />
                  <span>立即列印 (共 {tokensToPrint.length} 張 / {tokenPages.length} 頁)</span>
                </>
              )}
            </button>
          </div>
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
              <div className="grid grid-cols-4 grid-rows-5 gap-[4mm] w-full h-[281mm] box-border">
                {pageTokens.map(item => {
                  const qrDataUrl = qrMap[item.token]
                  return (
                    <div
                      key={item.token}
                      className="border border-dashed border-[#92C5B7]/60 p-1 flex flex-col items-center justify-between text-center bg-white relative overflow-hidden box-border"
                      style={{ height: '52mm', width: '46mm', borderRadius: '2px' }}
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
                      <div className="w-[30mm] h-[30mm] flex items-center justify-center my-0.5">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Vote QR"
                            className="w-[29mm] h-[29mm] object-contain"
                          />
                        ) : (
                          <div className="w-[29mm] h-[29mm] bg-[#F9FBFA] flex items-center justify-center text-[9px] text-[#8A9499]">
                            產生中...
                          </div>
                        )}
                      </div>

                      {/* 分組短碼 */}
                      <div className="font-mono text-[10.5px] font-bold tracking-widest text-[#2E7C94] border-y border-[rgba(79,174,200,0.3)] w-full py-0.5 bg-[#F9FBFA]" style={{ borderRadius: '2px' }}>
                        {formatShortCode(item.token)}
                      </div>

                      {/* 說明文字與微型水印 */}
                      <div className="text-[7px] font-serif_jp text-[#8A9499] leading-tight">
                        {i18n.print.instructions}
                      </div>
                    </div>
                  )
                })}
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
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
          }
          header, nav, footer, .print\\:hidden, [class*="print:hidden"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 210mm !important;
            width: 210mm !important;
          }
          .print-area {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
          }
          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 8mm 6mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
          }
          .a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>
    </AdminLayout>
  )
}
