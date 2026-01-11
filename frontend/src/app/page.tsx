'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Upload, Sparkles, CheckCircle2, ArrowRight, Loader, FileText, TrendingUp, Zap, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import type { QueryResponse } from '@/lib/types';

/* ============================================================================
   STARFIELD COMPONENT - WARP DRIVE EFFECT with error state support
   ============================================================================ */

const StarField: React.FC<{ warp: boolean; error?: boolean }> = ({ warp, error }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Array<{ x: number; y: number; z: number }>>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    starsRef.current = Array.from({ length: 100 }, () => ({
      x: (Math.random() - 0.5) * canvas.width,
      y: (Math.random() - 0.5) * canvas.height,
      z: Math.random() * 500,
    }));

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const speed = warp ? 8 : 3;

      starsRef.current.forEach((star) => {
        star.z -= speed;
        if (star.z <= 0) {
          star.z = 500;
          star.x = (Math.random() - 0.5) * canvas.width;
          star.y = (Math.random() - 0.5) * canvas.height;
        }

        const scale = 500 / star.z;
        const x = canvas.width / 2 + star.x * scale;
        const y = canvas.height / 2 + star.y * scale;
        const size = 2 * scale;

        // Red stars for error state, white for normal
        const color = error ? 'rgba(239, 68, 68,' : 'rgba(255, 255, 255,';
        ctx.fillStyle = `${color} ${Math.max(0, 1 - star.z / 500)})`;
        ctx.fillRect(x, y, size, size);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [warp, error]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ background: warp ? '#000' : error ? '#7f1d1d' : 'transparent' }}
    />
  );
};

/* ============================================================================
   ERROR MODAL COMPONENT - PRODUCTION: Display critical errors to users
   ============================================================================ */

interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, title, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-gradient-to-br from-red-950/95 to-red-900/95 border border-red-700/50 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-red-100 mb-2">{title}</h3>
              <p className="text-red-200/90 text-sm leading-relaxed break-words whitespace-normal">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 hover:bg-red-800/50 rounded transition-colors"
            >
              <X className="w-5 h-5 text-red-300" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-red-600/50 hover:bg-red-600 text-red-100 font-medium rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

