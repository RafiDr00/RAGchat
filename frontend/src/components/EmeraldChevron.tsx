'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface EmeraldChevronProps {
    isValid: boolean
    isLoading: boolean
}

const EmeraldChevron: React.FC<EmeraldChevronProps> = ({ isValid, isLoading }) => {
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

export default EmeraldChevron
