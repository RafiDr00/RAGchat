import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8001'

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`)
    return NextResponse.json(await response.json())
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ status: 'error', detail: msg }, { status: 500 })
  }
}
