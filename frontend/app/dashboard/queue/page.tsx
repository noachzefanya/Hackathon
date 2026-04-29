'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, CheckCircle, RefreshCw, Clock } from 'lucide-react'
import { apiGetQueueTransactions } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

const fetcher = () => apiGetQueueTransactions({ page: 1, page_size: 50 })

export default function QueuePage() {
  const { data, isLoading, mutate } = useSWR('queue', fetcher, { refreshInterval: 10000 })
  const [resolving, setResolving] = useState<string | null>(null)

  const items: any[] = data?.items ?? []
  const total: number = data?.total ?? 0

  const handleAction = async (id: string) => {
    setResolving(id)
    await new Promise(r => setTimeout(r, 600))
    setResolving(null)
    mutate()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Antrian Review Manual</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Transaksi dengan skor risiko &gt; 70</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-high text-sm px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {total} Pending
          </span>
          <button id="btn-refresh-queue" onClick={() => mutate()} className="btn-secondary py-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Pending', value: total, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
          { label: 'Critical (>85)', value: items.filter(t => t.risk_score > 85).length, color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
          { label: 'Diproses Hari Ini', value: 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
        ].map(c => (
          <div key={c.label} className="metric-card flex-row items-center gap-4">
            <div className={`rounded-xl p-3 ${c.bg}`}><c.icon className={`h-5 w-5 ${c.color}`} /></div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-border/50 px-5 py-3.5 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-sm font-semibold">Transaksi Terblokir</span>
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
                <th className="px-4 py-3 text-left">Waktu</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 rounded shimmer bg-border" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                  Tidak ada transaksi pending
                </td></tr>
              )}
              {items.map((tx: any) => (
                <tr key={tx.id} className="tx-row">
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{String(tx.id).slice(-12)}</td>
                  <td className="px-4 py-3.5 font-medium">{tx.user_id}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{tx.merchant_id}</td>
                  <td className="px-4 py-3.5 text-right font-mono">{formatCurrency(Number(tx.amount))}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="badge-high font-mono font-bold text-sm px-3">{tx.risk_score}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDate(tx.created_at)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button id={`btn-approve-${tx.id}`} onClick={() => handleAction(tx.id)}
                        disabled={resolving === tx.id}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                        {resolving === tx.id ? '…' : 'Setujui'}
                      </button>
                      <button id={`btn-reject-${tx.id}`} onClick={() => handleAction(tx.id)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors">
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
