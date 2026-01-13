'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Upload, Loader2, FileText, Image as ImageIcon, File, X, ChevronRight } from 'lucide-react'
import axios from 'axios'

/* ============================================================================
   SPRING CONFIGURATION - Luxury Feel
   Stiffness: 260, Damping: 20 - Snappy yet elegant
   ============================================================================ */

const springConfig = {
  stiffness: 260,
  damping: 20
}

const gentleSpring = {
  stiffness: 100,
  damping: 20
}

/* ============================================================================
   MAGNETIC CUSTOM CURSOR - Emerald Circle on Interactive Elements
   ============================================================================ */

const MagneticCursor: React.FC<{ isHoveringInteractive: boolean }> = ({ isHoveringInteractive }) => {
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)

  const springX = useSpring(cursorX, { stiffness: 500, damping: 28 })
  const springY = useSpring(cursorY, { stiffness: 500, damping: 28 })

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }

    window.addEventListener('mousemove', moveCursor)
    return () => window.removeEventListener('mousemove', moveCursor)
  }, [cursorX, cursorY])

  return (
    <motion.div
      className="fixed pointer-events-none z-[9999]"
      style={{
        x: springX,
        y: springY,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      <motion.div
        className="rounded-full"
        animate={{
          width: isHoveringInteractive ? 40 : 12,
          height: isHoveringInteractive ? 40 : 12,
          backgroundColor: isHoveringInteractive ? 'transparent' : '#10b981',
          borderWidth: isHoveringInteractive ? 2 : 0,
          borderColor: '#10b981',
          boxShadow: isHoveringInteractive
            ? '0 0 20px rgba(16, 185, 129, 0.4)'
            : '0 0 10px rgba(16, 185, 129, 0.3)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          borderStyle: 'solid',
          mixBlendMode: isHoveringInteractive ? 'normal' : 'difference'
        }}
      />
    </motion.div>
  )
}

/* ============================================================================
   VOLUMETRIC SPACE - Deep Space Warp with Chromatic Aberration
   ============================================================================ */

interface VolumetricSpaceProps {
  speed: number
  loading: boolean
}

const VolumetricSpace: React.FC<VolumetricSpaceProps> = ({ speed, loading }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>()
  const starsRef = useRef<Array<{
    x: number
    y: number
    z: number
    prevX?: number
    prevY?: number
    opacity: number
    velocity: number
    hue: number
  }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize 1500 high-density stars with color variation
    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 1500 }, () => ({
        x: (Math.random() - 0.5) * 6000,
        y: (Math.random() - 0.5) * 6000,
        z: Math.random() * 3000,
        opacity: Math.random() * 0.9 + 0.1,
        velocity: 0,
        hue: Math.random() * 60 + 200 // Blue to purple hues
      }))
    }

    const animate = () => {
      // Deep space void with subtle fade
      ctx.fillStyle = 'rgba(5, 0, 16, 0.06)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const currentSpeed = loading ? 30.0 : speed
      const warpIntensity = currentSpeed / 30.0

      // Deep Purple Radial Fog - Expands with warp
      if (warpIntensity > 0.2) {
        const fogRadius = 300 + (warpIntensity * 200)
        const fogGradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, fogRadius
        )
        fogGradient.addColorStop(0, `rgba(5, 0, 16, ${0.15 * warpIntensity})`)
        fogGradient.addColorStop(0.5, `rgba(10, 0, 30, ${0.08 * warpIntensity})`)
        fogGradient.addColorStop(1, 'rgba(5, 0, 16, 0)')

        ctx.fillStyle = fogGradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      starsRef.current.forEach(star => {
        star.prevX = canvas.width / 2 + (star.x * 1500) / star.z
        star.prevY = canvas.height / 2 + (star.y * 1500) / star.z

        star.z -= currentSpeed
        star.velocity = currentSpeed

        if (star.z <= 0) {
          star.z = 3000
          star.x = (Math.random() - 0.5) * 6000
          star.y = (Math.random() - 0.5) * 6000
          star.hue = Math.random() * 60 + 200
        }

        const x = canvas.width / 2 + (star.x * 1500) / star.z
        const y = canvas.height / 2 + (star.y * 1500) / star.z
        const size = Math.max(0.5, (3000 - star.z) / 1000)

        // Chromatic Aberration + Motion Blur Trail
        if (loading && star.prevX !== undefined && star.prevY !== undefined) {
          const aberrationOffset = warpIntensity * 3
          const trailOpacity = star.opacity * 0.7

          // Rounded line cap for motion blur effect
          ctx.lineCap = 'round'

          // Red channel (offset left)
          ctx.strokeStyle = `rgba(255, 80, 80, ${trailOpacity * 0.5})`
          ctx.lineWidth = size * 0.8
          ctx.beginPath()
          ctx.moveTo(star.prevX - aberrationOffset, star.prevY)
          ctx.lineTo(x - aberrationOffset * 0.3, y)
          ctx.stroke()

          // Green/White channel (center - brightest)
          ctx.strokeStyle = `rgba(255, 255, 255, ${trailOpacity})`
          ctx.lineWidth = size
          ctx.beginPath()
          ctx.moveTo(star.prevX, star.prevY)
          ctx.lineTo(x, y)
          ctx.stroke()

          // Blue channel (offset right)
          ctx.strokeStyle = `rgba(80, 80, 255, ${trailOpacity * 0.5})`
          ctx.lineWidth = size * 0.8
          ctx.beginPath()
          ctx.moveTo(star.prevX + aberrationOffset, star.prevY)
          ctx.lineTo(x + aberrationOffset * 0.3, y)
          ctx.stroke()

        } else {
          // Normal star with subtle motion blur
          ctx.lineCap = 'round'
          const blur = Math.min(8, star.velocity * 0.15)

          if (star.prevX !== undefined && star.prevY !== undefined && star.velocity > 1) {
            // Draw motion trail
            const gradient = ctx.createLinearGradient(star.prevX, star.prevY, x, y)
            gradient.addColorStop(0, `rgba(255, 255, 255, 0)`)
            gradient.addColorStop(1, `rgba(255, 255, 255, ${star.opacity})`)

            ctx.strokeStyle = gradient
            ctx.lineWidth = size
            ctx.beginPath()
            ctx.moveTo(star.prevX, star.prevY)
            ctx.lineTo(x, y)
            ctx.stroke()
          }

          // Star point with glow
          ctx.shadowColor = `rgba(255, 255, 255, ${star.opacity})`
          ctx.shadowBlur = blur
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
          ctx.beginPath()
          ctx.arc(x, y, size * 0.6, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [speed, loading])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />
      {/* Radial vignette overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, transparent 0%, rgba(0,0,0,0.8) 100%)'
        }}
      />
    </>
  )
}

/* ============================================================================
   NEURAL SHIMMER - Loading Text Animation
   ============================================================================ */

const NeuralShimmer: React.FC<{ children: React.ReactNode; active: boolean }> = ({ children, active }) => {
  if (!active) return <>{children}</>

  return (
    <div className="relative overflow-hidden">
      <div className="relative z-10">{children}</div>
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black, transparent)'
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  )
}

/* ============================================================================
   EMERALD CHEVRON - Glowing Submit Trigger
   ============================================================================ */

const EmeraldChevron: React.FC<{ isValid: boolean; isLoading: boolean }> = ({ isValid, isLoading }) => {
  if (isLoading) {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 size={22} className="text-emerald-500" />
      </motion.div>
    )
  }

  return (
    <motion.svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      animate={isValid ? {
        filter: [
          'drop-shadow(0 0 0 rgba(16, 185, 129, 0))',
          'drop-shadow(0 0 12px rgba(16, 185, 129, 0.6))',
          'drop-shadow(0 0 0 rgba(16, 185, 129, 0))'
        ]
      } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path
        d="m9 18 6-6-6-6"
        stroke={isValid ? '#10b981' : '#6b7280'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  )
}

/* ============================================================================
   RELEVANCE PROGRESS RING - SVG Match Score
   ============================================================================ */

const RelevanceRing: React.FC<{ percentage: number }> = ({ percentage }) => {
  const circumference = 2 * Math.PI * 10
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`

  return (
    <div className="absolute top-3 right-3 w-8 h-8">
      <svg width="32" height="32" viewBox="0 0 32 32" className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx="16"
          cy="16"
          r="10"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="2"
        />
        {/* Progress ring */}
        <motion.circle
          cx="16"
          cy="16"
          r="10"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          style={{
            filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-mono text-emerald-400 font-medium">
          {Math.round(percentage)}
        </span>
      </div>
    </div>
  )
}

/* ============================================================================
   LENS TOGGLE - Glass Pill with Magnification Effect
   ============================================================================ */

interface LensToggleProps {
  enabled: boolean
  onToggle: () => void
  onHover: (hovering: boolean) => void
}

const LensToggle: React.FC<LensToggleProps> = ({ enabled, onToggle, onHover }) => {
  return (
    <div className="flex items-center space-x-4">
      <span
        className={`text-[10px] font-mono tracking-[0.2em] transition-colors duration-300 ${!enabled ? 'text-white/70' : 'text-white/30'
          }`}
      >
        RAW
      </span>

      <motion.button
        onClick={onToggle}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        className="relative w-16 h-8 rounded-full overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        animate={enabled ? {
          borderColor: [
            'rgba(255, 255, 255, 0.1)',
            'rgba(16, 185, 129, 0.4)',
            'rgba(255, 255, 255, 0.1)'
          ]
        } : {}}
        transition={enabled ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        {/* Glass Lens Handle */}
        <motion.div
          className="absolute top-1 w-6 h-6 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(40px) brightness(1.2)',
            boxShadow: `
              0 2px 10px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.25)
            `,
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}
          animate={{ x: enabled ? 34 : 2 }}
          transition={{ type: 'spring', ...springConfig }}
        >
          {/* Magnification shimmer effect */}
          <div
            className="absolute inset-0.5 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)'
            }}
          />
        </motion.div>
      </motion.button>

      <span
        className={`text-[10px] font-mono tracking-[0.2em] transition-colors duration-300 ${enabled ? 'text-emerald-400' : 'text-white/30'
          }`}
        style={enabled ? { textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' } : {}}
      >
        GROUNDED
      </span>
    </div>
  )
}

/* ============================================================================
   GLASS CONTROL DOCK - The Lens Toggle & Upload
   ============================================================================ */

interface GlassDockProps {
  onFileUpload: (file: File) => void
  ragEnabled: boolean
  onToggleRAG: () => void
  documentCount: number
  uploadProgress: number | null
  isLoading: boolean
  onHoverInteractive: (hovering: boolean) => void
}

const GlassDock: React.FC<GlassDockProps> = ({
  onFileUpload,
  ragEnabled,
  onToggleRAG,
  documentCount,
  uploadProgress,
  isLoading,
  onHoverInteractive
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsProcessing(true)
      await onFileUpload(file)
      setTimeout(() => setIsProcessing(false), 500)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText size={16} />
    if (type.includes('image')) return <ImageIcon size={16} />
    return <File size={16} />
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
        {/* Upload Button with Processing Animation */}
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
              animate={isProcessing ? {
                rotate: 360,
                scale: [1, 1.2, 1]
              } : {}}
              transition={isProcessing ? {
                rotate: { duration: 0.5, repeat: Infinity, ease: 'linear' },
                scale: { duration: 0.5, repeat: Infinity }
              } : {}}
            >
              <Upload size={18} className="text-white/80" />
            </motion.div>

            {/* Status Pulse Dot */}
            <motion.div
              className={`w-2 h-2 rounded-full ${documentCount > 0 ? 'bg-emerald-500' : 'bg-zinc-500'
                }`}
              animate={{
                scale: documentCount > 0 ? [1, 1.3, 1] : 1,
                opacity: documentCount > 0 ? [0.7, 1, 0.7] : 0.4,
              }}
              style={documentCount > 0 ? {
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
              } : {}}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </motion.button>

          {/* Enhanced Tooltip */}
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
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ type: 'spring', ...springConfig }}
              >
                <div className="text-xs text-white/90 font-medium mb-1">
                  {documentCount > 0 ? `${documentCount} chunks indexed` : 'No documents'}
                </div>
                <div className="text-[10px] text-white/50 font-mono tracking-wide">
                  PDF • TXT • MD • CSV • JSON • XML • HTML • Images
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Upload Progress */}
        <AnimatePresence>
          {uploadProgress !== null && (
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              transition={{ type: 'spring', ...springConfig }}
            >
              <div
                className="w-24 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[10px] text-emerald-400 font-mono tracking-[0.15em]">
                SCANNING
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lens Toggle */}
        <LensToggle
          enabled={ragEnabled}
          onToggle={onToggleRAG}
          onHover={onHoverInteractive}
        />

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

/* ============================================================================
   GLASS-FOIL RESULT CARD - Ultra-minimal with Relevance Rings
   ============================================================================ */

interface GlassFoilCardProps {
  children: React.ReactNode
  glowColor: string
  isActive: boolean
  relevanceScore?: number
  delay?: number
}

const GlassFoilCard: React.FC<GlassFoilCardProps> = ({
  children,
  glowColor,
  isActive,
  relevanceScore,
  delay = 0
}) => {
  return (
    <motion.div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        backdropFilter: 'blur(60px)',
        border: '1px solid transparent',
        borderTopColor: 'rgba(255, 255, 255, 0.15)',
        borderLeftColor: 'rgba(255, 255, 255, 0.05)',
        borderRightColor: 'rgba(255, 255, 255, 0.05)',
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        boxShadow: `
          0 4px 24px rgba(0, 0, 0, 0.4),
          0 20px 50px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `
      }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', ...springConfig, delay }}
      whileHover={{
        y: -3,
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.5),
          0 32px 64px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.15)
        `
      }}
    >
      {/* Relevance Score Ring */}
      {relevanceScore !== undefined && (
        <RelevanceRing percentage={relevanceScore} />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Subtle glow overlay */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent, ${glowColor}10, transparent)`
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  )
}

/* ============================================================================
   BLINKING CURSOR
   ============================================================================ */

const BlinkingCursor: React.FC = () => (
  <motion.div
    className="inline-block w-0.5 h-14 bg-emerald-500 ml-2"
    animate={{ opacity: [1, 0.2, 1] }}
    transition={{
      duration: 1.2,
      ease: "easeInOut",
      repeat: Infinity
    }}
    style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}
  />
)

/* ============================================================================
   MAIN INTERFACE - RAGchat Canvas
   ============================================================================ */

interface QueryResult {
  rag_answer: string
  llm_only: string
  retrieved_chunks?: Array<{
    doc: string
    text: string
    match: number
  }>
  processing_time?: number
  mode?: string
}

export default function ZenithStealth() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [ragEnabled, setRagEnabled] = useState(true)
  const [documentCount, setDocumentCount] = useState(0)
  const [showUploadPrompt, setShowUploadPrompt] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [currentQuery, setCurrentQuery] = useState('')
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false)
  const [capabilities, setCapabilities] = useState<any>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Health polling every 5s
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get('/api/health')
        const chunkCount = response.data.chunks || 0
        setDocumentCount(chunkCount)
        if (chunkCount > 0 && showUploadPrompt) {
          setShowUploadPrompt(false)
        }
        if (response.data.capabilities) {
          setCapabilities(response.data.capabilities)
        }
      } catch (error) {
        // Silent fail - backend may not be ready
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 5000)
    return () => clearInterval(interval)
  }, [showUploadPrompt])

  const handleFileUpload = async (file: File) => {
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Progressive scanning animation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev !== null ? Math.min(prev + 6, 90) : 6)
      }, 100)

      const response = await axios.post('/api/ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      setTimeout(() => {
        setUploadProgress(null)
        setDocumentCount(response.data.total_chunks || documentCount + response.data.chunks_created)
        if (showUploadPrompt) setShowUploadPrompt(false)
      }, 800)

    } catch (error: any) {
      setUploadProgress(null)
      console.error('Upload failed:', error?.response?.data?.detail || error.message)
    }
  }

  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setCurrentQuery(query)
    setIsLoading(true)

    try {
      const response = await axios.post('/api/chat', {
        question: query,
        useRAG: ragEnabled
      }, {
        signal: controller.signal
      })

      setResults(response.data)
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Query failed:', error)
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const clearResults = () => {
    setResults(null)
    setQuery('')
    setCurrentQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      {/* Magnetic Custom Cursor */}
      <MagneticCursor isHoveringInteractive={isHoveringInteractive} />

      {/* Volumetric Space Background */}
      <VolumetricSpace speed={0.8} loading={isLoading} />

      {/* Neural Input Interface */}
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
        <AnimatePresence mode="wait">
          {/* Combined Layout - Upload Prompt + Query Input */}
          {!results && (
            <div className="flex flex-col items-center justify-center w-full max-w-6xl px-8 space-y-16">
              {/* Upload Prompt - Only when no documents */}
              {documentCount === 0 && (
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", ...springConfig }}
                >
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white/90 mb-4">
                    Upload documents first
                  </h1>
                  <p className="text-white/40 text-sm font-mono tracking-wide mb-6">
                    PDF • TXT • MD • CSV • JSON • XML • HTML • Images
                  </p>
                  <BlinkingCursor />
                </motion.div>
              )}

              {/* Query Input - Always Available */}
              <motion.div
                className="relative text-center w-full max-w-5xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", ...springConfig, delay: documentCount === 0 ? 0.2 : 0 }}
              >
                <NeuralShimmer active={isLoading}>
                  <div className="relative flex items-center justify-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onFocus={() => setIsHoveringInteractive(true)}
                      onBlur={() => setIsHoveringInteractive(false)}
                      placeholder={isLoading ? "Neural processing..." : "Ask anything..."}
                      disabled={isLoading}
                      className="w-full bg-transparent border-none outline-none text-4xl md:text-6xl font-bold tracking-tight text-center text-white/90 placeholder-white/25 pr-16"
                      style={{ caretColor: '#10b981' }}
                    />

                    {/* Chevron Trigger */}
                    <AnimatePresence>
                      {query.length > 0 && (
                        <motion.button
                          onClick={handleSubmit}
                          onMouseEnter={() => setIsHoveringInteractive(true)}
                          onMouseLeave={() => setIsHoveringInteractive(false)}
                          className="absolute right-0 p-4 rounded-full transition-colors"
                          style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                          initial={{ opacity: 0, x: 30, scale: 0.8 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 30, scale: 0.8 }}
                          whileHover={{
                            scale: 1.1,
                            background: 'rgba(16, 185, 129, 0.1)'
                          }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ type: 'spring', ...springConfig }}
                        >
                          <EmeraldChevron isValid={query.trim().length > 2} isLoading={isLoading} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </NeuralShimmer>

                {/* Mode indicator */}
                <motion.div
                  className="mt-6 text-[10px] font-mono tracking-[0.2em] text-white/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {ragEnabled ? 'GROUNDED MODE' : 'RAW LLM MODE'} • {documentCount} CHUNKS
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* Results State - Collapsed Query */}
          {results && (
            <motion.div
              key="results-query"
              className="fixed top-8 left-8 z-30 flex items-center space-x-4"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", ...springConfig }}
            >
              <button
                onClick={clearResults}
                onMouseEnter={() => setIsHoveringInteractive(true)}
                onMouseLeave={() => setIsHoveringInteractive(false)}
                className="p-2 rounded-full transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              >
                <X size={16} className="text-white/60" />
              </button>
              <div>
                <div className="text-lg font-semibold text-white/80 tracking-tight">
                  {currentQuery}
                </div>
                {results.processing_time && (
                  <div className="text-[10px] font-mono text-white/40 tracking-wide">
                    {results.processing_time}ms • {results.mode?.toUpperCase()}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Centered Results Layout */}
      <AnimatePresence>
        {results && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-30 px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", ...springConfig }}
          >
            <div className="w-full max-w-3xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2">
              {/* Primary Answer Card */}
              <GlassFoilCard
                glowColor="#10b981"
                isActive={ragEnabled}
                relevanceScore={results.retrieved_chunks?.[0]?.match}
                delay={0}
              >
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-emerald-500"
                      animate={{
                        boxShadow: [
                          '0 0 0 rgba(16, 185, 129, 0)',
                          '0 0 10px rgba(16, 185, 129, 0.6)',
                          '0 0 0 rgba(16, 185, 129, 0)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-[10px] font-mono tracking-[0.2em] text-emerald-400">
                      {ragEnabled ? 'GROUNDED' : 'RAW'}
                    </span>
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed font-light whitespace-pre-wrap">
                    {ragEnabled ? results.rag_answer : results.llm_only}
                  </p>
                </div>
              </GlassFoilCard>

              {/* Source Chunks */}
              {ragEnabled && results.retrieved_chunks && results.retrieved_chunks.length > 0 && (
                <GlassFoilCard glowColor="#10b981" isActive={false} delay={0.1}>
                  <div className="p-5">
                    <div className="text-[10px] font-mono tracking-[0.2em] text-white/40 mb-3">
                      SOURCES
                    </div>
                    <div className="space-y-3">
                      {results.retrieved_chunks.slice(0, 3).map((chunk, i) => (
                        <motion.div
                          key={i}
                          className="p-3 rounded-lg"
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-emerald-400 font-mono tracking-wide">
                              {chunk.doc}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono">
                              {chunk.match}% match
                            </span>
                          </div>
                          <div className="text-xs text-white/50 leading-relaxed line-clamp-2">
                            {chunk.text.substring(0, 150)}...
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </GlassFoilCard>
              )}

              {/* LLM Comparison (when in RAG mode) */}
              {ragEnabled && results.llm_only && (
                <GlassFoilCard glowColor="#6366f1" isActive={false} delay={0.2}>
                  <div className="p-5">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span className="text-[10px] font-mono tracking-[0.2em] text-indigo-400/70">
                        RAW LLM
                      </span>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed line-clamp-4">
                      {results.llm_only}
                    </p>
                  </div>
                </GlassFoilCard>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glass Control Dock */}
      <GlassDock
        onFileUpload={handleFileUpload}
        ragEnabled={ragEnabled}
        onToggleRAG={() => setRagEnabled(!ragEnabled)}
        documentCount={documentCount}
        uploadProgress={uploadProgress}
        isLoading={isLoading}
        onHoverInteractive={setIsHoveringInteractive}
      />

      {/* Quick Upload Hint */}
      <AnimatePresence>
        {showUploadPrompt && documentCount === 0 && (
          <motion.div
            className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-40"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", ...springConfig, delay: 0.5 }}
          >
            <motion.div
              className="px-6 py-3 rounded-xl text-center"
              style={{
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <p className="text-white/60 text-xs mb-1">
                Click the upload button below to add documents
              </p>
              <p className="text-[10px] text-white/30 font-mono">
                Supports PDF, TXT, PNG, JPG with OCR
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}