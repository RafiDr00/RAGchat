'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface NeuralShimmerProps {
    children: React.ReactNode
    active: boolean
}

const NeuralShimmer: React.FC<NeuralShimmerProps> = ({ children, active }) => {
    if (!active) return <>{children}</>

    return (
        <div className="relative overflow-hidden">
            <div className="relative z-10">{children}</div>
            <motion.div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 50%, transparent 100%)',
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

export default NeuralShimmer
