'use client'

import { useEffect } from 'react'
import { initAppInsights } from '@/lib/appinsights'

export function AppInsightsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAppInsights()
  }, [])

  return <>{children}</>
}
