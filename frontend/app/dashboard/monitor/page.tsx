'use client'

import { Monitor, ExternalLink, RefreshCw, Activity, AlertTriangle, Zap, GitBranch } from 'lucide-react'

const WORKBOOK_URL = process.env.NEXT_PUBLIC_MONITOR_WORKBOOK_URL ?? ''

const KQL_SAMPLES = [
  {
    title: 'Fraud Events (24h)',
    description: 'Breakdown fraud_blocked, fraud_stepup, fraud_approved per jam',
    kql: `customEvents
| where timestamp > ago(24h)
| where customDimensions["fraud.event"] in (
    "fraud_blocked", "fraud_stepup", "fraud_approved")
| summarize count() by
    bin(timestamp, 1h),
    tostring(customDimensions["fraud.event"])
| render timechart`,
  },
  {
    title: 'Scoring Latency p95',
    description: 'Persentil latency prediksi model ML',
    kql: `customMetrics
| where name == "model.latency_ms"
| where timestamp > ago(1h)
| summarize
    p50 = percentile(value, 50),
    p95 = percentile(value, 95),
    p99 = percentile(value, 99)
  by bin(timestamp, 5m)
| render timechart`,
  },
  {
    title: 'Graph Cluster Detections',
    description: 'Jaringan sindikat yang terdeteksi via Cosmos Gremlin',
    kql: `customEvents
| where timestamp > ago(7d)
| where customDimensions["fraud.event"] == "graph_cluster_found"
| summarize
    clusters = count(),
    avg_size = avg(toint(customDimensions["graph.cluster_size"]))
  by bin(timestamp, 1d)
| render barchart`,
  },
  {
    title: 'Exception Rate',
    description: 'Tingkat error — trigger alert jika > 5%',
    kql: `exceptions
| where timestamp > ago(1h)
| summarize error_count = count() by bin(timestamp, 5m)
| join kind=leftouter (
    requests | summarize total = count() by bin(timestamp, 5m)
) on timestamp
| extend error_rate = todouble(error_count) / total * 100
| render timechart`,
  },
]

const ALERT_RULES = [
  { name: 'Fraud Spike Alert', condition: 'fraud_blocked > 50 dalam 5 menit', channel: 'Email + Slack #fraud-alert', severity: 'critical' },
  { name: 'Latency P95 Alert', condition: 'scoring_latency_ms p95 > 500ms', channel: 'Email engineering team', severity: 'medium' },
  { name: 'Exception Rate',    condition: 'exception_rate > 5%',              channel: 'PagerDuty webhook',     severity: 'high' },
  { name: 'Graph Cluster',     condition: 'graph_cluster_found = true',        channel: 'Slack #fraud-alert',    severity: 'high' },
]

export default function MonitorPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Azure Monitor Dashboard</h1>
          <p className="text-sm text-muted-foreground">Application Insights + Log Analytics Workspace</p>
        </div>
        {WORKBOOK_URL && (
          <a href={WORKBOOK_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <ExternalLink className="h-4 w-4" /> Buka Azure Portal
          </a>
        )}
      </div>

      {/* Embedded workbook or placeholder */}
      <div className="glass-card overflow-hidden" style={{ height: 480 }}>
        {WORKBOOK_URL ? (
          <iframe src={WORKBOOK_URL} className="h-full w-full border-0" title="Azure Monitor Workbook" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <Monitor className="h-16 w-16 opacity-20" />
            <div className="text-center">
              <p className="font-semibold text-foreground">Azure Monitor Workbook</p>
              <p className="text-sm mt-1">Set <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">NEXT_PUBLIC_MONITOR_WORKBOOK_URL</code> untuk embed workbook</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 w-full max-w-lg px-4 sm:px-8">
              {[
                { icon: Activity,      label: 'Fraud Rate Chart',         desc: 'Real-time fraud event trends' },
                { icon: Zap,           label: 'Scoring Latency p50/95/99', desc: 'Model inference performance' },
                { icon: AlertTriangle, label: 'Top Blocked IPs',           desc: 'Malicious IP leaderboard' },
                { icon: GitBranch,     label: 'Cluster Detections',        desc: 'Graph fraud syndicate alerts' },
              ].map(tile => (
                <div key={tile.label} className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                  <tile.icon className="h-5 w-5 text-guardian-400 mb-2" />
                  <p className="text-xs font-semibold text-foreground">{tile.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tile.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alert Rules */}
      <div className="glass-card p-5">
        <h2 className="mb-4 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Alert Rules (Azure Monitor)
        </h2>
        <div className="space-y-3">
          {ALERT_RULES.map(r => (
            <div key={r.name} className="flex items-center gap-4 rounded-lg border border-border/50 bg-secondary/30 px-4 py-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${
                r.severity === 'critical' ? 'bg-red-500/15 text-red-400' :
                r.severity === 'high'     ? 'bg-orange-500/15 text-orange-400' :
                'bg-amber-500/15 text-amber-400'}`}>
                {r.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{r.condition}</p>
              </div>
              <span className="text-xs text-muted-foreground hidden lg:block">{r.channel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KQL samples */}
      <div className="glass-card p-5">
        <h2 className="mb-4 text-sm font-semibold">KQL Query Samples — Log Analytics</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {KQL_SAMPLES.map(q => (
            <div key={q.title} className="rounded-xl border border-border/50 bg-secondary/20 overflow-hidden">
              <div className="border-b border-border/50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold">{q.title}</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(q.kql)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Copy
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap">{q.kql}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
