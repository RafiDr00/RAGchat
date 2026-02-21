import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.url) {
            return NextResponse.json({ detail: 'URL is required' }, { status: 400 });
        }

        const response = await fetch('http://localhost:8001/ingest-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'URL ingestion failed' }));
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json(
            { detail: `URL ingestion failed: ${error.message}` },
            { status: 500 }
        );
    }
}
