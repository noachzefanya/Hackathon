'use client'

import { Menu } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'

export function MobileHeader() {
  const { setSidebarOpen } = useDashboardStore()

  return (
    <div className="flex h-16 items-center border-b border-border/50 bg-card/80 px-4 backdrop-blur-xl lg:hidden">
      <button
        onClick={() => setSidebarOpen(true)}
        className="mr-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="font-bold">GuardianFlow AI</div>
    </div>
  )
}
