import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, QrCode, Printer, LogOut, Copy, Check, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { i18n } from '../i18n/zh-TW'
import BrandLogo from './BrandLogo'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [copiedLink, setCopiedLink] = useState<'vote' | 'results' | null>(null)

  useEffect(() => {
    // 檢查管理員身分有效性
    api.getAdminOverview()
      .then(() => setCheckingAuth(false))
      .catch(() => {
        navigate('/admin/login', { replace: true })
      })
  }, [navigate])

  const handleLogout = async () => {
    try {
      await api.adminLogout()
    } finally {
      navigate('/admin/login', { replace: true })
    }
  }

  // 一鍵複製便捷功能
  const handleCopy = (type: 'vote' | 'results') => {
    const origin = window.location.origin
    const url = type === 'vote' ? `${origin}/vote` : `${origin}/results`
    navigator.clipboard.writeText(url)
    setCopiedLink(type)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 border-2 border-[rgba(79,174,200,0.3)] border-t-[#4FAEC8] animate-spin mb-3" style={{ borderRadius: '2px' }} />
        <p className="text-[#349282] font-serif_jp text-xs tracking-widest">{i18n.common.loading}</p>
      </div>
    )
  }

  const navItems = [
    { path: '/admin', label: i18n.admin.overviewTitle, icon: LayoutDashboard, exact: true },
    { path: '/admin/dishes', label: i18n.admin.dishesTitle, icon: UtensilsCrossed },
    { path: '/admin/tokens', label: i18n.admin.tokensTitle, icon: QrCode },
    { path: '/admin/print', label: i18n.admin.printTitle, icon: Printer },
  ]

  return (
    <div className="min-h-screen bg-[#F9FBFA] text-[#3E4347] font-serif_jp flex flex-col select-none">
      {/* 頂部導航列 (桌機完整選單，手機精簡操作；列印時強制隱藏) */}
      <header className="print:hidden bg-white/95 border-b border-[rgba(79,174,200,0.25)] backdrop-blur-md sticky top-0 z-40 shadow-soft">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/admin">
              <BrandLogo size="sm" />
            </Link>

            {/* 桌機專屬橫向選單列 */}
            <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
              {navItems.map(item => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path)

                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-serif_jp transition-all ${
                      isActive
                        ? 'bg-[#EDF8F4] text-[#2E7C94] border border-[rgba(79,174,200,0.4)] font-medium shadow-sm'
                        : 'text-[#8A9499] hover:text-[#2E7C94] hover:bg-[#F9FBFA]'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* 快捷操作群（桌機與手機適配） */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => handleCopy('vote')}
              className="inline-flex items-center gap-1 text-[11px] text-[#2E7C94] bg-[#F9FBFA] hover:bg-[#EDF8F4] border border-[rgba(79,174,200,0.3)] px-2 sm:px-2.5 py-1 transition-all"
              style={{ borderRadius: '2px' }}
              title="複製來賓投票頁連結"
            >
              {copiedLink === 'vote' ? <Check className="w-3 h-3 text-[#349282]" /> : <Copy className="w-3 h-3" />}
              <span className="hidden sm:inline">{copiedLink === 'vote' ? '已複製投票連結' : '複製投票連結'}</span>
              <span className="sm:hidden">{copiedLink === 'vote' ? '已複製' : '投票頁'}</span>
            </button>

            <button
              onClick={() => handleCopy('results')}
              className="inline-flex items-center gap-1 text-[11px] text-[#2E7C94] bg-[#F9FBFA] hover:bg-[#EDF8F4] border border-[rgba(79,174,200,0.3)] px-2 sm:px-2.5 py-1 transition-all"
              style={{ borderRadius: '2px' }}
              title="複製大螢幕結果頁連結"
            >
              {copiedLink === 'results' ? <Check className="w-3 h-3 text-[#349282]" /> : <ExternalLink className="w-3 h-3" />}
              <span className="hidden sm:inline">{copiedLink === 'results' ? '已複製結果連結' : '複製結果連結'}</span>
              <span className="sm:hidden">{copiedLink === 'results' ? '已複製' : '大螢幕'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-[#8A9499] hover:text-red-500 hover:bg-red-50 px-2 sm:px-3 py-1.5 transition-all ml-1"
              style={{ borderRadius: '2px' }}
              title={i18n.admin.logoutButton}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{i18n.admin.logoutButton}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主內容區（手機版預留底部 TabBar 空間） */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-6 pb-20 sm:pb-6 print:p-0 print:m-0 print:max-w-none">
        {children}
      </main>

      {/* 手機版專屬底部固定導航列 (iOS Bottom TabBar Style, 列印時隱藏) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-[rgba(79,174,200,0.3)] backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] print:hidden shadow-lg">
        <div className="grid grid-cols-4 h-14">
          {navItems.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path)

            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
                  isActive
                    ? 'text-[#2E7C94] font-bold bg-[#EDF8F4]/50'
                    : 'text-[#8A9499] hover:text-[#2E7C94]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#349282]' : ''}`} />
                <span className="text-[10px] font-serif_jp tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
