'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { GitBranch, Search, Info, Loader2 } from 'lucide-react'
import { apiGetGraph } from '@/lib/api'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false, loading: () => (
  <div className="flex h-full items-center justify-center text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
)})

const NODE_COLORS: Record<string, string> = {
  ip: '#60a5fa',
  device: '#fb923c',
  user: '#f87171',
}

export default function GraphPage() {
  const [entityId, setEntityId] = useState('')
  const [inputVal, setInputVal] = useState('')
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] } | null>(null)
  const [meta, setMeta] = useState<{ fraud_cluster: boolean; cluster_size: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = useCallback(async () => {
    const id = inputVal.trim()
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await apiGetGraph(id)
      setEntityId(id)
      setMeta({ fraud_cluster: res.fraud_cluster, cluster_size: res.cluster_size })
      setGraphData({
        nodes: res.nodes.map((n: any) => ({
          id: n.id, label: n.label, value: n.value,
          fraud_score: n.fraud_score,
          color: NODE_COLORS[n.label] ?? '#94a3b8',
          val: 4 + n.fraud_score * 10,
        })),
        links: res.edges.map((e: any) => ({
          source: e.source, target: e.target,
          value: e.weight,
        })),
      })
    } catch (e: any) {
      setError('Gagal mengambil data graph. Coba entity ID lain.')
    } finally {
      setLoading(false)
    }
  }, [inputVal])

  return (
    <div className="flex h-screen flex-col p-6 gap-4 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Graph Link Analysis</h1>
        <p className="text-sm text-muted-foreground">Visualisasi jaringan fraud — IP, perangkat, dan pengguna</p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="input-entity-id"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Masukkan IP, device_id, atau user_id…"
            className="w-full rounded-lg border border-border bg-secondary/50 pl-10 pr-4 py-2.5 text-sm focus:border-guardian-500 focus:outline-none focus:ring-1 focus:ring-guardian-500/50"
          />
        </div>
        <button id="btn-graph-search" onClick={search} disabled={loading} className="btn-primary px-6">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><GitBranch className="h-4 w-4" /> Analisis</>}
        </button>
        <button className="btn-secondary px-4" onClick={() => { setInputVal('103.28.3.100'); setTimeout(search, 50) }}>Demo</button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Cluster badge */}
      {meta && (
        <div className={`flex items-center gap-3 rounded-xl border p-4 ${meta.fraud_cluster ? 'border-red-500/30 bg-red-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
          <Info className={`h-5 w-5 ${meta.fraud_cluster ? 'text-red-400' : 'text-emerald-400'}`} />
          <div>
            <p className={`text-sm font-semibold ${meta.fraud_cluster ? 'text-red-400' : 'text-emerald-400'}`}>
              {meta.fraud_cluster ? '⚠️ Fraud Cluster Terdeteksi!' : '✅ Tidak Ada Cluster Fraud'}
            </p>
            <p className="text-xs text-muted-foreground">
              {meta.cluster_size} node terhubung — entity: {entityId}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(NODE_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            {label === 'ip' ? 'IP Address' : label === 'device' ? 'Perangkat' : 'Pengguna'}
          </div>
        ))}
        <span className="ml-auto">Ukuran node = fraud score</span>
      </div>

      {/* Graph canvas */}
      <div className="glass-card flex-1 overflow-hidden min-h-0">
        {!graphData && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <GitBranch className="h-12 w-12 opacity-30" />
            <p className="text-sm">Masukkan entity ID untuk mulai analisis graph</p>
          </div>
        )}
        {graphData && (
          <ForceGraph2D
            graphData={graphData}
            nodeColor={(n: any) => n.color}
            nodeVal={(n: any) => n.val}
            nodeLabel={(n: any) => `${n.label}: ${n.value}\nFraud score: ${(n.fraud_score * 100).toFixed(0)}%`}
            linkWidth={(l: any) => Math.log(l.value + 1) + 1}
            linkColor={() => 'rgba(99,102,241,0.4)'}
            backgroundColor="transparent"
            width={undefined}
            height={undefined}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const r = (node.val || 4)
              ctx.beginPath()
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
              ctx.fillStyle = node.color
              ctx.fill()
              if (globalScale > 1.5) {
                ctx.fillStyle = 'rgba(255,255,255,0.8)'
                ctx.font = `${10 / globalScale}px Inter`
                ctx.textAlign = 'center'
                ctx.fillText(node.value, node.x, node.y + r + 8 / globalScale)
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
