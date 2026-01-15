import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Increase body size limit for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(request: NextRequest) {
    console.log('--- API INGEST ROUTE START ---');
    try {
        const contentType = request.headers.get('content-type') || '';
        console.log('Content-Type:', contentType);

        // Get the form data from the request
        const formData = await request.formData();

        // Use aggressive casting to avoid missing property errors in restricted types
        const keys: string[] = [];
        try {
            (formData as any).forEach((_: any, key: string) => keys.push(key));
        } catch (e) { }
        console.log('Form data received, keys:', keys);

        // Forward to backend
        const backendUrl = 'http://localhost:8001/ingest';
        console.log('Forwarding to backend:', backendUrl);

        // Cast body to any to satisfy TS, though fetch supports FormData
        const response = await fetch(backendUrl, {
            method: 'POST',
            body: formData as any,
        });

        console.log('Backend response status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('Backend error body:', text);
            let errorData;
            try {
                errorData = JSON.parse(text);
            } catch (e) {
                errorData = { detail: text || 'Upload failed' };
            }
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        console.log('Backend success data:', data);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('API route caught error:', error);
        return NextResponse.json(
            { detail: `Upload failed: ${error.message}` },
            { status: 500 }
        );
    } finally {
        console.log('--- API INGEST ROUTE END ---');
    }
}
