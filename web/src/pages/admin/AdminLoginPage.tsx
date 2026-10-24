import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { api, ApiException } from '../../lib/api'
import { i18n } from '../../i18n/zh-TW'
import BrandLogo from '../../components/BrandLogo'

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
    <div className="min-h-screen bg-white text-[#3E4347] font-serif_jp flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none">
      {/* 柔和散景底色 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-[#7FCBB3]/25 via-[#4FAEC8]/20 to-[#ECE2A6]/25 blur-3xl pointer-events-none animate-bokeh" />
      <div className="refraction-slash top-24 -left-10 w-96 opacity-50" />

      <header className="max-w-md mx-auto w-full pt-4 flex justify-center">
        <BrandLogo size="md" />
      </header>

      <main className="max-w-sm mx-auto w-full my-auto py-8 relative z-10 animate-reveal">
        <div className="bg-white/95 border border-[rgba(79,174,200,0.35)] p-8 shadow-soft backdrop-blur-md text-center relative" style={{ borderRadius: '2px' }}>
          <div className="w-14 h-14 mx-auto mb-4 border border-[rgba(79,174,200,0.3)] bg-gradient-to-tr from-[#7FCBB3]/25 to-[#4FAEC8]/30 flex items-center justify-center text-[#2E7C94] shadow-sm" style={{ borderRadius: '2px' }}>
            <Lock className="w-6 h-6 text-[#349282]" />
          </div>

          <div className="relative inline-block mb-1">
            <div className="framing-corner-tl" />
            <div className="framing-corner-br" />
            <h1 className="text-xl font-serif_jp font-medium text-[#2E7C94] tracking-wider">
              {i18n.admin.loginTitle}
            </h1>
          </div>
          <p className="font-display italic text-[11px] tracking-[0.2em] text-[#92C5B7] uppercase mb-6">
            editorial management console
          </p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-serif_jp flex items-center gap-2 text-left" style={{ borderRadius: '2px' }}>
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
              className="w-full px-4 py-3 bg-[#F9FBFA] border border-[rgba(79,174,200,0.35)] focus:border-[#2E7C94] text-center text-[#3E4347] placeholder:text-slate-400 text-sm font-sans outline-none transition-all"
              style={{ borderRadius: '2px' }}
              autoFocus
            />

            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="w-full py-3 btn-primary text-sm flex items-center justify-center gap-2 tracking-widest disabled:opacity-40"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" style={{ borderRadius: '2px' }} />
                  <span>驗證中...</span>
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
      </main>

      <footer className="max-w-md mx-auto w-full text-center text-[10px] font-display italic text-[#8A9499] pb-2">
        FYCD HD CULINARY STUDIO MANAGEMENT
      </footer>
    </div>
  )
}
