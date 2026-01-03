import { memo, useCallback, useEffect, useRef, useState } from 'react'
import Cannon from './Cannon'
import { useCannonContext } from '@/context/CannonProvider'
import { toast } from 'sonner'
import { debounce } from '@/lib/utils'
import type { CannonContextType, Projectile } from '@/types'

/* ───────────────── CONSTANTS ───────────────── */

const GROUND_OFFSET = 30
const TARGET_RADIUS = 10 // meters (tune visually)
const TARGET_Y_OFFSET = 0.8 // meters above ground

const AIR_RESISTANCE = 0.015

// World size (meters)
const WORLD_WIDTH = 350
const WORLD_HEIGHT = 100
const AXIS_DIVISIONS = 7

// Physics
const GRAVITY = -9.81 // m/s²
const TIME_STEP = 1 / 60 // seconds

const cannonBallImg = new Image()
cannonBallImg.src = '/assets/images/cannon-ball.png'

/* ───────────────── COMPONENT ───────────────── */
const CanvasScene = () => {
  const {
    state,
    helperState,
    stateHandler: {
      handleAddProjectilePath,
      handleUpdateProjectilePath,
      handleToogleIsPlaying,
      handleRemoveProjectilePathById
    }
  } = useCannonContext()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const fireSoundRef = useRef<HTMLAudioElement | null>(null)
  const exlosionSoundRef = useRef<HTMLAudioElement | null>(null)
  const currentShotIdRef = useRef<string | null>(null)
  const [scale] = useState(1)
  const stateRef = useRef<Pick<CannonContextType, 'state' | 'helperState'>>({
    state,
    helperState
  })
  const { state: cannonState } = stateRef.current

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

  const pixelsToMetersX = (px: number, canvasWidth: number) =>
    (px / canvasWidth) * WORLD_WIDTH

  const pixelsToMetersY = (py: number, canvasHeight: number) =>
    ((canvasHeight - py - GROUND_OFFSET) / canvasHeight) * WORLD_HEIGHT

  /* ───────────────── DRAW HELPERS ───────────────── */

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!cannonState.controlPannel.isGrid) {
      ctx.clearRect(0, 0, w, h)
      return
    }
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

    for (let i = 0; i < 4; i++) {
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

  const drawTarget = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const x = metersToPixelsX(cannonState.targetPosition.x + 6, w)
      const y = metersToPixelsY(cannonState.targetPosition.y + 4, h)

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
    },
    [state.targetPosition]
  )

  const drawProjectile = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    const p = stateRef.current.helperState.activeProjectile
    if (!p || !p.active) return

    // Image may not be loaded yet
    if (!cannonBallImg.complete) return

    const x = metersToPixelsX(p.x, w)
    const y = metersToPixelsY(p.y, h)

    const size = 28

    ctx.drawImage(cannonBallImg, x - size / 2, y - size / 2, size, size)
  }

  /* ───────────────── PHYSICS ───────────────── */

  const updateProjectile = useCallback(() => {
    const p = JSON.parse(
      JSON.stringify(stateRef.current.helperState.activeProjectile)
    )

    const shotId = currentShotIdRef.current
    if (!p || !p.active || !shotId) return

    /* ───── SPEED ───── */
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)

    /* ───── AIR RESISTANCE (CONDITIONAL) ───── */
    let ax = 0
    let ay = GRAVITY

    if (cannonState.controlPannel.isAirResistance && speed > 0) {
      const dragForce = AIR_RESISTANCE * speed * speed

      ax -= dragForce * (p.vx / speed)
      ay -= dragForce * (p.vy / speed)
    }

    /* ───── INTEGRATE ───── */
    p.vx += ax * TIME_STEP
    p.vy += ay * TIME_STEP

    p.x += p.vx * TIME_STEP
    p.y += p.vy * TIME_STEP

    /* ───── GROUND COLLISION ───── */
    if (p.y <= 0) {
      p.y = 0
      p.active = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      stateRef.current.state.isPlaying = false
      handleToogleIsPlaying(false)
      return
    }

    /* ───── TARGET HIT ───── */
    const targetX = cannonState.targetPosition.x
    const targetY = cannonState.targetPosition.y || TARGET_Y_OFFSET

    const newTime = p.time + TIME_STEP

    handleUpdateProjectilePath(
      shotId,
      { x: p.x, y: p.y },
      { ...p, time: newTime }
    )

    if (isProjectileHitTarget(p.x, p.y, targetX, targetY, TARGET_RADIUS)) {
      p.active = false
      toast.info('Target hit!', { position: 'top-center' })
      exlosionSoundRef.current?.play()
      stateRef.current.state.isPlaying = false

      handleToogleIsPlaying(false)

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [helperState.activeProjectile, state.targetPosition])

  /* ───────────────── ANIMATION ───────────────── */

  const drawVelocityVector = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    vx: number,
    vy: number,
    w: number,
    h: number
  ) => {
    if (!cannonState.controlPannel.isVector) return

    const SCALE = 0.8 // visual scale (meters per m/s)

    const startX = metersToPixelsX(x, w)
    const startY = metersToPixelsY(y, h)

    const endX = metersToPixelsX(x + vx * SCALE, w)
    const endY = metersToPixelsY(y + vy * SCALE, h)

    ctx.strokeStyle = 'rgba(34,197,94,0.9)' // green
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // arrow head
    const angle = Math.atan2(endY - startY, endX - startX)
    const headLength = 8

    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fillStyle = 'rgba(34,197,94,0.9)'
    ctx.fill()
  }

  /* ───────────────── FIRE ───────────────── */

  const getCannonMuzzleWorld = () => {
    const canvas = canvasRef.current!
    const { width, height } = canvas

    const angleRad = (cannonState.cannonSettings.angle * Math.PI) / 180

    // SVG → pixel muzzle
    const muzzlePx = {
      x: cannonState.cannonSettings.position.x + Math.cos(angleRad) * 70,
      y: cannonState.cannonSettings.position.y + Math.sin(angleRad) * 70
    }

    // pixel → meters
    return {
      x: pixelsToMetersX(muzzlePx.x, width),
      y: pixelsToMetersY(muzzlePx.y, height)
    }
  }

  const drawProjectilePaths = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    if (!cannonState.controlPannel.isPath) {
      ctx.clearRect(0, 0, w, h)
      return
    }
    const paths = stateRef.current.state.projectilePaths
    if (Object.keys(paths ?? {}).length > 0) {
      Object.values(paths).forEach((path, index) => {
        if (path.paths.length < 2) return

        const hue = (index * 60) % 360
        ctx.strokeStyle = `hsla(${hue}, 80%, 55%, 0.6)`

        ctx.lineWidth = 4
        ctx.setLineDash([])

        ctx.beginPath()

        path.paths.forEach((p, i) => {
          const x = metersToPixelsX(p.x, w)
          const y = metersToPixelsY(p.y, h)

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.stroke()
      })
    }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { controlPannel } = stateRef.current.state

    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.scale(scale, scale)

    if (controlPannel.isGrid) drawGrid(ctx, w, h)
    drawGround(ctx, w, h)
    drawAxes(ctx, w, h)

    // actual path (past)
    if (controlPannel.isPath) {
      drawProjectilePaths(ctx, w, h)
    }

    drawTarget(ctx, w, h)

    // projectile
    if (stateRef.current.helperState.activeProjectile) drawProjectile(ctx, w, h)

    const p = stateRef.current.helperState.activeProjectile
    if (p && p.active) {
      drawVelocityVector(ctx, p.x, p.y, p.vx, p.vy, w, h)
    }

    ctx.restore()
  }, [
    scale,
    helperState.activeProjectile,
    state.controlPannel,
    state.targetPosition
  ])

  const animate = () => {
    const p = stateRef.current.helperState.activeProjectile

    if (!p || !p.active || !stateRef.current.state.isPlaying) {
      animationRef.current = null
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      return
    }

    updateProjectile()
    draw()

    animationRef.current = requestAnimationFrame(animate)
  }

  const fire = useCallback(() => {
    if (cannonState.isPlaying) {
      handleRemoveProjectilePathById(currentShotIdRef.current as string)
    }
    const angleRad =
      (Math.abs(cannonState.cannonSettings.angle) * Math.PI) / 180

    const muzzle = getCannonMuzzleWorld()

    const fireId = crypto.randomUUID()

    const projectDetails: Projectile = {
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(angleRad) * cannonState.cannonSettings.speed,
      vy: Math.sin(angleRad) * cannonState.cannonSettings.speed,
      active: true,
      time: 0
    }

    stateRef.current.helperState.activeProjectile = {
      ...projectDetails,
      paths: []
    }
    stateRef.current.state.isPlaying = true

    handleAddProjectilePath(fireId, { ...projectDetails, paths: [] })

    currentShotIdRef.current = fireId

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    animate()

    if (fireSoundRef.current) {
      fireSoundRef.current.currentTime = 0
      fireSoundRef.current?.play()
      if (exlosionSoundRef.current) {
        exlosionSoundRef.current.currentTime = 0
      }
    }
  }, [state.cannonSettings, state.controlPannel, state.targetPosition])

  const handleReset = () => {
    stateRef.current = {
      state,
      helperState
    }
    currentShotIdRef.current = null
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    draw()
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
  }, [scale, state.targetPosition])

  useEffect(() => {
    fireSoundRef.current = new Audio('/assets/sound/cannon_fire.mp3')
    fireSoundRef.current.volume = 0.5
    exlosionSoundRef.current = new Audio('/assets/sound/exlosion.mp3')
    exlosionSoundRef.current.volume = 0.5
  }, [])

  useEffect(() => {
    stateRef.current = {
      state,
      helperState
    }
  }, [state, helperState])

  useEffect(() => {
    if (state.isFired) {
      debouncedfire()
    }
  }, [state.isFired])

  useEffect(() => {
    if (state.isReset) {
      handleReset()
    }
  }, [state.isReset])

  /* ───────────────── RENDER ───────────────── */

  return (
    <main
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-day-sky">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <Cannon />

      {/* UI */}
      {/* <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col gap-1 rounded-lg bg-white/70 backdrop-blur-md p-0.5 shadow-sm border">
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => setScale((s) => Math.min(s + 0.1))}>
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
      </div> */}
    </main>
  )
}

export default memo(CanvasScene)
