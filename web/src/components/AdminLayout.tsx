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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="animate-spin text-3xl mb-3">🎄</div>
        <p className="text-xmas-gold text-sm font-medium">{i18n.common.loading}</p>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 頂部導航列 */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="flex items-center gap-2 font-bold text-base text-xmas-gold tracking-wide">
              <span>🎄</span>
              <span className="hidden sm:inline">{i18n.common.title}</span>
              <span className="text-xs bg-xmas-red/20 text-xmas-red-light px-2 py-0.5 rounded border border-xmas-red/30">管理後台</span>
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-xmas-green/20 text-xmas-gold border border-xmas-gold/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-all"
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
