'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield, Activity, ListFilter, GitBranch,
  BarChart3, Monitor, Bell, Settings, LogOut,
  ChevronRight, Wifi, WifiOff, X
} from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { cn } from '@/lib/utils'

import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard',         icon: Activity,    label: 'Live Feed',       id: 'nav-live' },
  { href: '/dashboard/queue',   icon: ListFilter,  label: 'Review Queue',    id: 'nav-queue' },
  { href: '/dashboard/graph',   icon: GitBranch,   label: 'Graph Analysis',  id: 'nav-graph' },
  { href: '/dashboard/reports', icon: BarChart3,   label: 'Laporan',         id: 'nav-reports' },
  { href: '/dashboard/monitor', icon: Monitor,     label: 'Azure Monitor',   id: 'nav-monitor' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { wsConnected, stats, sidebarOpen, setSidebarOpen } = useDashboardStore()
  const [apiConnected, setApiConnected] = useState(false)

  useEffect(() => {
    const checkApi = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/health`)
        setApiConnected(res.ok)
      } catch (e) {
        setApiConnected(false)
      }
    }
    checkApi()
    const interval = setInterval(checkApi, 5000)
    return () => clearInterval(interval)
  }, [])

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname, setSidebarOpen])

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/50 bg-card/80 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-guardian-600 shadow-lg shadow-guardian-600/30">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold leading-none">GuardianFlow</div>
          <div className="mt-0.5 text-xs text-muted-foreground font-mono">AI v1.0</div>
        </div>
        {/* Mobile close button */}
        <button 
          className="rounded-lg p-1 text-muted-foreground hover:bg-secondary lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Connection status */}
      <div className="mx-3 mt-3 flex flex-col gap-2 rounded-lg border border-border/50 bg-secondary/50 p-3">
        {/* Backend API Connection */}
        <div className="flex items-center gap-2">
          {apiConnected ? (
            <>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                <Activity className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-400 font-medium">Backend API Online</span>
              <span className="ml-auto pulse-dot scale-75" />
            </>
          ) : (
            <>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
                <WifiOff className="h-3 w-3 text-red-400" />
              </div>
              <span className="text-xs text-red-400 font-medium">Backend API Offline</span>
            </>
          )}
        </div>

        {/* WebSocket Connection */}
        <div className="flex items-center gap-2 border-t border-border/50 pt-2">
          {wsConnected ? (
            <>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                <Wifi className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-400 font-medium">Live WS Connected</span>
              <span className="ml-auto pulse-dot scale-75" />
            </>
          ) : (
            <>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20">
                <WifiOff className="h-3 w-3 text-amber-400" />
              </div>
              <span className="text-xs text-amber-400 font-medium">WS Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-4">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Dashboard
        </div>
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              id={item.id}
              className={cn('nav-item', active && 'active')}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
              {active && <ChevronRight className="ml-auto h-4 w-4 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Stats summary */}
      <div className="mx-3 mb-3 rounded-xl border border-border/50 bg-secondary/30 p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Session
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold text-emerald-400">{stats.approved}</div>
            <div className="text-[10px] text-muted-foreground">Aman</div>
          </div>
          <div>
            <div className="text-sm font-bold text-amber-400">{stats.flagged}</div>
            <div className="text-[10px] text-muted-foreground">Flagged</div>
          </div>
          <div>
            <div className="text-sm font-bold text-red-400">{stats.blocked}</div>
            <div className="text-[10px] text-muted-foreground">Blokir</div>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border/50 px-3 py-3 space-y-1">
        <button id="btn-settings" className="nav-item w-full">
          <Settings className="h-4 w-4" /> Pengaturan
        </button>
        <Link href="/login" id="btn-logout" className="nav-item w-full text-red-400/80 hover:text-red-400 hover:bg-red-500/10">
          <LogOut className="h-4 w-4" /> Keluar
        </Link>
      </div>
    </aside>
    </>
  )
}
