'use client'

import React from 'react'
import { motion } from 'framer-motion'

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

export default BlinkingCursor
