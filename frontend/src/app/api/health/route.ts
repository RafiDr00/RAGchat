import { NextRequest, NextResponse } from 'next/server';
import { getChunkCount, getDocumentCount } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const chunks = await getChunkCount();
    const documents = await getDocumentCount();

    return NextResponse.json({
      status: 'ok',
      chunks,
      documents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
