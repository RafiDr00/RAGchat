import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.url) return NextResponse.json({ detail: 'URL is required' }, { status: 400 })

    const apiKey = request.headers.get('x-api-key') ?? ''

    const response = await fetch(`${BACKEND_URL}/api/ingest-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'URL ingestion failed' }))
      return NextResponse.json(errorData, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ detail: `URL ingestion failed: ${msg}` }, { status: 500 })
  }
}
