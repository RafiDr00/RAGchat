'use client'

import React, { useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

interface MagneticCursorProps {
    isHoveringInteractive: boolean
}

const MagneticCursor: React.FC<MagneticCursorProps> = ({ isHoveringInteractive }) => {
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

export default MagneticCursor
