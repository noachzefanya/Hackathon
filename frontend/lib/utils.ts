import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(new Date(dateString))
}

export function getRiskColor(level: string): string {
  switch (level) {
    case 'high':   return 'text-red-400'
    case 'medium': return 'text-amber-400'
    case 'low':    return 'text-emerald-400'
    default:       return 'text-muted-foreground'
  }
}

export function getRiskBadgeClass(level: string): string {
  switch (level) {
    case 'high':   return 'badge-high'
    case 'medium': return 'badge-medium'
    case 'low':    return 'badge-low'
    default:       return 'badge-low'
  }
}

export function getScoreColor(score: number): string {
  if (score > 70) return '#ef4444'
  if (score >= 30) return '#f59e0b'
  return '#10b981'
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}
