import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppInsightsProvider } from '@/components/providers/AppInsightsProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GuardianFlow AI — Fraud Detection Platform',
  description:
    'AI-powered real-time transaction risk scoring engine for fintech and e-commerce. Detects fraud using XGBoost, Isolation Forest, and graph link analysis on Azure.',
  keywords: 'fraud detection, AI, machine learning, fintech, real-time scoring, Azure',
  authors: [{ name: 'GuardianFlow Team' }],
  openGraph: {
    title: 'GuardianFlow AI',
    description: 'Real-time AI fraud detection middleware',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppInsightsProvider>
          {children}
        </AppInsightsProvider>
      </body>
    </html>
  )
}
