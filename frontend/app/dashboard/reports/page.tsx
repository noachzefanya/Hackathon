'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { BarChart3, TrendingUp, TrendingDown, Shield } from 'lucide-react'

// Generate realistic synthetic 24h chart data
function gen24h() {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, '0') + ':00'
    const base = i >= 0 && i <= 6 ? 15 : i >= 22 ? 20 : 80
    const approved = Math.floor(base * (0.7 + Math.random() * 0.3))
    const flagged  = Math.floor(base * (0.1 + Math.random() * 0.15))
    const blocked  = Math.floor(base * (0.02 + Math.random() * 0.08))
    return { hour: h, approved, flagged, blocked, total: approved + flagged + blocked }
  })
  return hours
}

function genScoreDist() {
  return [
    { range: '0-10', count: 312 }, { range: '11-20', count: 489 },
    { range: '21-30', count: 623 }, { range: '31-40', count: 201 },
    { range: '41-50', count: 178 }, { range: '51-60', count: 134 },
    { range: '61-70', count: 89 },  { range: '71-80', count: 56 },
    { range: '81-90', count: 34 },  { range: '91-100', count: 18 },
  ]
}

const PIE_DATA = [
  { name: 'Disetujui', value: 2047, color: '#10b981' },
  { name: 'Step-Up',   value: 602,  color: '#f59e0b' },
  { name: 'Diblokir',  value: 108,  color: '#ef4444' },
]

const TOP_MERCHANTS = [
  { name: 'Tokopedia', blocked: 23, flagged: 67 },
  { name: 'Shopee',    blocked: 18, flagged: 54 },
  { name: 'Gojek',     blocked: 14, flagged: 39 },
  { name: 'OVO',       blocked: 11, flagged: 28 },
  { name: 'Dana',      blocked: 9,  flagged: 22 },
]

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(222,25%,10%)',
  border: '1px solid hsl(222,20%,18%)',
  borderRadius: '8px',
  color: 'hsl(210,40%,96%)',
  fontSize: 12,
}

export default function ReportsPage() {
  const hourlyData = useMemo(gen24h, [])
  const scoreDist  = useMemo(genScoreDist, [])
  const total = PIE_DATA.reduce((s, d) => s + d.value, 0)
  const fraudRate = ((PIE_DATA[1].value + PIE_DATA[2].value) / total * 100).toFixed(1)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan & Tren Fraud</h1>
        <p className="text-sm text-muted-foreground">Analisis 24 jam terakhir — data dari Azure Monitor</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Total Transaksi',  value: total.toLocaleString('id'), icon: BarChart3,   color: 'text-guardian-400' },
          { label: 'Fraud Rate',       value: `${fraudRate}%`,            icon: TrendingUp,  color: 'text-red-400' },
          { label: 'Diblokir',         value: '108',                       icon: Shield,      color: 'text-red-400' },
          { label: 'Avg Risk Score',   value: '24.3',                      icon: TrendingDown,color: 'text-emerald-400' },
        ].map(k => (
          <div key={k.label} className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`mt-1 text-3xl font-extrabold ${k.color}`}>{k.value}</p>
              </div>
              <div className={`rounded-xl p-2 ${k.color.replace('text-','bg-').replace('400','500/15')}`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hourly area chart */}
      <div className="glass-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Tren Transaksi per Jam (24 Jam)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {[['approved','#10b981'],['flagged','#f59e0b'],['blocked','#ef4444']].map(([k,c]) => (
                <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="approved" stroke="#10b981" fill="url(#g-approved)" strokeWidth={2} name="Disetujui" />
            <Area type="monotone" dataKey="flagged"  stroke="#f59e0b" fill="url(#g-flagged)"  strokeWidth={2} name="Step-Up" />
            <Area type="monotone" dataKey="blocked"  stroke="#ef4444" fill="url(#g-blocked)"  strokeWidth={2} name="Diblokir" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score distribution */}
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Distribusi Risk Score</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreDist} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,20%,16%)" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name="Jumlah" radius={[4,4,0,0]}>
                {scoreDist.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#10b981' : i < 7 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Komposisi Keputusan</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {PIE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {PIE_DATA.map(d => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <div>
                    <div className="text-sm font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.value.toLocaleString('id')} ({(d.value/total*100).toFixed(1)}%)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top merchants */}
      <div className="glass-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Top Merchant dengan Aktivitas Fraud</h2>
        <div className="space-y-3">
          {TOP_MERCHANTS.map((m, i) => (
            <div key={m.name} className="flex items-center gap-4">
              <span className="w-4 text-xs text-muted-foreground font-mono">{i+1}</span>
              <span className="w-24 text-sm font-medium">{m.name}</span>
              <div className="flex-1 flex gap-2">
                <div className="flex-1 bg-border/50 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${m.flagged/90*100}%` }} />
                </div>
                <span className="text-xs text-amber-400 w-16 text-right">{m.flagged} flagged</span>
              </div>
              <span className="badge-high text-xs">{m.blocked} blocked</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
