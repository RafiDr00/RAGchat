import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import AsyncLock from 'async-lock';
import { DocumentChunk } from './types';

const CHUNKS_FILE = join(process.cwd(), '.data', 'document_chunks.jsonl');
const DATA_DIR = join(process.cwd(), '.data');

/**
 * PRODUCTION LOCK: All JSONL writes are serialized to prevent corruption
 * Critical for concurrent uploads from multiple users
 */
const writeLock = new AsyncLock();
const LOCK_KEY = 'jsonl-write';

/**
 * Initialize data directory
 */
export async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

/**
 * Append chunk to JSONL file with MUTEX lock
 * PRODUCTION: Atomic, thread-safe operation - no corruption on concurrent writes
 */
export async function appendChunk(chunk: Omit<DocumentChunk, 'id'>): Promise<DocumentChunk> {
  await ensureDataDir();

  const fullChunk: DocumentChunk = {
    id: uuidv4(),
    ...chunk,
  };

  // CRITICAL: Use async lock to serialize all writes
  return writeLock.acquire(LOCK_KEY, async () => {
    try {
      const line = JSON.stringify(fullChunk) + '\n';
      await fs.appendFile(CHUNKS_FILE, line, 'utf-8');
      return fullChunk;
    } catch (error) {
      console.error('Error appending chunk:', error);
      throw new Error(`Failed to append chunk to store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * Load all chunks from JSONL file with line-by-line error recovery
 * PRODUCTION: Skip malformed lines instead of crashing entire system
 */
export async function loadAllChunks(): Promise<DocumentChunk[]> {
  await ensureDataDir();

  try {
    try {
      const data = await fs.readFile(CHUNKS_FILE, 'utf-8');
      const lines = data.trim().split('\n').filter((line) => line.trim());

      const chunks: DocumentChunk[] = [];
      const skippedLines: number[] = [];

      for (let i = 0; i < lines.length; i++) {
        try {
          const parsed = JSON.parse(lines[i]);
          // Validate chunk structure
          if (!parsed.id || !parsed.doc || !parsed.text || !Array.isArray(parsed.embedding)) {
            skippedLines.push(i);
            console.warn(`Skipping malformed chunk at line ${i + 1}: Missing required fields`);
            continue;
          }
          chunks.push(parsed);
        } catch (parseError) {
          skippedLines.push(i);
          console.warn(`Skipping malformed JSON at line ${i + 1}: ${lines[i].substring(0, 50)}...`);
        }
      }

      if (skippedLines.length > 0) {
        console.warn(`Loaded ${chunks.length} chunks, skipped ${skippedLines.length} malformed lines`);
      }

      return chunks;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error loading chunks:', error);
    throw new Error(`Failed to load chunks from store: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear all chunks (for testing/reset) - Protected by lock
 */
export async function clearChunks(): Promise<void> {
  return writeLock.acquire(LOCK_KEY, async () => {
    try {
      await fs.unlink(CHUNKS_FILE);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error clearing chunks:', error);
        throw error;
      }
    }
  });
}

/**
 * Get chunk count
 */
export async function getChunkCount(): Promise<number> {
  const chunks = await loadAllChunks();
  return chunks.length;
}

/**
 * Get unique document count
 */
export async function getDocumentCount(): Promise<number> {
  const chunks = await loadAllChunks();
  const docs = new Set(chunks.map((c) => c.doc));
  return docs.size;
}
