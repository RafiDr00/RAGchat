'use client'

import React from 'react'
import { motion } from 'framer-motion'
import RelevanceRing from './RelevanceRing'

const springConfig = {
    stiffness: 260,
    damping: 20
}

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
            {relevanceScore !== undefined && (
                <RelevanceRing percentage={relevanceScore} />
            )}

            <div className="relative z-10">
                {children}
            </div>

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

export default GlassFoilCard
