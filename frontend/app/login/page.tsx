'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
import { apiLogin } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin_demo_guardianflow')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiLogin(email, password)
      localStorage.setItem('gf_token', res.access_token)
      router.push('/dashboard')
    } catch {
      setError('Username atau password salah. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-guardian-600 shadow-xl shadow-guardian-600/30 animate-pulse-glow">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">GuardianFlow AI</h1>
          <p className="text-sm text-muted-foreground">Masuk ke dashboard fraud detection</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card p-6 space-y-4">
          <div>
            <label htmlFor="input-username" className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
            <input
              id="input-username"
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm focus:border-guardian-500 focus:outline-none focus:ring-1 focus:ring-guardian-500/50"
              required
            />
          </div>
          <div>
            <label htmlFor="input-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <input
                id="input-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 pr-10 text-sm focus:border-guardian-500 focus:outline-none focus:ring-1 focus:ring-guardian-500/50"
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button id="btn-login" type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Masuk'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          GuardianFlow AI © 2024 — Azure Southeast Asia
        </p>
      </div>
    </main>
  )
}
