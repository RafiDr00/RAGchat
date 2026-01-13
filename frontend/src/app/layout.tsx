import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zenith Stealth | Fortune 500 RAG System',
  description: 'Ultra-minimal, high-fidelity enterprise knowledge interface with PDF, OCR, and intelligent retrieval',
  keywords: ['RAG', 'AI', 'Knowledge Base', 'Document Intelligence', 'Enterprise'],
  authors: [{ name: 'Zenith Labs' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="h-full antialiased bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  )
}