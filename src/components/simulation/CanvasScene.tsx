import { useEffect, useRef, useState } from 'react'
import { Maximize, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Cannon from './Cannon'
import { useCannonContext } from '@/context/CannonProvider'
import { toast } from 'sonner'
import { debounce } from '@/lib/utils'

/* ───────────────── CONSTANTS ───────────────── */

const GROUND_OFFSET = 30
const TARGET_RADIUS = 6 // meters (tune visually)
const TARGET_Y_OFFSET = 4 // meters above ground

// World size (meters)
const WORLD_WIDTH = 350
const WORLD_HEIGHT = 100
const AXIS_DIVISIONS = 7

// Physics
const GRAVITY = -9.81 // m/s²
const TIME_STEP = 1 / 60 // seconds

/* ───────────────── TYPES ───────────────── */

interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
}

/* ───────────────── COMPONENT ───────────────── */

export const CanvasScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const projectileRef = useRef<Projectile | null>(null)
  const animationRef = useRef<number | null>(null)
  const [scale, setScale] = useState(1)
  const [targetHit, setTargetHit] = useState(false)
  const fireSoundRef = useRef<HTMLAudioElement | null>(null)
  const exlosionSoundRef = useRef<HTMLAudioElement | null>(null)

  const {
    state: {
      controlPannel: { isGrid },
      targetPosition,
      cannonSettings: { angle: cannonAngle, speed }
    }
  } = useCannonContext()

  const isProjectileHitTarget = (
    px: number,
    py: number,
    tx: number,
    ty: number,
    radius: number
  ) => {
    const dx = px - tx
    const dy = py - ty
    return dx * dx + dy * dy <= radius * radius
  }

  /* ───────────────── CANVAS SETUP ───────────────── */

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const { width, height } = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = width * dpr
    canvas.height = height * dpr

    canvas.style.width = '100%'
    canvas.style.height = '100%'

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  /* ───────────────── COORDINATE UTILS ───────────────── */

  const metersToPixelsX = (m: number, w: number) => (m / WORLD_WIDTH) * w

  const metersToPixelsY = (m: number, h: number) =>
    h - GROUND_OFFSET - (m / WORLD_HEIGHT) * h

  /* ───────────────── DRAW HELPERS ───────────────── */

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const grid = w / AXIS_DIVISIONS / 12

    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 1

    for (let x = 0; x < w; x += grid) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    for (let y = 0; y < h; y += grid) {
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

    for (let i = 0; i <= AXIS_DIVISIONS; i++) {
      const x = (w / AXIS_DIVISIONS) * i
      ctx.fillText(`${Math.round(i * metersPerDivision)} m`, x + 8, h - 8)
    }

    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i
      ctx.fillText(`${(4 - i) * 25} m`, 8, y + 14)
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
    const y = metersToPixelsY(targetPosition.y + 4, h)

    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(x - 18, y + 12)
    ctx.lineTo(x + 18, y + 12)
    ctx.stroke()

    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(x, y - 8, 10, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawProjectile = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    const p = projectileRef.current
    if (!p || !p.active) return

    const x = metersToPixelsX(p.x, w)
    const y = metersToPixelsY(p.y, h)

    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  /* ───────────────── PHYSICS ───────────────── */

  const updateProjectile = () => {
    const p = projectileRef.current
    if (!p || !p.active) return

    // Integrate motion
    p.vy += GRAVITY * TIME_STEP
    p.x += p.vx * TIME_STEP
    p.y += p.vy * TIME_STEP

    // Ground collision
    if (p.y <= 0) {
      p.y = 0
      p.active = false
      return
    }

    // 🎯 TARGET COLLISION
    const targetX = targetPosition.x
    const targetY = targetPosition.y || TARGET_Y_OFFSET

    if (isProjectileHitTarget(p.x, p.y, targetX, targetY, TARGET_RADIUS)) {
      p.active = false
      toast.info('Target hit!', { position: 'top-center' })
      if (exlosionSoundRef.current) {
        exlosionSoundRef.current.currentTime = 0
        exlosionSoundRef.current?.play()
      }
      setTargetHit(true)
    }
  }

  /* ───────────────── ANIMATION ───────────────── */

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
    drawProjectile(ctx, w, h)

    ctx.restore()
  }

  const animate = () => {
    updateProjectile()
    draw()
    animationRef.current = requestAnimationFrame(animate)
  }

  /* ───────────────── FIRE ───────────────── */

  const getCannonMuzzle = (angleRad: number) => {
    return {
      // x: CANNON_BASE.x + Math.cos(angleRad) * CANNON_LENGTH,
      // y: CANNON_BASE.y + Math.sin(angleRad) * CANNON_LENGTH,
    }
  }

  const fire = () => {
    const angleRad = (Math.abs(cannonAngle) * Math.PI) / 180

    // const muzzle = getCannonMuzzle(angleRad)

    projectileRef.current = {
      x: 28,
      y: 16,
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      active: true
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    animationRef.current = requestAnimationFrame(animate)
    if (fireSoundRef.current) {
      fireSoundRef.current.currentTime = 0
      fireSoundRef.current?.play()
    }
  }

  const debouncedfire = debounce(fire, 300)

  /* ───────────────── EFFECTS ───────────────── */

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    draw()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isGrid, targetPosition])

  useEffect(() => {
    fireSoundRef.current = new Audio('/assets/sound/cannon_fire.mp3')
    fireSoundRef.current.volume = 0.5
    exlosionSoundRef.current = new Audio('/assets/sound/exlosion.mp3')
    exlosionSoundRef.current.volume = 0.5
  }, [])

  /* ───────────────── RENDER ───────────────── */

  return (
    <main
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-day-sky">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <Cannon />

      {/* UI */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col gap-1 rounded-lg bg-white/70 backdrop-blur-md p-0.5 shadow-sm border">
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={debouncedfire}
            // onClick={() => setScale((s) => Math.min(s + 0.1, 2))}
          >
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
