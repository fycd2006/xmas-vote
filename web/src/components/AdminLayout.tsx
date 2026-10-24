import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, QrCode, Printer, LogOut } from 'lucide-react'
import { api } from '../lib/api'
import { i18n } from '../i18n/zh-TW'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)

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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#7FCBB3]/40 border-t-[#2E7C94] animate-spin mb-3" />
        <p className="text-[#349282] font-serif text-xs tracking-widest">{i18n.common.loading}</p>
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
    <div className="min-h-screen bg-[#F9FCFB] text-[#3E4347] font-serif flex flex-col">
      {/* 頂部導航列 */}
      <header className="bg-white/95 border-b border-[#7FCBB3]/30 backdrop-blur-md sticky top-0 z-40 shadow-[0_2px_10px_rgba(79,174,200,0.05)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="flex items-center gap-2 font-serif font-medium text-base tracking-wide">
              <span className="text-[#349282]">✦</span>
              <span className="hidden sm:inline">
                <span className="text-[#349282]">聖</span>
                <span className="text-[#2E7C94]">誕</span>
                <span className="text-[#3E4347]">廚藝競賽</span>
              </span>
              <span className="text-[11px] font-display italic bg-[#EDF8F4] text-[#349282] px-2 py-0.5 rounded-full border border-[#7FCBB3]/35">
                studio cms
              </span>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
              {navItems.map(item => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path)

                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-serif transition-all ${
                      isActive
                        ? 'bg-[#EDF8F4] text-[#2E7C94] border border-[#7FCBB3]/40 shadow-sm font-medium'
                        : 'text-[#61676C] hover:text-[#2E7C94] hover:bg-[#F0F7F5]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#61676C] hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
            title={i18n.admin.logoutButton}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{i18n.admin.logoutButton}</span>
          </button>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  )
}
