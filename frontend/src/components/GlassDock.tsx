'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Loader2, X, ChevronRight, Link as LinkIcon } from 'lucide-react'
import LensToggle from './LensToggle'

const springConfig = {
    stiffness: 260,
    damping: 20
}

interface GlassDockProps {
    onFileUpload: (file: File) => void
    ragEnabled: boolean
    onToggleRAG: () => void
    documentCount: number
    uploadProgress: number | null
    isLoading: boolean
    onHoverInteractive: (hovering: boolean) => void
    onUrlUpload: (url: string) => Promise<void>
}

const GlassDock: React.FC<GlassDockProps> = ({
    onFileUpload,
    ragEnabled,
    onToggleRAG,
    documentCount,
    uploadProgress,
    isLoading,
    onHoverInteractive,
    onUrlUpload
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [showTooltip, setShowTooltip] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [url, setUrl] = useState('')
    const [isUrlLoading, setIsUrlLoading] = useState(false)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsProcessing(true)
            await onFileUpload(file)
            setTimeout(() => setIsProcessing(false), 500)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleUrlSubmit = async () => {
        if (!url.trim()) return
        setIsUrlLoading(true)
        await onUrlUpload(url)
        setIsUrlLoading(false)
        setShowUrlInput(false)
        setUrl('')
    }

    return (
        <motion.div
            className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50"
            initial={{ y: 100, opacity: 0 }}
            animate={{
                y: isLoading ? [0, -4, 0] : 0,
                opacity: 1
            }}
            transition={{
                y: isLoading ? {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                } : {
                    type: "spring",
                    ...springConfig
                },
                opacity: { type: "spring", ...springConfig }
            }}
        >
            <motion.div
                className="flex items-center space-x-6 px-8 py-4 rounded-2xl"
                layout
                style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    backdropFilter: 'blur(60px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderTopColor: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: `
            0 4px 24px rgba(0, 0, 0, 0.5),
            0 20px 50px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `
                }}
                animate={ragEnabled ? {
                    borderColor: [
                        'rgba(255, 255, 255, 0.1)',
                        'rgba(16, 185, 129, 0.25)',
                        'rgba(255, 255, 255, 0.1)'
                    ]
                } : {}}
                transition={ragEnabled ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
                <AnimatePresence mode="wait">
                    {!showUrlInput ? (
                        <motion.div
                            key="main-controls"
                            className="flex items-center space-x-6"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="relative">
                                <motion.button
                                    onClick={() => fileInputRef.current?.click()}
                                    onMouseEnter={() => {
                                        setShowTooltip(true)
                                        onHoverInteractive(true)
                                    }}
                                    onMouseLeave={() => {
                                        setShowTooltip(false)
                                        onHoverInteractive(false)
                                    }}
                                    className="flex items-center space-x-3 p-3 rounded-xl transition-colors"
                                    style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <motion.div
                                        animate={isProcessing ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
                                        transition={isProcessing ? {
                                            rotate: { duration: 0.5, repeat: Infinity, ease: 'linear' },
                                            scale: { duration: 0.5, repeat: Infinity }
                                        } : {}}
                                    >
                                        <Upload size={18} className="text-white/80" />
                                    </motion.div>
                                </motion.button>

                                <AnimatePresence>
                                    {showTooltip && (
                                        <motion.div
                                            className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 px-4 py-2.5 rounded-xl"
                                            style={{
                                                background: 'rgba(0, 0, 0, 0.9)',
                                                backdropFilter: 'blur(20px)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                minWidth: '160px'
                                            }}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <div className="text-xs text-white/90 font-medium">{documentCount > 0 ? `${documentCount} chunks indexed` : 'Upload Doc'}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <motion.button
                                onClick={() => setShowUrlInput(true)}
                                onMouseEnter={() => onHoverInteractive(true)}
                                onMouseLeave={() => onHoverInteractive(false)}
                                className="p-3 rounded-xl transition-colors"
                                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <LinkIcon size={18} className="text-white/80" />
                            </motion.button>

                            <LensToggle
                                enabled={ragEnabled}
                                onToggle={onToggleRAG}
                                onHover={onHoverInteractive}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="url-input"
                            className="flex items-center space-x-3 min-w-[300px]"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <input
                                autoFocus
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                placeholder="https://example.com"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                            />
                            <button
                                onClick={handleUrlSubmit}
                                disabled={isUrlLoading || !url.trim()}
                                className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                                {isUrlLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                            </button>
                            <button
                                onClick={() => setShowUrlInput(false)}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/40 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.pdf,.png,.jpg,.jpeg,.tiff,.bmp,.gif,.webp,.md,.csv,.json,.xml,.html"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </motion.div>
        </motion.div>
    )
}

export default GlassDock
