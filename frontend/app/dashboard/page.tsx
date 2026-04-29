'use client'

import { useEffect, useRef } from 'react'
import { Activity, ShieldAlert, ShieldCheck, AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { formatCurrency, getRiskBadgeClass, formatDate, getScoreColor } from '@/lib/utils'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/transactions'

function ScoreRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = getScoreColor(score)
  return (
    <div className="relative flex h-14 w-14 items-center justify-center flex-shrink-0">
      <svg className="score-ring -rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={r} strokeWidth="4" className="fill-none stroke-border" />
        <circle cx="28" cy="28" r={r} strokeWidth="4" fill="none" stroke={color}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number | string; sub: string; color: string
}) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-1 text-3xl font-extrabold ${color}`}>{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={`rounded-xl p-2 ${color.replace('text-', 'bg-').replace('400', '500/15')}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { transactions, addTransaction, updateStats, setWsConnected, wsConnected, stats, setSelectedTx, selectedTx } = useDashboardStore()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => setWsConnected(true)
      ws.onclose = () => { setWsConnected(false); setTimeout(connect, 3000) }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'transaction') {
            addTransaction(msg.data)
            updateStats(msg.data)
          }
        } catch {}
      }
    }
    connect()
    return () => wsRef.current?.close()
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-gradient">Live Transaction Feed</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time scoring via WebSocket — {transactions.length} transaksi sesi ini</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg transition-all ${wsConnected ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 glow-green' : 'border-border bg-secondary text-muted-foreground'}`}>
          {wsConnected ? <><span className="pulse-dot scale-75" /> Live Scoring Active</> : <><span className="h-2 w-2 rounded-full bg-muted-foreground" /> Offline</>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={Zap} label="Total Transaksi" value={stats.total} sub="sesi ini" color="text-guardian-400" />
        <StatCard icon={ShieldCheck} label="Disetujui" value={stats.approved} sub="risiko rendah" color="text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Step-Up MFA" value={stats.flagged} sub="risiko sedang" color="text-amber-400" />
        <StatCard icon={ShieldAlert} label="Diblokir" value={stats.blocked} sub="risiko tinggi" color="text-red-400" />
      </div>

      {/* Transaction table */}
      <div className={`glass-card overflow-hidden transition-all duration-500 ${wsConnected ? 'glow-strong-indigo border-guardian-500/30' : ''}`}>
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-3.5 bg-secondary/20">
          <Activity className="h-4 w-4 text-guardian-400" />
          <span className="text-sm font-semibold text-foreground">Transaksi Terbaru</span>
          {wsConnected && <span className="ml-auto pulse-dot" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground">
                <th className="px-5 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Merchant</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Skor</th>
                <th className="px-4 py-3 text-center">Level</th>
                <th className="px-4 py-3 text-center">Aksi</th>
                <th className="px-4 py-3 text-left">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    Menunggu transaksi masuk…
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr
                  key={tx.transaction_id}
                  className="tx-row cursor-pointer"
                  onClick={() => setSelectedTx(tx)}
                >
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{tx.transaction_id.slice(-8)}</td>
                  <td className="px-4 py-3 font-medium">{tx.user_id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tx.merchant_id}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(tx.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center"><ScoreRing score={tx.risk_score} /></div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={getRiskBadgeClass(tx.risk_level)}>{tx.risk_level}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${tx.action === 'approve' ? 'text-emerald-400' : tx.action === 'step_up' ? 'text-amber-400' : 'text-red-400'}`}>
                      {tx.action === 'approve' ? 'APPROVE' : tx.action === 'step_up' ? 'STEP-UP' : 'BLOCK'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(tx.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* XAI Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedTx(null)}>
          <div className="flex-1 bg-black/50 backdrop-blur-sm" />
          <div className="animate-slide-in-right w-96 border-l border-border bg-card p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Detail Transaksi</h2>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedTx(null)}>✕</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <ScoreRing score={selectedTx.risk_score} />
              <div>
                <span className={getRiskBadgeClass(selectedTx.risk_level)}>{selectedTx.risk_level.toUpperCase()}</span>
                <p className="mt-1 text-sm text-muted-foreground">{selectedTx.merchant_id}</p>
                <p className="text-lg font-bold">{formatCurrency(selectedTx.amount)}</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              {[
                ['Transaction ID', selectedTx.transaction_id],
                ['User ID', selectedTx.user_id],
                ['Kota', selectedTx.city],
                ['Waktu', formatDate(selectedTx.timestamp)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono text-xs">{v}</span>
                </div>
              ))}
            </div>
            {selectedTx.reasons.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Alasan AI (SHAP)</h3>
                <div className="space-y-2">
                  {selectedTx.reasons.map((r, i) => (
                    <div key={i} className="rounded-lg border border-border/50 bg-secondary/40 p-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{r.description}</span>
                        <span className="text-red-400 font-mono">+{(r.impact * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(r.impact * 200, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
