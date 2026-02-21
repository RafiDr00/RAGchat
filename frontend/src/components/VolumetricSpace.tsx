'use client'

import React, { useEffect, useRef } from 'react'

interface VolumetricSpaceProps {
    speed: number
    loading: boolean
}

const VolumetricSpace: React.FC<VolumetricSpaceProps> = ({ speed, loading }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number | undefined>(undefined)
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

        if (starsRef.current.length === 0) {
            starsRef.current = Array.from({ length: 1500 }, () => ({
                x: (Math.random() - 0.5) * 6000,
                y: (Math.random() - 0.5) * 6000,
                z: Math.random() * 3000,
                opacity: Math.random() * 0.9 + 0.1,
                velocity: 0,
                hue: Math.random() * 60 + 200
            }))
        }

        const animate = () => {
            ctx.fillStyle = 'rgba(5, 0, 16, 0.06)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const currentSpeed = loading ? 30.0 : speed
            const warpIntensity = currentSpeed / 30.0

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

                if (loading && star.prevX !== undefined && star.prevY !== undefined) {
                    const aberrationOffset = warpIntensity * 3
                    const trailOpacity = star.opacity * 0.7

                    ctx.lineCap = 'round'
                    ctx.strokeStyle = `rgba(255, 80, 80, ${trailOpacity * 0.5})`
                    ctx.lineWidth = size * 0.8
                    ctx.beginPath()
                    ctx.moveTo(star.prevX - aberrationOffset, star.prevY)
                    ctx.lineTo(x - aberrationOffset * 0.3, y)
                    ctx.stroke()

                    ctx.strokeStyle = `rgba(255, 255, 255, ${trailOpacity})`
                    ctx.lineWidth = size
                    ctx.beginPath()
                    ctx.moveTo(star.prevX, star.prevY)
                    ctx.lineTo(x, y)
                    ctx.stroke()

                    ctx.strokeStyle = `rgba(80, 80, 255, ${trailOpacity * 0.5})`
                    ctx.lineWidth = size * 0.8
                    ctx.beginPath()
                    ctx.moveTo(star.prevX + aberrationOffset, star.prevY)
                    ctx.lineTo(x + aberrationOffset * 0.3, y)
                    ctx.stroke()

                } else {
                    ctx.lineCap = 'round'
                    const blur = Math.min(8, star.velocity * 0.15)

                    if (star.prevX !== undefined && star.prevY !== undefined && star.velocity > 1) {
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

export default VolumetricSpace
