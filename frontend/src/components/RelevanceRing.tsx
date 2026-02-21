'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface RelevanceRingProps {
    percentage: number
}

const RelevanceRing: React.FC<RelevanceRingProps> = ({ percentage }) => {
    const circumference = 2 * Math.PI * 10
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`

    return (
        <div className="absolute top-3 right-3 w-8 h-8">
            <svg width="32" height="32" viewBox="0 0 32 32" className="transform -rotate-90">
                <circle
                    cx="16"
                    cy="16"
                    r="10"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="2"
                />
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

export default RelevanceRing
