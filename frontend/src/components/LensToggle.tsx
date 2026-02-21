'use client'

import React from 'react'
import { motion } from 'framer-motion'

const springConfig = {
    stiffness: 260,
    damping: 20
}

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

export default LensToggle
