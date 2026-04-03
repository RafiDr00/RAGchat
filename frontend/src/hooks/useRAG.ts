'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

interface QueryChunk {
  doc: string
  idx: number
  text: string
  score: number
}

interface QueryResult {
  rag_answer: string
  llm_only: string
  retrieved_chunks: QueryChunk[]
  mode: 'grounded' | 'raw'
}

// API key is read from env — never hardcoded
// Set NEXT_PUBLIC_RAGCHAT_API_KEY in .env.local
const getApiKey = () =>
  process.env.NEXT_PUBLIC_RAGCHAT_API_KEY ?? ''

export function useRAG() {
  const [results, setResults] = useState<QueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [ragEnabled, setRagEnabled] = useState(true)
  const [documentCount, setDocumentCount] = useState(0)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const syncHealth = async () => {
      try {
        const res = await axios.get('/api/health')
        setDocumentCount(res.data.chunks ?? 0)
      } catch {
        // Backend unreachable — silently fail, UI degrades gracefully
      }
    }
    syncHealth()
    const interval = setInterval(syncHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  const pollTask = (taskId: string) => {
    const check = async (): Promise<boolean> => {
      try {
        const res = await axios.get(`/api/ingest/status/${taskId}`, {
          headers: { 'X-API-Key': getApiKey() },
        })
        if (res.data.status === 'completed') {
          setUploadProgress(100)
          setTimeout(() => setUploadProgress(null), 1500)
          return true
        }
        if (res.data.status === 'failed') {
          setUploadProgress(null)
          return true
        }
        return false
      } catch {
        return true
      }
    }
    const timer = setInterval(async () => {
      if (await check()) clearInterval(timer)
    }, 2000)
  }

  const handleInference = async (query: string) => {
    if (!query.trim() || isLoading) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setResults({
      rag_answer: '',
      llm_only: '',
      retrieved_chunks: [],
      mode: ragEnabled ? 'grounded' : 'raw',
    })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, useRAG: ragEnabled, stream: true }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error('API rejection')

      const reader = response.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let streamBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value, { stream: true }).split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6).trim()
          if (dataStr === '[DONE]') break
          try {
            const data = JSON.parse(dataStr)
            if (data.chunks) {
              setResults(prev => prev ? { ...prev, retrieved_chunks: data.chunks } : null)
            }
            if (data.token) {
              streamBuffer += data.token
              setResults(prev => prev ? { ...prev, rag_answer: streamBuffer } : null)
            }
          } catch { /* malformed SSE line — skip */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setResults(prev =>
          prev ? { ...prev, rag_answer: 'Connection failure — check backend status.' } : null
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    setUploadProgress(10)
    try {
      const res = await axios.post('/api/ingest', formData, {
        headers: { 'X-API-Key': getApiKey() },
      })
      if (res.data.task_id) pollTask(res.data.task_id)
    } catch {
      setUploadProgress(null)
    }
  }

  const ingestUrl = async (url: string) => {
    setUploadProgress(20)
    try {
      const res = await axios.post(
        '/api/ingest-url',
        { url },
        { headers: { 'X-API-Key': getApiKey() } }
      )
      if (res.data.task_id) pollTask(res.data.task_id)
    } catch {
      setUploadProgress(null)
    }
  }

  return {
    results,
    isLoading,
    ragEnabled,
    setRagEnabled,
    documentCount,
    uploadProgress,
    handleInference,
    uploadFile,
    ingestUrl,
    clearAll: () => setResults(null),
  }
}
