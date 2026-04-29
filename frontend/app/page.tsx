import Link from 'next/link'
import { Shield, Zap, BarChart3, GitBranch, Lock, Activity, ChevronRight, ArrowRight, CheckCircle } from 'lucide-react'

const FEATURES = [
  { icon: Zap,        title: 'Scoring Real-Time',   desc: 'Latency < 100ms. Skor risiko 0–100 dengan XGBoost + Isolation Forest dan penjelasan SHAP per transaksi.' },
  { icon: GitBranch,  title: 'Graph Link Analysis', desc: 'Deteksi jaringan sindikat dengan Cosmos DB Gremlin. Visualisasi hubungan IP, device, dan user secara real-time.' },
  { icon: Activity,   title: 'Live Dashboard',      desc: 'Feed transaksi live via WebSocket. Antrian review manual, chart tren fraud 24 jam, dan alert otomatis.' },
  { icon: BarChart3,  title: 'Azure Monitor',       desc: 'Application Insights terintegrasi. KQL queries, workbook embed, dan alert Slack/PagerDuty otomatis.' },
  { icon: Lock,       title: 'Enterprise Security', desc: 'JWT + Azure Key Vault. API Management rate limiting. Managed Identity antar service. Zero secret in code.' },
  { icon: Shield,     title: 'Adaptive AI',         desc: 'Model registry di Azure ML. Auto-training 10k synthetic data. SHAP top-3 XAI reasons per flagged transaction.' },
]

const STATS = [
  { value: '< 100ms', label: 'Latensi Scoring', sub: 'p95 latency' },
  { value: '99.2%',   label: 'Akurasi Deteksi', sub: 'precision XGBoost' },
  { value: '10K+',    label: 'Transaksi/Hari',  sub: 'kapasitas uji' },
  { value: 'Azure',   label: 'Cloud Native',    sub: 'Southeast Asia' },
]

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between border-b border-border/50 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-guardian-600 shadow-lg shadow-guardian-600/30">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Guardian<span className="text-gradient">Flow</span> AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary text-sm py-1.5">
            Masuk
          </Link>
          <Link href="/dashboard" className="btn-primary text-sm py-1.5">
            Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-6 py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-guardian-500/30 bg-guardian-600/10 px-4 py-1.5 text-sm text-guardian-300">
            <span className="pulse-dot" />
            Live — Azure Southeast Asia
          </div>
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            Deteksi Fraud
            <br />
            <span className="text-gradient">Real-Time dengan AI</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Middleware fraud detection berbasis Azure yang memproses transaksi dalam milidetik.
            XGBoost + Isolation Forest + Graph Analysis — dilengkapi penjelasan SHAP per transaksi.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className="btn-primary px-8 py-3 text-base">
              Buka Dashboard <ChevronRight className="h-5 w-5" />
            </Link>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-8 py-3 text-base"
            >
              API Docs
            </a>
          </div>
        </div>

        {/* Glow orbs */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2">
          <div className="h-96 w-96 rounded-full bg-guardian-600/20 blur-3xl" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="glass-card p-5 text-center">
              <div className="text-3xl font-extrabold text-gradient">{s.value}</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-3 text-center text-3xl font-bold">Fitur Lengkap</h2>
          <p className="mb-12 text-center text-muted-foreground">Infrastruktur fraud detection enterprise, siap deploy di Azure</p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="metric-card group cursor-default">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-guardian-600/20 text-guardian-400 transition-colors group-hover:bg-guardian-600/30">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card glow-indigo p-10 text-center">
            <h2 className="mb-4 text-3xl font-bold">Siap Melindungi Bisnis Anda?</h2>
            <p className="mb-8 text-muted-foreground">
              Integrasikan GuardianFlow AI dalam hitungan menit. REST API + WebSocket + Webhook.
            </p>
            <div className="mb-6 flex flex-wrap justify-center gap-3">
              {['XGBoost', 'SHAP XAI', 'Azure Monitor', 'Cosmos DB', 'Redis Cache', 'Event Hubs'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 rounded-full border border-guardian-500/20 bg-guardian-600/10 px-3 py-1 text-xs font-medium text-guardian-300">
                  <CheckCircle className="h-3 w-3" /> {t}
                </span>
              ))}
            </div>
            <Link href="/dashboard" className="btn-primary px-10 py-3 text-base">
              Mulai Sekarang <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-6 text-center text-sm text-muted-foreground">
        GuardianFlow AI © 2024 — Built on Microsoft Azure | Southeast Asia
      </footer>
    </main>
  )
}
