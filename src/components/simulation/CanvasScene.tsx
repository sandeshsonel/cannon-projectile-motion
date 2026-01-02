import { useEffect, useRef, useState } from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import Cannon from './Cannon'
import { useCannonContext } from '@/context/CannonProvider'

const GROUND_OFFSET = 30

// WORLD SETTINGS
const WORLD_WIDTH = 350 // meters
const WORLD_HEIGHT = 100 // meters
const AXIS_DIVISIONS = 7 // 7 x 50m = 350m

export const CanvasScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    state: {
      controlPannel: { isGrid },
      targetPosition
    }
  } = useCannonContext()

  const [scale, setScale] = useState(1)

  // 🎯 Target position (meters)
  // const [target] = useState({ x: 106, y: 4 })

  /* ------------------------- CANVAS SETUP ------------------------- */
  const resizeCanvas = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const { width, height } = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = width * dpr
    canvas.height = height * dpr

    canvas.style.width = `100%`
    canvas.style.height = `100%`

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  /* ---------------------- WORLD → SCREEN ---------------------- */

  const metersToPixelsX = (meters: number, width: number) =>
    (meters / WORLD_WIDTH) * width

  const metersToPixelsY = (meters: number, height: number) =>
    height - GROUND_OFFSET - (meters / WORLD_HEIGHT) * height

  /* ---------------------------- DRAWING ---------------------------- */

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gridSize = ((w / AXIS_DIVISIONS) * scale) / 12

    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 1

    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }

  const drawAxes = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#64748b'
    ctx.font = '12px sans-serif'

    const metersPerDivision = WORLD_WIDTH / AXIS_DIVISIONS

    // X axis
    for (let i = 0; i <= AXIS_DIVISIONS; i++) {
      const x = (w / AXIS_DIVISIONS) * i
      ctx.fillText(`${Math.round(i * metersPerDivision)} m`, x + 10, h - 10)
    }

    // Y axis
    for (let i = 0; i < 4; i++) {
      const y = (h / 4) * i
      ctx.fillText(`${(4 - i) * 25} m`, 10, y + 14)
    }
  }

  const drawGround = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, h - GROUND_OFFSET)
    ctx.lineTo(w, h - GROUND_OFFSET)
    ctx.stroke()
  }

  const drawTarget = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const x = metersToPixelsX(targetPosition.x + 6, w)
    const y = metersToPixelsY(targetPosition.y === 0 ? 4 : targetPosition.y, h)

    // Base
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x - 18, y + 12)
    ctx.lineTo(x + 18, y + 12)
    ctx.stroke()

    // Pin
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(x, y - 8, 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 6, y + 12)
    ctx.lineTo(x + 6, y + 12)
    ctx.closePath()
    ctx.fill()
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    ctx.save()
    ctx.scale(scale, scale)

    if (isGrid) drawGrid(ctx, w, h)
    drawGround(ctx, w, h)
    drawAxes(ctx, w, h)
    drawTarget(ctx, w, h)

    ctx.restore()
  }

  /* ---------------------------- EFFECTS ---------------------------- */

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    draw()

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [scale, isGrid, targetPosition])

  /* ---------------------------- RENDER ---------------------------- */

  return (
    <main
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-day-sky">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <Cannon />

      {/* UI */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col gap-1 rounded-lg bg-white/70 backdrop-blur-md p-0.5 shadow-sm border">
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => setScale((s) => Math.min(s + 0.1, 2))}>
            <Plus />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => setScale(1)}>
            <Maximize />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => setScale((s) => Math.max(s - 0.1, 0.3))}>
            <Minus />
          </Button>
        </div>
      </div>
    </main>
  )
}
