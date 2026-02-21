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

const API_KEY = "zenith_dev_secret_2026"

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
                setDocumentCount(res.data.chunks || 0)
            } catch (e) {
                console.warn('Sync failed: Backend unreachable.')
            }
        }
        syncHealth()
        const int = setInterval(syncHealth, 10000)
        return () => clearInterval(int)
    }, [])

    const pollTask = async (taskId: string) => {
        const check = async () => {
            try {
                const res = await axios.get(`/api/ingest/status/${taskId}`, {
                    headers: { 'X-API-Key': API_KEY }
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
            } catch { return true }
        }
        const timer = setInterval(async () => {
            if (await check()) clearInterval(timer)
        }, 2000)
    }

    const handleInference = async (query: string) => {
        if (!query.trim() || isLoading) return

        if (abortControllerRef.current) abortControllerRef.current.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller

        setIsLoading(true)
        setResults({
            rag_answer: '',
            llm_only: '',
            retrieved_chunks: [],
            mode: ragEnabled ? 'grounded' : 'raw'
        })

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    question: query,
                    useRAG: ragEnabled,
                    stream: true
                }),
                signal: controller.signal
            })

            if (!response.ok) throw new Error('API Rejection')

            const reader = response.body?.getReader()
            if (!reader) return

            const decoder = new TextDecoder()
            let streamBuffer = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6).trim()
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
                        } catch { }
                    }
                }
            }
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setResults(prev => prev ? { ...prev, rag_answer: "Execution error: connection failure." } : null)
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
                headers: { 'X-API-Key': API_KEY }
            })
            if (res.data.task_id) pollTask(res.data.task_id)
        } catch { setUploadProgress(null) }
    }

    const ingestUrl = async (url: string) => {
        setUploadProgress(20)
        try {
            const res = await axios.post('/api/ingest-url', { url }, {
                headers: { 'X-API-Key': API_KEY }
            })
            if (res.data.task_id) pollTask(res.data.task_id)
        } catch { setUploadProgress(null) }
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
        clearAll: () => setResults(null)
    }
}
