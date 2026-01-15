import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const response = await fetch('http://localhost:8001/health');
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { status: 'error', detail: error.message },
            { status: 500 }
        );
    }
}