/* ============================================================================
   MAIN COMPONENT - PRODUCTION HARDENED
   ============================================================================ */

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [useRAG, setUseRAG] = useState(true);
  
  // PRODUCTION: Error modal state
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  
  // PRODUCTION: AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  // Health check callback - poll for document availability
  const checkHealth = useCallback(async () => {
    try {
      const response = await axios.get(`/api/health`);
      if (response.data.documents > 0) {
        setHasUploaded(true);
        setDocumentCount(response.data.documents);
      }
    } catch (err) {
      // Silent fail - continue polling
    }
  }, []);

  // Health check polling on mount and every 5 seconds
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Focus search input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle file upload via drag-drop
  const handleUpload = useCallback(
    async (files: FileList) => {
      setIsDragging(false);
      const file = files[0];
      if (!file) return;

      setIsProcessingUpload(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`/api/ingest`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setHasUploaded(true);
        setDocumentCount((prev) => prev + response.data.chunks_created);
        addToast(
          `✓ Successfully uploaded ${response.data.document_name} (${response.data.chunks_created} chunks)`,
          'success'
        );
        // Refresh health check after upload
        setTimeout(() => checkHealth(), 500);
      } catch (err) {
        let errorMessage = 'Upload failed';
        
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 413) {
            errorMessage = 'File too large. Maximum size is 10MB.';
          } else if (err.response?.status === 429) {
            errorMessage = 'Too many uploads. Please wait before uploading again.';
          } else {
            errorMessage = err.response?.data?.error || err.response?.data?.details || errorMessage;
          }
        }

        // PRODUCTION: Show error modal instead of just toast
        setErrorModal({
          isOpen: true,
          title: 'Upload Error',
          message: errorMessage,
        });
        
        addToast(errorMessage, 'error');
      } finally {
        setIsProcessingUpload(false);
      }
    },
    [addToast, checkHealth]
  );

  // Handle search/query - PRODUCTION: Use AbortController for cancellation
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || isLoading) {
      if (documentCount === 0) {
        addToast('Upload a document first', 'error');
      }
      return;
    }

    setIsLoading(true);

    try {
      // PRODUCTION: Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const response = await axios.post(
        `/api/chat`,
        {
          question: searchQuery,
          useRAG,
        },
        {
          signal: abortControllerRef.current.signal,
        }
      );

      // Only update state if this request wasn't cancelled
      if (!abortControllerRef.current.signal.aborted) {
        setQueryResult(response.data);
        setSearchQuery('');
        addToast(`✓ Query completed in ${response.data.processing_time}ms`, 'success');
      }
    } catch (err) {
      // Ignore abort errors (expected when cancelling)
      if (axios.isCancel(err)) {
        console.log('Query cancelled');
        return;
      }

      let errorTitle = 'Query Error';
      let errorMessage = 'Query failed';

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          errorTitle = 'Rate Limited';
          errorMessage = 'Too many queries. Please wait before trying again (max 10 per minute).';
        } else if (err.response?.status === 500) {
          errorTitle = 'Server Error';
          errorMessage = err.response?.data?.details || 'Internal server error occurred';
        } else {
          errorMessage = err.response?.data?.error || errorMessage;
        }
      }

      // PRODUCTION: Show error modal
      setErrorModal({
        isOpen: true,
        title: errorTitle,
        message: errorMessage,
      });

      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, isLoading, hasUploaded, useRAG, addToast, documentCount]);

  // Handle Enter key in search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && hasUploaded) {
      handleSearch();
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="min-h-screen text-zinc-50 overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--bg-primary), var(--bg-secondary), var(--bg-tertiary))' }}>
      <StarField warp={isLoading} error={errorModal.isOpen} />

      {/* PRODUCTION: Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
      />

      {/* HEADER */}
      <motion.header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" style={{ color: 'var(--accent-info)' }} />
            <div>
              <h1 className="text-xl font-bold" style={{ background: `linear-gradient(90deg, var(--accent-info), #06b6d4)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                RAG Studio
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Intelligent Retrieval Engine</p>
            </div>
          </div>

          <motion.div className="flex items-center gap-4">
            {hasUploaded && (
              <motion.div
                className="px-3 py-1.5 rounded-lg flex items-center gap-2 border" style={{ background: `linear-gradient(90deg, rgba(16,185,129,0.1), rgba(20,184,166,0.1))`, borderColor: 'rgba(16,185,129,0.3)' }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <FileText className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(16,185,129,0.8)' }}>
                  {documentCount} document{documentCount !== 1 ? 's' : ''}
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* MAIN CONTENT */}
      <main className="relative pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* UPLOAD SECTION - Only visible when no docs indexed */}
          {documentCount === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center space-y-6"
            >
              <motion.div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="relative px-8 py-16 rounded-2xl border-2 border-dashed transition-all cursor-pointer"
                style={{
                  borderColor: isDragging ? 'var(--accent-info)' : 'rgba(63,63,70,0.5)',
                  background: isDragging ? 'rgba(6,182,212,0.05)' : 'rgba(0,0,0,0.3)',
                }}
              >
                <input
                  type="file"
                  onChange={(e) => e.target.files && handleUpload(e.target.files)}
                  className="hidden"
                  id="file-input"
                  accept=".txt,.pdf"
                />
                <label htmlFor="file-input" className="cursor-pointer block">
                  <motion.div
                    animate={{ scale: isProcessingUpload ? 1.1 : 1 }}
                    className="space-y-4"
                  >
                    <Upload className="w-12 h-12 mx-auto" style={{ color: 'var(--accent-info)' }} />
                    <div>
                      <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {isProcessingUpload ? 'Processing...' : 'Upload Your Documents'}
                      </p>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Drag and drop .txt or .pdf files here (max 10MB) or click to select
                      </p>
                    </div>
                  </motion.div>
                </label>
              </motion.div>
            </motion.div>
          )}

          {/* SEARCH SECTION - Enabled when documents available */}
          {documentCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setUseRAG(!useRAG)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all border"
                  style={{
                    background: useRAG ? 'rgba(6,182,212,0.2)' : 'rgba(63,63,70,0.5)',
                    borderColor: useRAG ? 'rgba(6,182,212,0.5)' : 'rgba(63,63,70,0.5)',
                    color: useRAG ? 'rgba(6,182,212,0.8)' : 'var(--text-secondary)'
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  {useRAG ? 'RAG Mode' : 'LLM Only'}
                </motion.button>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {useRAG ? 'Using document context' : 'No context'}
                </span>
              </div>

              <div className="relative group">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask anything about your documents..."
                  className="w-full px-6 py-4 rounded-lg text-zinc-50 focus:outline-none transition-all" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(63,63,70,0.5)', color: 'var(--text-primary)' }} onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'} onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(63,63,70,0.5)'}
                  disabled={!hasUploaded || isLoading}
                />
                <motion.button
                  onClick={handleSearch}
                  disabled={!hasUploaded || isLoading || !searchQuery.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" style={{ background: `linear-gradient(90deg, var(--accent-info), #06b6d4)` }}
                >
                  {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* RESULTS SECTION - PRODUCTION: Fixed CSS for large chunks */}
          {queryResult && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* RAG ANSWER */}
                {useRAG && (
                  <motion.div className="lg:col-span-2 p-6 rounded-xl overflow-hidden border" style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))`, borderColor: 'rgba(6,182,212,0.2)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--accent-success)' }} />
                      <h3 className="font-semibold" style={{ color: 'rgba(16,185,129,0.8)' }}>Grounded Answer (RAG)</h3>
                    </div>
                    <p className="leading-relaxed text-sm whitespace-normal break-words overflow-x-hidden" style={{ color: 'var(--text-secondary)' }}>{queryResult.rag_answer}</p>
                  </motion.div>
                )}

                {/* LLM ANSWER */}
                {!useRAG && (
                  <motion.div className="lg:col-span-2 p-6 rounded-xl overflow-hidden border" style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))`, borderColor: 'rgba(6,182,212,0.2)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5" style={{ color: 'rgba(6,182,212,0.8)' }} />
                      <h3 className="font-semibold" style={{ color: 'rgba(6,182,212,0.8)' }}>LLM Only Response</h3>
                    </div>
                    <p className="leading-relaxed text-sm whitespace-normal break-words overflow-x-hidden" style={{ color: 'var(--text-secondary)' }}>{queryResult.llm_only}</p>
                  </motion.div>
                )}

                {/* SOURCE MATERIALS */}
                {queryResult.retrieved_chunks && queryResult.retrieved_chunks.length > 0 && (
                  <motion.div className="p-6 rounded-xl space-y-4 overflow-hidden border" style={{ background: `linear-gradient(135deg, rgba(120,80,0,0.1), rgba(100,60,0,0.1))`, borderColor: 'rgba(180,150,0,0.3)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5" style={{ color: 'rgba(180,150,0,0.8)' }} />
                      <h3 className="font-semibold" style={{ color: 'rgba(180,150,0,0.8)' }}>Retrieved Sources</h3>
                    </div>
                    <div className="space-y-3">
                      {queryResult.retrieved_chunks.map((chunk, i) => (
                        <motion.div
                          key={i}
                          className="p-3 rounded-lg overflow-hidden border" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(180,150,0,0.2)' }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <p className="text-xs font-mono truncate" style={{ color: 'rgba(180,150,0,0.8)' }}>{chunk.doc}</p>
                              <p className="text-xs line-clamp-2 mt-1 whitespace-normal break-words" style={{ color: 'var(--text-secondary)' }}>{chunk.text.substring(0, 100)}...</p>
                            </div>
                            <motion.span className="px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap flex-shrink-0" style={{ background: `linear-gradient(90deg, rgba(180,150,0,0.9), rgba(160,120,0,0.9))` }}>
                              {chunk.match.toFixed(0)}%
                            </motion.span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* PROCESSING TICKER */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed bottom-6 left-6 px-4 py-3 rounded-lg text-sm font-mono" style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(6,182,212,0.3)', color: 'var(--text-secondary)' }}
            >
              <span className="inline-block animate-pulse">⚙️ Processing query...</span>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
