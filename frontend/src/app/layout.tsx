import './globals.css'
import { ToastProvider } from '@/components/Toast'

export const metadata = {
  title: 'RAG Studio - Intelligent Retrieval',
  description: 'Advanced RAG system with vector embeddings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
