import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import Cannon from './Cannon'
import type {
  CannonContextType,
  CannonSettingsType,
  ControlPanelState,
  Projectile,
  ProjectilePathEntry,
  Target
} from '@/types'
import { useCannonActions, useCannonDerived, useCannonState } from '@/context'

/* ───────────────── CONSTANTS ───────────────── */

const GROUND_OFFSET = 30
const TARGET_RADIUS = 8 // meters (tune visually)
const TARGET_Y_OFFSET = 0.8 // meters above ground

const AIR_RESISTANCE = 0.015

// World size (meters)
const WORLD_WIDTH = 350
const WORLD_HEIGHT = 100
const AXIS_DIVISIONS = 7

// Physics
const GRAVITY = -9.81 // m/s²

const cannonBallImg = new Image()
cannonBallImg.src = '/assets/images/cannon-ball.png'

/* ───────────────── COMPONENT ───────────────── */
const CanvasScene = () => {
  const {
    handleAddProjectilePath,
    handleUpdateProjectilePath,
    handleToogleIsPlaying,
    handleRemoveProjectilePathById,
    handleChangeFireSummary
  } = useCannonActions()

  const state = useCannonState()
  const helperState = useCannonDerived()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const fireSoundRef = useRef<HTMLAudioElement | null>(null)
  const exlosionSoundRef = useRef<HTMLAudioElement | null>(null)
  const currentShotIdRef = useRef<string | null>(null)
  const [scale] = useState(1)
  const projectileRef = useRef<ProjectilePathEntry | null>(null)
  const applyControlSettings = useRef<Partial<ControlPanelState>>({})
  const lastTimeRef = useRef<number | null>(null)
  const isDrawRef = useRef(false)

  const controlPannelRef = useRef<
    Pick<CannonContextType['state']['controlPannel'], keyof ControlPanelState>
  >(state.controlPannel)
  const cannonSettingsRef = useRef<
    Pick<CannonContextType['state']['cannonSettings'], keyof CannonSettingsType>
  >(state.cannonSettings)
  const currentTargetRef = useRef<Target | null>(helperState.currentTarget)

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

  const pixelsToMetersX = useCallback(
    (px: number, canvasWidth: number) => (px * WORLD_WIDTH) / canvasWidth,
    []
  )

  const pixelsToMetersY = useCallback(
    (py: number, canvasHeight: number) =>
      ((canvasHeight - py - GROUND_OFFSET) * WORLD_HEIGHT) / canvasHeight,
    []
  )

  /* ───────────────── DRAW HELPERS ───────────────── */

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
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
    },
    []
  )

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
      const currentTarget = currentTargetRef.current
      const x = metersToPixelsX(currentTarget?.position.x ?? 0 + 6, w)
      const y = metersToPixelsY(currentTarget?.position.y ?? 0 + 4, h)

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
    []
  )

  const drawProjectile = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    const p = projectileRef.current
    if (!p || !p.active) return

    // Image may not be loaded yet
    if (!cannonBallImg.complete) return

    const x = metersToPixelsX(p.x, w)
    const y = metersToPixelsY(p.y, h)

    const size = 28

    ctx.drawImage(cannonBallImg, x - size / 2, y - size / 2, size, size)
  }

  /* ───────────────── PHYSICS ───────────────── */

  const stopSimulation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    handleToogleIsPlaying(false)
  }

  const updateProjectile = useCallback(
    (dt: number) => {
      const p = projectileRef.current
      const shotId = currentShotIdRef.current

      if (!p || !p.active || !shotId) return

      /* ───── SPEED ───── */
      const speedSq = p.vx * p.vx + p.vy * p.vy
      const speed = speedSq > 0 ? Math.sqrt(speedSq) : 0

      /* ───── ACCELERATION ───── */
      let ax = 0
      let ay = GRAVITY

      if (controlPannelRef.current.isAirResistance && speed > 0) {
        const drag = AIR_RESISTANCE * speedSq
        const invSpeed = 1 / speed

        ax -= drag * p.vx * invSpeed
        ay -= drag * p.vy * invSpeed
      }

      /* ───── INTEGRATE ───── */
      p.vx += ax * dt
      p.vy += ay * dt

      p.x += p.vx * dt
      p.y += p.vy * dt
      p.time += dt

      /* ───── GROUND COLLISION ───── */
      if (p.y <= 0) {
        p.y = 0
        p.active = false
        stopSimulation()
        handleChangeFireSummary()

        return
      }

      if (p.y > 100 || p.x > 360) {
        p.active = false
        handleChangeFireSummary()
        stopSimulation()
        toast.info('Out of range!', { position: 'top-center', duration: 1200 })
        return
      }

      /* ───── TARGET HIT ───── */
      const currentTarget = currentTargetRef.current
      const targetX = currentTarget?.position.x ?? 0
      const targetY = currentTarget?.position.y ?? TARGET_Y_OFFSET

      handleUpdateProjectilePath(shotId, { x: p.x, y: p.y }, p)

      if (isProjectileHitTarget(p.x, p.y, targetX, targetY, TARGET_RADIUS)) {
        p.active = false
        toast.info('Target hit!', { position: 'top-center', duration: 1200 })
        if (exlosionSoundRef.current) {
          exlosionSoundRef.current.pause()
          exlosionSoundRef.current.currentTime = 0
          exlosionSoundRef.current.play()
        }
        stopSimulation()
        handleChangeFireSummary(true)
      }
    },
    [handleUpdateProjectilePath, handleChangeFireSummary]
  )

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
    if (!controlPannelRef.current.isVector) return

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

  const getCannonMuzzleWorld = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
      return { x: 0, y: 0 }
    }

    const { width, height } = canvas
    const { angle, position } = cannonSettingsRef.current

    const angleRad = (angle * Math.PI) / 180
    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    const muzzleX = position.x + cos * 70
    const muzzleY = position.y + sin * 70

    const muzzleWorld = {
      x: pixelsToMetersX(muzzleX, width),
      y: pixelsToMetersY(muzzleY, height)
    }

    return muzzleWorld
  }, [pixelsToMetersX, pixelsToMetersY])

  const drawProjectilePaths = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    if (!controlPannelRef.current.isPath) {
      return
    }

    const paths = state.projectilePaths
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

    const ctx = canvas.getContext('2d')!
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.scale(scale, scale)

    if (controlPannelRef.current.isGrid) {
      drawGrid(ctx, w, h)
    } else {
      applyControlSettings.current.isGrid = false
    }
    drawGround(ctx, w, h)
    drawAxes(ctx, w, h)

    // actual path (past)
    if (controlPannelRef.current.isPath) {
      drawProjectilePaths(ctx, w, h)
    }

    drawTarget(ctx, w, h)

    // projectile
    const p = projectileRef.current
    if (p) {
      drawProjectile(ctx, w, h)

      if (p.active) {
        drawVelocityVector(ctx, p.x, p.y, p.vx, p.vy, w, h)
      }
    }

    ctx.restore()
  }, [
    scale,
    helperState.activeProjectile,
    state.controlPannel,
    helperState.currentTarget
  ])

  const animate = useCallback(
    (now: number) => {
      const p = projectileRef.current

      if (!p || !p.active) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
        return
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = now
      }

      const dt = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      updateProjectile(dt)
      draw()

      animationRef.current = requestAnimationFrame(animate)
    },
    [draw, updateProjectile]
  )

  const fire = useCallback(() => {
    const cannonSettings = cannonSettingsRef.current

    /* ───── REMOVE PREVIOUS SHOT ───── */
    if (state.isPlaying && currentShotIdRef.current) {
      handleRemoveProjectilePathById(currentShotIdRef.current)
    }

    /* ───── CREATE PROJECTILE ───── */
    const angleRad = Math.abs(cannonSettings.angle) * (Math.PI / 180)
    const muzzle = getCannonMuzzleWorld()
    const fireId = crypto.randomUUID()

    const projectile: Projectile = {
      x: muzzle?.x ?? 0,
      y: muzzle?.y ?? 0,
      vx: Math.cos(angleRad) * cannonSettings.speed,
      vy: Math.sin(angleRad) * cannonSettings.speed,
      active: true,
      time: 0
    }

    /* ───── SET STATE (NO RERENDER) ───── */
    projectileRef.current = {
      ...projectile,
      paths: []
    }

    currentShotIdRef.current = fireId
    handleToogleIsPlaying(true)

    handleAddProjectilePath(fireId, {
      ...projectile,
      paths: []
    })

    /* ───── RESET ANIMATION LOOP ───── */
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    // IMPORTANT: reset time so dt doesn't jump
    lastTimeRef.current = null

    animationRef.current = requestAnimationFrame(animate)

    /* ───── SOUND ───── */
    if (fireSoundRef.current) {
      fireSoundRef.current.pause()
      fireSoundRef.current.currentTime = 0
      fireSoundRef.current.play()
    }
    if (exlosionSoundRef.current) {
      exlosionSoundRef.current!.currentTime = 0
      exlosionSoundRef.current!.pause()
    }
  }, [
    animate,
    state.isPlaying,
    getCannonMuzzleWorld,
    handleAddProjectilePath,
    handleRemoveProjectilePathById,
    handleToogleIsPlaying
  ])

  const cleanupScene = useCallback((isCleanAll: boolean = true) => {
    lastTimeRef.current = null
    currentShotIdRef.current = null
    projectileRef.current = null

    if (isCleanAll) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      if (fireSoundRef.current) {
        fireSoundRef.current.pause()
        fireSoundRef.current.src = ''
        fireSoundRef.current = null
      }

      if (exlosionSoundRef.current) {
        exlosionSoundRef.current.pause()
        exlosionSoundRef.current.src = ''
        exlosionSoundRef.current = null
      }

      window.removeEventListener('resize', resizeCanvas)

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }, [])

  const initiateCanvas = () => {
    resizeCanvas()
    draw()
    window.addEventListener('resize', resizeCanvas)
  }

  const handleReset = useCallback(() => {
    cleanupScene(false)
    initiateCanvas()
  }, [])

  /* ───────────────── EFFECTS ───────────────── */

  useEffect(() => {
    initiateCanvas()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  useEffect(() => {
    fireSoundRef.current = new Audio('/assets/sound/cannon_fire.mp3')
    fireSoundRef.current.volume = 0.5
    exlosionSoundRef.current = new Audio('/assets/sound/exlosion.mp3')
    exlosionSoundRef.current.volume = 0.5
  }, [])

  useEffect(() => {
    if (state.isFired && !state.isPlaying) {
      fire()
    }
  }, [state.isFired, fire, state.isPlaying])

  useEffect(() => {
    if (state.isReset) {
      handleReset()
    }
  }, [state.isReset])

  useEffect(() => {
    if (helperState.currentTarget && !isDrawRef.current) {
      draw()
      isDrawRef.current = true
    }
  }, [draw, helperState.currentTarget])

  useEffect(() => {
    controlPannelRef.current = state.controlPannel
  }, [state.controlPannel])

  useEffect(() => {
    cannonSettingsRef.current = state.cannonSettings
  }, [state.cannonSettings])

  useEffect(() => {
    currentTargetRef.current = helperState.currentTarget
  }, [helperState.currentTarget])

  useEffect(() => {
    return () => {
      if (projectileRef.current) {
        cleanupScene()
      }
    }
  }, [])

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
