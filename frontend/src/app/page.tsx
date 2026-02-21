'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'

// Hooks & Components
import { useRAG } from '../hooks/useRAG'
import VolumetricSpace from '../components/VolumetricSpace'
import MagneticCursor from '../components/MagneticCursor'
import GlassDock from '../components/GlassDock'
import GlassFoilCard from '../components/GlassFoilCard'

const springConfig = { stiffness: 260, damping: 20 }

export default function RAGchatCanvas() {
  const [query, setQuery] = useState('')
  const [currentQuery, setCurrentQuery] = useState('')
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    results,
    isLoading,
    ragEnabled,
    setRagEnabled,
    documentCount,
    uploadProgress,
    handleInference,
    uploadFile,
    ingestUrl,
    clearAll
  } = useRAG()

  const onHandleSubmit = async () => {
    if (!query.trim()) return
    setCurrentQuery(query)
    await handleInference(query)
  }

  const resetView = () => {
    clearAll()
    setQuery('')
    setCurrentQuery('')
    inputRef.current?.focus()
  }

  return (
    <main className="fixed inset-0 w-full h-full bg-[#050010] overflow-hidden select-none">
      <MagneticCursor isHoveringInteractive={isHoveringInteractive} />
      <VolumetricSpace speed={0.8} loading={isLoading} />

      {/* Narrative Entry Layer */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
        <AnimatePresence mode="wait">
          {!results && (
            <motion.div
              className="flex flex-col items-center justify-center w-full max-w-4xl px-8 pointer-events-auto"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              <div className="relative text-center w-full group">
                <div className="relative flex items-center justify-center py-12">
                  <input
                    ref={inputRef}
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onHandleSubmit()}
                    onFocus={() => setIsHoveringInteractive(true)}
                    onBlur={() => setIsHoveringInteractive(false)}
                    placeholder={isLoading ? "Analyzing..." : "Ask your primary documents..."}
                    className="w-full bg-transparent border-none outline-none text-4xl md:text-6xl font-bold tracking-tighter text-center text-white/90 placeholder:text-white/10"
                  />

                  {query.length > 0 && !isLoading && (
                    <motion.button
                      onClick={onHandleSubmit}
                      className="absolute right-0 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <ChevronRight size={24} className="text-emerald-400" />
                    </motion.button>
                  )}
                </div>

                <motion.div
                  className="mt-6 text-[10px] font-mono tracking-[0.3em] text-white/20 uppercase"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  {ragEnabled ? 'Neural Grounding Active' : 'Raw LLM Direct'} • {documentCount} Chunks Verified
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Layer */}
      <AnimatePresence>
        {results && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-30 px-8 py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Context Header */}
            <motion.div
              className="absolute top-10 left-10 flex items-center space-x-4 z-50"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <button
                onClick={resetView}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-medium text-white/80 tracking-tight">{currentQuery}</h2>
            </motion.div>

            {/* Scrollable Insights Container */}
            <div className="w-full max-w-3xl space-y-6 max-h-full overflow-y-auto custom-scrollbar pr-4">
              <GlassFoilCard
                glowColor="#10b981"
                isActive={ragEnabled}
                relevanceScore={results.retrieved_chunks?.[0]?.score}
              >
                <div className="p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span className="text-[10px] font-mono tracking-[0.25em] text-emerald-400 uppercase">Grounded Response</span>
                  </div>
                  <article className="prose prose-invert max-w-none">
                    <p className="text-white/90 text-base leading-relaxed whitespace-pre-wrap font-light">
                      {results.rag_answer || (isLoading ? "Synthesizing intelligence..." : "")}
                    </p>
                  </article>
                </div>
              </GlassFoilCard>

              {results.retrieved_chunks.length > 0 && (
                <div className="grid grid-cols-1 gap-4 pt-4">
                  <span className="text-[10px] font-mono tracking-[0.3em] text-white/20 pl-4 uppercase">Verification Sources</span>
                  {results.retrieved_chunks.map((chunk, i) => (
                    <GlassFoilCard key={i} glowColor="#10b981" isActive={false} delay={0.05 * i}>
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-3">
                          <code className="text-[10px] font-mono text-emerald-500/80">{chunk.doc}:{chunk.idx}</code>
                          <span className="text-[10px] font-mono text-white/20">{chunk.score}% Conf.</span>
                        </div>
                        <p className="text-white/40 text-xs leading-relaxed italic line-clamp-3">"{chunk.text}"</p>
                      </div>
                    </GlassFoilCard>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassDock
        onFileUpload={uploadFile}
        ragEnabled={ragEnabled}
        onToggleRAG={() => setRagEnabled(!ragEnabled)}
        documentCount={documentCount}
        uploadProgress={uploadProgress}
        isLoading={isLoading}
        onHoverInteractive={setIsHoveringInteractive}
        onUrlUpload={ingestUrl}
      />
    </main>
  )
}
