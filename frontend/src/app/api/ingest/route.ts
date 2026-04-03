import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8001'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const apiKey = request.headers.get('x-api-key') ?? ''

    const response = await fetch(`${BACKEND_URL}/api/ingest`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: formData as unknown as BodyInit,
    })

    if (!response.ok) {
      const text = await response.text()
      let errorData: unknown
      try { errorData = JSON.parse(text) } catch { errorData = { detail: text || 'Upload failed' } }
      return NextResponse.json(errorData, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ detail: `Upload failed: ${msg}` }, { status: 500 })
  }
}
