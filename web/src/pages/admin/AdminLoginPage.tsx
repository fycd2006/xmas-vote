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
    <div className="min-h-screen bg-white text-[#3E4347] font-serif flex items-center justify-center p-4 relative overflow-hidden">
      {/* 柔和散景底色 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-[#7FCBB3]/25 via-[#4FAEC8]/20 to-[#ECE2A6]/25 blur-3xl pointer-events-none animate-bokeh" />
      <div className="refraction-slash top-24 -left-10 w-96 opacity-50" />

      <div className="w-full max-w-sm bg-white/95 border border-[#7FCBB3]/40 rounded-2xl p-7 shadow-[0_16px_40px_rgba(79,174,200,0.12)] backdrop-blur-md text-center relative z-10">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-tr from-[#7FCBB3]/25 to-[#4FAEC8]/30 border border-[#7FCBB3]/40 rounded-full flex items-center justify-center text-[#2E7C94] shadow-sm">
          <Lock className="w-6 h-6 text-[#349282]" />
        </div>

        <div className="relative inline-block mb-1">
          <div className="framing-corner-tl" />
          <div className="framing-corner-br" />
          <h1 className="text-xl font-serif font-medium text-[#2E7C94] tracking-wider">
            {i18n.admin.loginTitle}
          </h1>
        </div>
        <p className="font-display italic text-[11px] tracking-[0.2em] text-[#92C5B7] uppercase mb-6">
          editorial admin portal
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-serif flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={i18n.admin.passwordPlaceholder}
            className="w-full px-4 py-3 bg-[#F9FCFB] border border-[#7FCBB3]/40 focus:border-[#2E7C94] focus:ring-2 focus:ring-[#2E7C94]/20 rounded-xl text-center text-[#3E4347] placeholder:text-slate-400 text-sm font-sans transition-all outline-none"
            autoFocus
          />

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-3 bg-gradient-to-r from-[#349282] to-[#2E7C94] hover:opacity-95 text-white text-sm font-serif tracking-widest font-medium rounded-xl shadow-[0_4px_16px_rgba(46,124,148,0.25)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{i18n.common.loading}</span>
              </>
            ) : (
              <>
                <span>{i18n.admin.loginButton}</span>
                <ArrowRight className="w-4 h-4 text-[#ECE2A6]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
