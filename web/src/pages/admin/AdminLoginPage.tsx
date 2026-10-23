import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { api, ApiException } from '../../lib/api'
import { i18n } from '../../i18n/zh-TW'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setErrorMessage(null)

    try {
      await api.adminLogin(password.trim())
      navigate('/admin', { replace: true })
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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-xmas-green/20 border border-xmas-gold/40 rounded-full flex items-center justify-center text-xmas-gold text-2xl shadow-inner">
          <Lock className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-slate-100 tracking-wide mb-1">
          {i18n.admin.loginTitle}
        </h1>
        <p className="text-xs text-slate-400 mb-6">
          {i18n.common.title} 後台管理系統
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2 text-left animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={i18n.admin.passwordPlaceholder}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-xmas-gold focus:ring-1 focus:ring-xmas-gold rounded-xl text-center text-white placeholder:text-slate-500 text-sm transition-all outline-none"
            autoFocus
          />

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-3 bg-gradient-to-r from-xmas-red to-xmas-red-dark hover:from-xmas-red-hover hover:to-xmas-red text-white text-sm font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{i18n.common.loading}</span>
              </>
            ) : (
              <>
                <span>{i18n.admin.loginButton}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
