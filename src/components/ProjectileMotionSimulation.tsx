import React, { useState, useRef, useEffect, useCallback } from 'react'

interface ProjectileState {
  x: number
  y: number
  vx: number
  vy: number
  time: number
}

interface ProjectileHistory {
  id: number
  name: string
  timestamp: string
  angle: number
  speed: number
  airResistance: boolean
  path: { x: number; y: number }[]
  color: string
  startX: number
  startY: number
  targetX: number
  targetY: number
  landingDistance?: number
  maxHeight?: number
  flightTime?: number
}

interface SimulationLog {
  id: number
  timestamp: string
  angle: number
  speed: number
  targetX: number
  targetY: number
  hitDistance: number
  airResistance: boolean
}

const ProjectileMotionSimulation: React.FC = () => {
  // Canvas and simulation references
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const projectilePathRef = useRef<{ x: number; y: number }[]>([])

  // Simulation paused state
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [, setPauseTime] = useState<number>(0)

  // Simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [time, setTime] = useState<number>(0)
  const [projectile, setProjectile] = useState<ProjectileState>({
    x: 0,
    y: 0,
    vx: 20,
    vy: 40,
    time: 0
  })

  // Mouse interaction state
  const [isAiming, setIsAiming] = useState<boolean>(false)
  const [mousePosition, setMousePosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [isSettingTarget, setIsSettingTarget] = useState<boolean>(false)

  // Projectile History
  const [projectileHistories, setProjectileHistories] = useState<
    ProjectileHistory[]
  >([])
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null)
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(true)
  const [newProjectileName, setNewProjectileName] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('#4299e1')

  // Reply/Log functionality
  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([])
  const [showReplyPanel, setShowReplyPanel] = useState<boolean>(false)
  const [lastHitDistance, setLastHitDistance] = useState<number | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)

  // Simulation parameters
  const [initialSpeed, setInitialSpeed] = useState<number>(62.3)
  const [angle, setAngle] = useState<number>(63)
  const [airResistance, setAirResistance] = useState<boolean>(false)
  const [cannonPosition, setCannonPosition] = useState({ x: 0, y: 0 })
  const [targetPosition, setTargetPosition] = useState({ x: 100, y: 0 })
  const [saveButtonClassName, setSaveButtonClassName] = useState('')

  // Color palette for projectile paths
  const colorPalette = [
    '#4299e1', // Blue
    '#48bb78', // Green
    '#ed8936', // Orange
    '#9f7aea', // Purple
    '#f56565', // Red
    '#0bc5ea', // Cyan
    '#ecc94b', // Yellow
    '#a0aec0' // Gray
  ]

  // Constants
  const GRAVITY = 9.81
  const DRAG_COEFFICIENT = 0.01
  const TIME_STEP = 0.016 // ~60 FPS
  const PIXELS_PER_METER = 2
  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 500

  // Convert angle to radians
  const angleInRadians = (angle * Math.PI) / 180

  // Convert canvas coordinates to simulation coordinates
  const canvasToSimCoords = useCallback((canvasX: number, canvasY: number) => {
    const simX = canvasX / PIXELS_PER_METER
    const simY = (CANVAS_HEIGHT - canvasY) / PIXELS_PER_METER
    return { x: simX, y: simY }
  }, [])

  // Convert simulation coordinates to canvas coordinates
  const simToCanvasCoords = useCallback((simX: number, simY: number) => {
    const canvasX = simX * PIXELS_PER_METER
    const canvasY = CANVAS_HEIGHT - simY * PIXELS_PER_METER
    return { x: canvasX, y: canvasY }
  }, [])

  // Calculate angle and speed from two points
  const calculateTrajectoryFromMouse = useCallback(
    (mouseX: number, mouseY: number) => {
      const startCoords = simToCanvasCoords(cannonPosition.x, cannonPosition.y)
      const dx = mouseX - startCoords.x
      const dy = mouseY - startCoords.y

      // Calculate angle (in degrees, 0-90)
      const calculatedAngle = Math.atan2(dy, dx) * (180 / Math.PI)
      const limitedAngle = Math.max(0, Math.min(90, 90 - calculatedAngle))

      // Calculate speed based on distance (with some scaling)
      const distance = Math.sqrt(dx * dx + dy * dy) / PIXELS_PER_METER
      const calculatedSpeed = Math.min(100, Math.max(10, distance / 2))

      return { angle: limitedAngle, speed: calculatedSpeed }
    },
    [cannonPosition, simToCanvasCoords]
  )

  // Initialize projectile based on current parameters
  const initializeProjectile = useCallback(() => {
    const vx = initialSpeed * Math.cos(angleInRadians)
    const vy = initialSpeed * Math.sin(angleInRadians)

    setProjectile({
      x: cannonPosition.x,
      y: cannonPosition.y,
      vx,
      vy,
      time: 0
    })
    setTime(0)
    projectilePathRef.current = []
    setIsPaused(false)
    setPauseTime(0)

    if (isPlaying) {
      setIsPlaying(false)
      cancelAnimationFrame(animationRef.current)
    }
  }, [initialSpeed, cannonPosition, isPlaying, angleInRadians])

  // Start or resume simulation
  const startOrResumeSimulation = useCallback(() => {
    if (projectile.y < 0) {
      // Projectile has landed, restart from beginning
      initializeProjectile()
    }

    setIsPlaying(true)
    setIsPaused(false)
  }, [projectile.y, initializeProjectile])

  // Pause simulation
  const pauseSimulation = useCallback(() => {
    setIsPlaying(false)
    setIsPaused(true)
    setPauseTime(time)
    cancelAnimationFrame(animationRef.current)
  }, [time])

  // Calculate projectile statistics
  const calculateProjectileStats = useCallback(
    (path: { x: number; y: number }[]) => {
      if (path.length === 0)
        return { landingDistance: 0, maxHeight: 0, flightTime: 0 }

      const landingDistance = path[path.length - 1]?.x || 0
      const maxHeight = Math.max(...path.map((p) => p.y))
      const flightTime = path.length * TIME_STEP

      return { landingDistance, maxHeight, flightTime }
    },
    [TIME_STEP]
  )

  // Save current projectile to history
  const saveToHistory = useCallback(() => {
    if (projectilePathRef.current && projectilePathRef.current.length > 0) {
      const stats = calculateProjectileStats(projectilePathRef.current)
      const name =
        newProjectileName || `Projectile ${projectileHistories.length + 1}`
      const color = selectedColor

      const newHistory: ProjectileHistory = {
        id: Date.now(),
        name,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        angle,
        speed: initialSpeed,
        airResistance,
        path: [...projectilePathRef.current],
        color,
        startX: cannonPosition.x,
        startY: cannonPosition.y,
        targetX: targetPosition.x,
        targetY: targetPosition.y,
        landingDistance: stats.landingDistance,
        maxHeight: stats.maxHeight,
        flightTime: stats.flightTime
      }

      setProjectileHistories((prev) => [newHistory, ...prev])
      setActiveHistoryId(newHistory.id)
      setNewProjectileName('')
      setSelectedColor(
        colorPalette[(projectileHistories.length + 1) % colorPalette.length]
      )
    }
  }, [
    angle,
    initialSpeed,
    airResistance,
    cannonPosition,
    targetPosition,
    newProjectileName,
    selectedColor,
    projectileHistories.length,
    calculateProjectileStats
  ])

  // Load projectile from history
  const loadFromHistory = useCallback(
    (history: ProjectileHistory) => {
      setAngle(history.angle)
      setInitialSpeed(history.speed)
      setAirResistance(history.airResistance)
      setCannonPosition({ x: history.startX, y: history.startY })
      setTargetPosition({ x: history.targetX, y: history.targetY })
      setActiveHistoryId(history.id)
      setSelectedColor(history.color)

      // Don't auto-play when loading from history
      setIsPlaying(false)
      setIsPaused(false)
      cancelAnimationFrame(animationRef.current)
      projectilePathRef.current = history.path

      // Find the last projectile position from history
      if (history.path.length > 0) {
        const lastPoint = history.path[history.path.length - 1]
        const secondLastPoint =
          history.path[history.path.length - 2] || lastPoint

        // Calculate approximate velocities from last two points
        const dt = TIME_STEP
        const vx = (lastPoint.x - secondLastPoint.x) / dt
        const vy = (lastPoint.y - secondLastPoint.y) / dt

        setProjectile({
          x: lastPoint.x,
          y: lastPoint.y,
          vx,
          vy,
          time: history.flightTime || history.path.length * TIME_STEP
        })
        setTime(history.flightTime || history.path.length * TIME_STEP)
      }
    },
    [TIME_STEP]
  )

  // Clear specific projectile history
  const clearHistory = useCallback(
    (id: number) => {
      setProjectileHistories((prev) => prev.filter((h) => h.id !== id))
      if (activeHistoryId === id) {
        setActiveHistoryId(null)
      }
    },
    [activeHistoryId]
  )

  // Clear all projectile histories
  const clearAllHistories = useCallback(() => {
    setProjectileHistories([])
    setActiveHistoryId(null)
  }, [])

  // Handle canvas mouse events
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicking on cannon (for aiming mode)
    const cannonCanvasPos = simToCanvasCoords(
      cannonPosition.x,
      cannonPosition.y
    )
    const distanceToCannon = Math.sqrt(
      Math.pow(x - cannonCanvasPos.x, 2) + Math.pow(y - cannonCanvasPos.y, 2)
    )

    if (distanceToCannon <= 20) {
      // Start aiming mode
      setIsAiming(true)
      setMousePosition({ x, y })
      e.preventDefault()
    } else if (e.shiftKey || isSettingTarget) {
      // Set target position
      const simPos = canvasToSimCoords(x, y)
      setTargetPosition(simPos)
      setIsSettingTarget(false)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAiming) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePosition({ x, y })

    // Calculate trajectory from mouse position
    const trajectory = calculateTrajectoryFromMouse(x, y)
    if (trajectory) {
      setAngle(trajectory.angle)
      setInitialSpeed(trajectory.speed)
    }
  }

  const handleCanvasMouseUp = () => {
    if (isAiming) {
      setIsAiming(false)
      setMousePosition(null)
    }
  }

  const handleCanvasMouseLeave = () => {
    if (isAiming) {
      setIsAiming(false)
      setMousePosition(null)
    }
  }

  // Calculate distance at which projectile hits the ground
  const calculateLandingDistance = useCallback(() => {
    // Simplified calculation without air resistance
    const vx = initialSpeed * Math.cos(angleInRadians)
    const vy = initialSpeed * Math.sin(angleInRadians)
    const timeOfFlight = (2 * vy) / GRAVITY
    return cannonPosition.x + vx * timeOfFlight
  }, [initialSpeed, angle, cannonPosition.x, angleInRadians])

  // Handle reply button click - log simulation data
  const handleReply = useCallback(() => {
    if (isPlaying) {
      pauseSimulation()
    }

    // Save to projectile history first
    saveToHistory()

    // Calculate final hit position
    const landingDistance = calculateLandingDistance()
    const hitDistance = Math.abs(targetPosition.x - landingDistance)
    setLastHitDistance(hitDistance)

    // Create log entry
    const newLog: SimulationLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      angle,
      speed: initialSpeed,
      targetX: targetPosition.x,
      targetY: targetPosition.y,
      hitDistance: parseFloat(hitDistance.toFixed(2)),
      airResistance
    }

    // Add to logs (limit to last 10)
    setSimulationLogs((prev) => [newLog, ...prev.slice(0, 9)])

    // Show reply panel
    setShowReplyPanel(true)

    // Auto-hide analysis after 5 seconds
    setTimeout(() => {
      setIsAnalyzing(false)
    }, 5000)
  }, [
    angle,
    initialSpeed,
    targetPosition,
    airResistance,
    isPlaying,
    calculateLandingDistance,
    saveToHistory,
    pauseSimulation
  ])

  // Apply suggested parameters from log
  const applyLogParameters = (log: SimulationLog) => {
    setAngle(log.angle)
    setInitialSpeed(log.speed)
    setTargetPosition({ x: log.targetX, y: log.targetY })
    setAirResistance(log.airResistance)
    setShowReplyPanel(false)
  }

  // Clear all simulation logs
  const clearLogs = () => {
    setSimulationLogs([])
    setShowReplyPanel(false)
    setLastHitDistance(null)
  }

  // Generate feedback based on hit distance
  const getFeedbackMessage = (distance: number) => {
    if (distance < 5) return '🎯 Bullseye! Perfect shot!'
    if (distance < 15) return '👍 Great shot! Very close to target.'
    if (distance < 30) return '👌 Good attempt. Adjust slightly.'
    if (distance < 50) return '🤔 Not bad, but needs improvement.'
    return '🎯 Keep practicing! Try adjusting angle or speed.'
  }

  // Get suggested adjustment
  const getAdjustmentSuggestion = () => {
    const landingDistance = calculateLandingDistance()

    if (landingDistance < targetPosition.x) {
      return `Increase angle to ${Math.min(90, angle + 5).toFixed(
        0
      )}° or increase speed to ${(initialSpeed * 1.1).toFixed(1)} m/s`
    } else {
      return `Decrease angle to ${Math.max(0, angle - 5).toFixed(
        0
      )}° or decrease speed to ${(initialSpeed * 0.9).toFixed(1)} m/s`
    }
  }

  // Handle canvas drawing with projectile history
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw grid
      ctx.strokeStyle = '#4a5568'
      ctx.lineWidth = 1
      const gridSize = 50 * PIXELS_PER_METER

      // Vertical grid lines
      for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, CANVAS_HEIGHT)
        ctx.stroke()
      }

      // Horizontal grid lines
      for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(CANVAS_WIDTH, y)
        ctx.stroke()
      }

      // Draw distance markers
      ctx.fillStyle = '#718096'
      ctx.font = '12px monospace'
      for (let distance = 50; distance <= 300; distance += 50) {
        const x = distance * PIXELS_PER_METER
        ctx.fillText(`${distance} m`, x - 15, CANVAS_HEIGHT - 10)
        ctx.beginPath()
        ctx.moveTo(x, CANVAS_HEIGHT - 5)
        ctx.lineTo(x, CANVAS_HEIGHT)
        ctx.stroke()
      }

      // Draw historical projectile paths
      projectileHistories.forEach((history) => {
        if (history.path.length > 1) {
          ctx.strokeStyle = history.color
          ctx.lineWidth = 2
          ctx.globalAlpha = history.id === activeHistoryId ? 1 : 0.4
          ctx.beginPath()
          ctx.moveTo(
            history.path[0].x * PIXELS_PER_METER,
            CANVAS_HEIGHT - history.path[0].y * PIXELS_PER_METER
          )

          for (let i = 1; i < history.path.length; i++) {
            ctx.lineTo(
              history.path[i].x * PIXELS_PER_METER,
              CANVAS_HEIGHT - history.path[i].y * PIXELS_PER_METER
            )
          }
          ctx.stroke()

          // Draw landing point for historical projectiles
          if (history.path.length > 0) {
            const lastPoint = history.path[history.path.length - 1]
            ctx.fillStyle = history.color
            ctx.beginPath()
            ctx.arc(
              lastPoint.x * PIXELS_PER_METER,
              CANVAS_HEIGHT - lastPoint.y * PIXELS_PER_METER,
              4,
              0,
              Math.PI * 2
            )
            ctx.fill()
          }
        }
      })

      ctx.globalAlpha = 1

      // Draw aiming line if in aiming mode
      if (isAiming && mousePosition) {
        const startCoords = simToCanvasCoords(
          cannonPosition.x,
          cannonPosition.y
        )

        // Draw trajectory prediction
        ctx.strokeStyle = 'rgba(66, 153, 225, 0.3)'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(startCoords.x, startCoords.y)
        ctx.lineTo(mousePosition.x, mousePosition.y)
        ctx.stroke()
        ctx.setLineDash([])

        // Draw angle indicator
        const trajectory = calculateTrajectoryFromMouse(
          mousePosition.x,
          mousePosition.y
        )
        if (trajectory) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          ctx.font = '14px monospace'
          ctx.fillText(
            `Angle: ${trajectory.angle.toFixed(1)}°`,
            mousePosition.x + 10,
            mousePosition.y - 20
          )
          ctx.fillText(
            `Speed: ${trajectory.speed.toFixed(1)} m/s`,
            mousePosition.x + 10,
            mousePosition.y - 5
          )
        }
      }

      // Draw predicted landing point
      if (!isPlaying && !isAiming) {
        const landingDistance = calculateLandingDistance()
        const landingCanvasPos = simToCanvasCoords(landingDistance, 0)

        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'
        ctx.beginPath()
        ctx.arc(landingCanvasPos.x, CANVAS_HEIGHT, 8, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#ef4444'
        ctx.font = '12px monospace'
        ctx.fillText(
          `Predicted: ${landingDistance.toFixed(1)}m`,
          landingCanvasPos.x - 30,
          CANVAS_HEIGHT - 10
        )
      }

      // Draw current projectile path
      if (projectilePathRef.current.length > 1) {
        ctx.strokeStyle = selectedColor
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(
          projectilePathRef.current[0].x * PIXELS_PER_METER,
          CANVAS_HEIGHT - projectilePathRef.current[0].y * PIXELS_PER_METER
        )

        for (let i = 1; i < projectilePathRef.current.length; i++) {
          ctx.lineTo(
            projectilePathRef.current[i].x * PIXELS_PER_METER,
            CANVAS_HEIGHT - projectilePathRef.current[i].y * PIXELS_PER_METER
          )
        }
        ctx.stroke()
      }

      // Draw cannon with highlighting if in aiming mode
      const cannonCanvasPos = simToCanvasCoords(
        cannonPosition.x,
        cannonPosition.y
      )

      // Cannon base (interactive area)
      ctx.fillStyle = isAiming ? 'rgba(45, 55, 72, 0.8)' : '#2d3748'
      ctx.beginPath()
      ctx.arc(cannonCanvasPos.x, cannonCanvasPos.y, 12, 0, Math.PI * 2)
      ctx.fill()

      // Cannon highlight ring
      if (isAiming) {
        ctx.strokeStyle = '#4299e1'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cannonCanvasPos.x, cannonCanvasPos.y, 15, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw cannon barrel
      ctx.strokeStyle = isAiming ? '#4299e1' : '#2d3748'
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cannonCanvasPos.x, cannonCanvasPos.y)
      const barrelLength = 30
      ctx.lineTo(
        cannonCanvasPos.x + barrelLength * Math.cos(angleInRadians),
        cannonCanvasPos.y - barrelLength * Math.sin(angleInRadians)
      )
      ctx.stroke()
      ctx.lineCap = 'butt'

      // Draw projectile (if it's in the air)
      if (projectile.y >= 0) {
        const projCanvasPos = simToCanvasCoords(projectile.x, projectile.y)

        ctx.fillStyle = '#e53e3e'
        ctx.beginPath()
        ctx.arc(projCanvasPos.x, projCanvasPos.y, 6, 0, Math.PI * 2)
        ctx.fill()

        // Draw velocity vector (only if simulation is playing or paused)
        if (isPlaying || isPaused) {
          const vectorScale = 0.5
          ctx.strokeStyle = '#38a169'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(projCanvasPos.x, projCanvasPos.y)
          ctx.lineTo(
            projCanvasPos.x + projectile.vx * vectorScale,
            projCanvasPos.y - projectile.vy * vectorScale
          )
          ctx.stroke()

          // Draw velocity vector arrowhead
          ctx.beginPath()
          const arrowLength = 8
          const arrowAngle = Math.atan2(-projectile.vy, projectile.vx)
          ctx.moveTo(
            projCanvasPos.x + projectile.vx * vectorScale,
            projCanvasPos.y - projectile.vy * vectorScale
          )
          ctx.lineTo(
            projCanvasPos.x +
              projectile.vx * vectorScale -
              arrowLength * Math.cos(arrowAngle - Math.PI / 6),
            projCanvasPos.y -
              projectile.vy * vectorScale +
              arrowLength * Math.sin(arrowAngle - Math.PI / 6)
          )
          ctx.lineTo(
            projCanvasPos.x +
              projectile.vx * vectorScale -
              arrowLength * Math.cos(arrowAngle + Math.PI / 6),
            projCanvasPos.y -
              projectile.vy * vectorScale +
              arrowLength * Math.sin(arrowAngle + Math.PI / 6)
          )
          ctx.closePath()
          ctx.fillStyle = '#38a169'
          ctx.fill()
        }
      }

      // Draw target with highlighting if in target mode
      const targetCanvasPos = simToCanvasCoords(
        targetPosition.x,
        targetPosition.y
      )

      ctx.strokeStyle = isSettingTarget ? 'rgba(214, 158, 46, 0.8)' : '#d69e2e'
      ctx.lineWidth = isSettingTarget ? 4 : 3
      ctx.beginPath()
      ctx.arc(targetCanvasPos.x, targetCanvasPos.y, 15, 0, Math.PI * 2)
      ctx.stroke()

      // Draw crosshair on target
      ctx.beginPath()
      ctx.moveTo(targetCanvasPos.x - 10, targetCanvasPos.y)
      ctx.lineTo(targetCanvasPos.x + 10, targetCanvasPos.y)
      ctx.moveTo(targetCanvasPos.x, targetCanvasPos.y - 10)
      ctx.lineTo(targetPosition.x, targetPosition.y + 10)
      ctx.stroke()

      // Draw target highlight ring
      if (isSettingTarget) {
        ctx.strokeStyle = 'rgba(214, 158, 46, 0.3)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(targetCanvasPos.x, targetCanvasPos.y, 25, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw instructions
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.font = '12px sans-serif'
      ctx.fillText('Drag cannon to aim • Shift+Click to set target', 10, 20)

      if (isAiming) {
        ctx.fillStyle = '#4299e1'
        ctx.fillText('Drag to adjust trajectory • Release to set', 10, 40)
      }

      if (isSettingTarget) {
        ctx.fillStyle = '#d69e2e'
        ctx.fillText('Click anywhere to set target position', 10, 40)
      }

      // Draw simulation status
      ctx.fillStyle = isPlaying ? '#48bb78' : isPaused ? '#ed8936' : '#718096'
      ctx.font = 'bold 14px sans-serif'
      const statusText = isPlaying
        ? '▶ Playing'
        : isPaused
        ? '⏸ Paused'
        : '⏹ Stopped'
      ctx.fillText(`Status: ${statusText}`, CANVAS_WIDTH - 150, 30)

      if (isPaused) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.font = '12px sans-serif'
        ctx.fillText(`Paused at: ${time.toFixed(2)}s`, CANVAS_WIDTH - 150, 50)
      }

      // Draw projectile count indicator
      if (projectileHistories.length > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.font = '12px monospace'
        ctx.fillText(
          `Projectiles in History: ${projectileHistories.length}`,
          10,
          CANVAS_HEIGHT - 30
        )
      }
    },
    [
      cannonPosition,
      targetPosition,
      projectile,
      isAiming,
      mousePosition,
      isSettingTarget,
      calculateTrajectoryFromMouse,
      simToCanvasCoords,
      angleInRadians,
      isPlaying,
      isPaused,
      time,
      calculateLandingDistance,
      projectileHistories,
      activeHistoryId,
      selectedColor
    ]
  )

  // Update projectile physics
  const updateProjectile = useCallback(() => {
    if (projectile.y < 0) {
      setIsPlaying(false)
      setIsPaused(false)
      return
    }

    let newVx = projectile.vx
    let newVy = projectile.vy - GRAVITY * TIME_STEP

    // Apply air resistance if enabled
    if (airResistance) {
      const speed = Math.sqrt(newVx * newVx + newVy * newVy)
      const dragForce = DRAG_COEFFICIENT * speed * speed
      const dragX = dragForce * (newVx / speed)
      const dragY = dragForce * (newVy / speed)

      newVx -= dragX * TIME_STEP
      newVy -= dragY * TIME_STEP
    }

    const newX = projectile.x + projectile.vx * TIME_STEP
    const newY = projectile.y + projectile.vy * TIME_STEP
    const newTime = projectile.time + TIME_STEP

    // Store path point
    projectilePathRef.current.push({ x: newX, y: newY })

    setProjectile({
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
      time: newTime
    })
    setTime(newTime)

    // Stop simulation if projectile hits ground
    if (newY < 0) {
      setIsPlaying(false)
      setIsPaused(false)
    }
  }, [projectile, airResistance])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (isPlaying) {
      const animate = () => {
        updateProjectile()
        draw(ctx)
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    } else {
      draw(ctx)
    }

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, draw, updateProjectile])

  // Handle simulation controls
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      // Pause the simulation
      pauseSimulation()
    } else {
      // Start or resume the simulation
      startOrResumeSimulation()
    }
  }, [isPlaying, pauseSimulation, startOrResumeSimulation])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setIsPaused(false)
    cancelAnimationFrame(animationRef.current)
    initializeProjectile()
    setShowReplyPanel(false)
    setIsAnalyzing(false)
  }, [initializeProjectile])

  const handleSetTargetMode = () => {
    setIsSettingTarget(true)
    setIsAiming(false)
    setMousePosition(null)
  }

  const handleCancelTargetMode = () => {
    setIsSettingTarget(false)
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isSettingTarget) {
        setIsSettingTarget(true)
      }

      if (e.key === 'Escape') {
        setIsAiming(false)
        setIsSettingTarget(false)
        setMousePosition(null)
      }

      if (e.key === ' ' && !e.repeat) {
        e.preventDefault()
        handlePlayPause()
      }

      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault()
        handleReset()
      }

      if (e.key === 'Enter' && e.ctrlKey && !isPlaying) {
        e.preventDefault()
        handleReply()
      }

      if (e.key === 'h' && e.ctrlKey) {
        e.preventDefault()
        setShowHistoryPanel(!showHistoryPanel)
      }

      if (e.key === 's' && e.ctrlKey && !isPlaying) {
        e.preventDefault()
        saveToHistory()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsSettingTarget(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    isSettingTarget,
    handlePlayPause,
    handleReset,
    handleReply,
    isPlaying,
    saveToHistory,
    showHistoryPanel
  ])

  // Format time as MM:SS:MS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}:${ms.toString().padStart(2, '0')}`
  }

  // Calculate current speed
  const currentSpeed = Math.sqrt(
    projectile.vx * projectile.vx + projectile.vy * projectile.vy
  )

  // Calculate hit probability
  const calculateHitProbability = useCallback(() => {
    if (!isPlaying && !isPaused) return 0

    const distanceToTarget = Math.sqrt(
      Math.pow(targetPosition.x - projectile.x, 2) +
        Math.pow(targetPosition.y - projectile.y, 2)
    )

    // Simple probability calculation based on distance
    const baseProbability = Math.max(0, 100 - distanceToTarget)
    const velocityFactor = Math.min(1, currentSpeed / 50)

    return Math.min(100, Math.max(0, baseProbability * velocityFactor))
  }, [projectile, targetPosition, currentSpeed, isPlaying, isPaused])

  useEffect(() => {
    if (projectilePathRef.current) {
      const isPathEmpty = projectilePathRef.current.length === 0
      setSaveButtonClassName(
        isPathEmpty
          ? 'bg-gray-700 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700'
      )
    }
  }, [projectilePathRef.current])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Reply button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">
              Projectile Motion Simulation
            </h1>
            <div className="text-gray-400 text-sm mt-1">
              Pause/Resume Support • Multiple Projectile History
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleReply}
              disabled={isPlaying}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                isPlaying
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
              }`}>
              <span>📊</span>
              <span>Reply & Analyze</span>
            </button>
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
              {showHistoryPanel
                ? 'Hide History'
                : `Show History (${projectileHistories.length})`}
            </button>
          </div>
        </div>

        {/* Projectile History Panel */}
        {showHistoryPanel && (
          <div className="mb-6 bg-gray-800 rounded-xl p-6 shadow-lg animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-300">
                Projectile History
                <span className="ml-2 text-sm bg-blue-900/50 px-2 py-1 rounded">
                  {projectileHistories.length} projectiles
                </span>
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={saveToHistory}
                  className={`px-4 py-2 rounded-lg font-medium ${saveButtonClassName}`}>
                  💾 Save Current
                </button>
                {projectileHistories.length > 0 && (
                  <button
                    onClick={clearAllHistories}
                    className="px-4 py-2 bg-red-900/50 hover:bg-red-900/70 rounded-lg font-medium">
                    🗑️ Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Save current projectile form */}
            <div className="mb-6 p-4 bg-gray-900 rounded-lg">
              <h3 className="text-lg font-medium mb-3">
                Save Current Projectile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Projectile Name
                  </label>
                  <input
                    type="text"
                    value={newProjectileName}
                    onChange={(e) => setNewProjectileName(e.target.value)}
                    placeholder="Enter projectile name"
                    className="w-full bg-gray-700 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Path Color
                  </label>
                  <div className="flex space-x-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color
                            ? 'border-white'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={saveToHistory}
                    className={`px-4 py-2 rounded-lg font-medium ${saveButtonClassName}`}>
                    💾 Save Current
                  </button>
                </div>
              </div>
            </div>

            {/* History List */}
            {projectileHistories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <div>No projectile history yet.</div>
                <div className="text-sm mt-2">
                  Run simulations and save them to compare trajectories.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {projectileHistories.map((history) => (
                  <div
                    key={history.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      history.id === activeHistoryId
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                    }`}
                    onClick={() => loadFromHistory(history)}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: history.color }}
                        />
                        <h3 className="font-bold truncate">{history.name}</h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          clearHistory(history.id)
                        }}
                        className="text-gray-400 hover:text-red-400">
                        ✕
                      </button>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Angle:</span>
                        <span>{history.angle}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Speed:</span>
                        <span>{history.speed.toFixed(1)} m/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Air Resistance:</span>
                        <span>{history.airResistance ? 'ON' : 'OFF'}</span>
                      </div>
                      {history.landingDistance && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Landing:</span>
                          <span>{history.landingDistance.toFixed(1)} m</span>
                        </div>
                      )}
                      {history.maxHeight && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Max Height:</span>
                          <span>{history.maxHeight.toFixed(1)} m</span>
                        </div>
                      )}
                      {history.flightTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Flight Time:</span>
                          <span>{history.flightTime.toFixed(2)} s</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                      <div>Saved at {history.timestamp}</div>
                      <div>
                        Start: ({history.startX}, {history.startY})
                      </div>
                      <div>
                        Target: ({history.targetX}, {history.targetY})
                      </div>
                    </div>

                    {history.id === activeHistoryId && (
                      <div className="mt-3 text-sm text-blue-400">
                        ✓ Currently Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reply Panel */}
        {showReplyPanel && (
          <div className="mb-6 bg-gray-800 rounded-xl p-6 shadow-lg animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-purple-300">
                Simulation Analysis
              </h2>
              <button
                onClick={() => setShowReplyPanel(false)}
                className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            {isAnalyzing && (
              <div className="mb-4 p-4 bg-blue-900/30 rounded-lg border border-blue-500">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="text-blue-300">
                    Analyzing trajectory data...
                  </span>
                </div>
              </div>
            )}

            {lastHitDistance !== null && (
              <div className="mb-6 p-4 bg-gray-900 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-400">Shot Accuracy</div>
                    <div className="text-2xl font-bold text-green-400">
                      {lastHitDistance.toFixed(1)}m from target
                    </div>
                    <div className="text-sm mt-2 text-gray-300">
                      {getFeedbackMessage(lastHitDistance)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-400">Suggestion</div>
                    <div className="text-lg mt-2">
                      {getAdjustmentSuggestion()}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-400">Current Setup</div>
                    <div className="mt-2 space-y-1">
                      <div>Angle: {angle}°</div>
                      <div>Speed: {initialSpeed.toFixed(1)} m/s</div>
                      <div>Target: {targetPosition.x}m</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Simulation Logs */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Recent Simulations</h3>
                {simulationLogs.length > 0 && (
                  <button
                    onClick={clearLogs}
                    className="text-sm px-3 py-1 bg-red-900/30 hover:bg-red-900/50 rounded">
                    Clear All
                  </button>
                )}
              </div>

              {simulationLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No simulation data yet. Run a simulation and click "Reply" to
                  analyze.
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {simulationLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            Shot at {log.timestamp}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            Angle: {log.angle}° • Speed: {log.speed.toFixed(1)}{' '}
                            m/s • Target: {log.targetX}m • Air:{' '}
                            {log.airResistance ? 'ON' : 'OFF'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div
                              className={`text-lg font-bold ${
                                log.hitDistance < 10
                                  ? 'text-green-400'
                                  : log.hitDistance < 30
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}>
                              {log.hitDistance}m off
                            </div>
                          </div>
                          <button
                            onClick={() => applyLogParameters(log)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-green-300">
                Simulation Controls
              </h2>

              <div className="space-y-4">
                {/* Simulation Status Indicator */}
                <div
                  className={`mb-4 p-3 rounded-lg border ${
                    isPlaying
                      ? 'bg-green-900/30 border-green-500'
                      : isPaused
                      ? 'bg-yellow-900/30 border-yellow-500'
                      : 'bg-gray-900/30 border-gray-500'
                  }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm">Simulation Status</div>
                      <div
                        className={`text-xl font-bold ${
                          isPlaying
                            ? 'text-green-400'
                            : isPaused
                            ? 'text-yellow-400'
                            : 'text-gray-400'
                        }`}>
                        {isPlaying
                          ? '▶ Playing'
                          : isPaused
                          ? '⏸ Paused'
                          : '⏹ Stopped'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Time</div>
                      <div className="text-lg font-mono">
                        {formatTime(time)}
                      </div>
                    </div>
                  </div>
                  {isPaused && (
                    <div className="mt-2 text-sm text-yellow-300">
                      ⏸ Paused at {time.toFixed(2)}s - Click Play to resume
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Mouse Controls</div>
                    <div className="text-xs text-gray-400">
                      Drag cannon or set target
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsAiming(true)}
                      disabled={isPlaying || isPaused}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        isAiming
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : isPlaying || isPaused
                          ? 'bg-gray-700 cursor-not-allowed'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}>
                      {isAiming ? '🎯 Aiming...' : '🎯 Aim'}
                    </button>

                    <button
                      onClick={handleSetTargetMode}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        isSettingTarget
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}>
                      {isSettingTarget ? '🎯 Placing...' : '🎯 Set Target'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Initial Speed: {initialSpeed.toFixed(1)} m/s
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="0.1"
                    value={initialSpeed}
                    onChange={(e) =>
                      setInitialSpeed(parseFloat(e.target.value))
                    }
                    disabled={isPlaying || isPaused}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                      isPlaying || isPaused
                        ? 'bg-gray-800 cursor-not-allowed'
                        : 'bg-gray-700'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Angle: {angle.toFixed(0)}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="1"
                    value={angle}
                    onChange={(e) => setAngle(parseInt(e.target.value))}
                    disabled={isPlaying || isPaused}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                      isPlaying || isPaused
                        ? 'bg-gray-800 cursor-not-allowed'
                        : 'bg-gray-700'
                    }`}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setAirResistance(!airResistance)}
                    disabled={isPlaying || isPaused}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      airResistance
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : isPlaying || isPaused
                        ? 'bg-gray-700 cursor-not-allowed'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}>
                    Air Resistance: {airResistance ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={handlePlayPause}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      isPlaying
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : isPaused
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}>
                    {isPlaying
                      ? '⏸️ Pause'
                      : isPaused
                      ? '▶️ Resume'
                      : '▶️ Launch'}
                  </button>

                  <button
                    onClick={handleReset}
                    className="px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors">
                    🔄 Reset
                  </button>

                  <button
                    onClick={saveToHistory}
                    className={`px-4 py-2 rounded-lg font-medium ${saveButtonClassName}`}>
                    💾 Save
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">
                    Keyboard Shortcuts
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <kbd className="px-2 py-1 bg-gray-700 rounded">Space</kbd>
                      <span>Play/Pause</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="px-2 py-1 bg-gray-700 rounded">
                        Ctrl+Enter
                      </kbd>
                      <span>Reply & Analyze</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="px-2 py-1 bg-gray-700 rounded">
                        Ctrl+S
                      </kbd>
                      <span>Save to History</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="px-2 py-1 bg-gray-700 rounded">
                        Ctrl+H
                      </kbd>
                      <span>Toggle History</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="px-2 py-1 bg-gray-700 rounded">
                        Shift+Click
                      </kbd>
                      <span>Set Target</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="px-2 py-1 bg-gray-700 rounded">
                        Ctrl+R
                      </kbd>
                      <span>Reset</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulation Data */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-purple-300">
                Simulation Data
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">Current Time</div>
                    <div className="text-2xl font-mono">{formatTime(time)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {isPaused
                        ? 'PAUSED'
                        : isPlaying
                        ? 'PLAYING'
                        : 'MIN REC MERC'}
                    </div>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">Current Speed</div>
                    <div className="text-2xl font-mono">
                      {currentSpeed.toFixed(1)} m/s
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((currentSpeed / initialSpeed) * 100).toFixed(0)}% of
                      initial
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">
                    Speed Components
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Horizontal (Vx):</span>
                      <span className="font-mono">
                        {projectile.vx.toFixed(1)} m/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vertical (Vy):</span>
                      <span className="font-mono">
                        {projectile.vy.toFixed(1)} m/s
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Initial Speed:</span>
                      <span>{initialSpeed.toFixed(1)} m/s</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-2">
                    Target Analysis
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Distance to Target:</span>
                      <span className="font-mono">
                        {Math.sqrt(
                          Math.pow(targetPosition.x - projectile.x, 2) +
                            Math.pow(targetPosition.y - projectile.y, 2)
                        ).toFixed(1)}{' '}
                        m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hit Probability:</span>
                      <span className="font-mono">
                        {calculateHitProbability().toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projectile Height:</span>
                      <span className="font-mono">
                        {projectile.y.toFixed(1)} m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Position Controls */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-yellow-300">
                Position Settings
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Cannon Position</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Horizontal (m)
                      </label>
                      <input
                        type="number"
                        value={cannonPosition.x}
                        onChange={(e) =>
                          setCannonPosition({
                            ...cannonPosition,
                            x: parseFloat(e.target.value)
                          })
                        }
                        disabled={isPlaying || isPaused}
                        className={`w-full rounded-lg px-3 py-2 ${
                          isPlaying || isPaused
                            ? 'bg-gray-800 cursor-not-allowed'
                            : 'bg-gray-700'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Vertical (m)
                      </label>
                      <input
                        type="number"
                        value={cannonPosition.y}
                        onChange={(e) =>
                          setCannonPosition({
                            ...cannonPosition,
                            y: parseFloat(e.target.value)
                          })
                        }
                        disabled={isPlaying || isPaused}
                        className={`w-full rounded-lg px-3 py-2 ${
                          isPlaying || isPaused
                            ? 'bg-gray-800 cursor-not-allowed'
                            : 'bg-gray-700'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Target Position</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Horizontal (m)
                      </label>
                      <input
                        type="number"
                        value={targetPosition.x}
                        onChange={(e) =>
                          setTargetPosition({
                            ...targetPosition,
                            x: parseFloat(e.target.value)
                          })
                        }
                        className="w-full bg-gray-700 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Vertical (m)
                      </label>
                      <input
                        type="number"
                        value={targetPosition.y}
                        onChange={(e) =>
                          setTargetPosition({
                            ...targetPosition,
                            y: parseFloat(e.target.value)
                          })
                        }
                        className="w-full bg-gray-700 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  {isSettingTarget && (
                    <div className="mt-3 p-2 bg-yellow-500/20 rounded-lg border border-yellow-500">
                      <p className="text-sm text-yellow-300">
                        Click on the canvas to place target
                      </p>
                      <button
                        onClick={handleCancelTargetMode}
                        className="mt-2 text-sm px-2 py-1 bg-gray-700 rounded">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel - Canvas and visualization */}
          <div className="lg:col-span-2" ref={containerRef}>
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-red-300">
                  Projectile Motion Visualization
                </h2>
                <div className="flex space-x-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-600"
                      style={{ backgroundColor: selectedColor }}></div>
                    <span className="text-sm">Current Path</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm">Velocity Vector</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm">Predicted Landing</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="w-full h-auto bg-gray-900 rounded-lg border-2 border-gray-700 cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseLeave}
                  title="Drag cannon to aim • Shift+Click to set target • Space to play/pause • Ctrl+S to save history"
                />

                {/* Current position overlay */}
                <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-sm space-y-1">
                    <div className="flex space-x-4">
                      <span>X: {projectile.x.toFixed(1)} m</span>
                      <span>Y: {projectile.y.toFixed(1)} m</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Projectile Position
                    </div>
                  </div>
                </div>

                {/* Target position overlay */}
                <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-sm space-y-1">
                    <div className="flex space-x-4">
                      <span>Target X: {targetPosition.x.toFixed(1)} m</span>
                      <span>Target Y: {targetPosition.y.toFixed(1)} m</span>
                    </div>
                    <div className="text-xs text-gray-400">Target Position</div>
                  </div>
                </div>

                {/* Simulation status overlay */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 min-w-[200px] text-center">
                  <div className="text-sm space-y-1">
                    <div
                      className={`font-bold ${
                        isPlaying
                          ? 'text-green-400'
                          : isPaused
                          ? 'text-yellow-400'
                          : 'text-gray-400'
                      }`}>
                      {isPlaying
                        ? '▶ Simulation Running'
                        : isPaused
                        ? '⏸ Simulation Paused'
                        : '⏹ Simulation Stopped'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Time: {formatTime(time)}
                    </div>
                  </div>
                </div>

                {/* History indicator overlay */}
                <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-sm space-y-1">
                    <div className="flex space-x-4">
                      <span>History: {projectileHistories.length} paths</span>
                      <span className="text-gray-400">
                        {activeHistoryId ? 'Viewing' : 'None selected'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Click history items to compare
                    </div>
                  </div>
                </div>

                {/* Controls overlay */}
                <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-sm text-center space-y-1">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">
                        Space
                      </kbd>
                      <span className="text-gray-400">Play/Pause</span>
                      <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">
                        Ctrl+S
                      </kbd>
                      <span className="text-gray-400">Save</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div
                  className={`bg-gray-900 p-4 rounded-lg flex items-center space-x-3 ${
                    isAiming ? 'ring-2 ring-blue-500' : ''
                  }`}>
                  <div
                    className={`text-2xl ${
                      isAiming ? 'text-blue-400' : 'text-green-400'
                    }`}>
                    🎯
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Mouse Aiming</div>
                    <div className="font-medium">
                      {isAiming
                        ? 'Active • Drag to aim'
                        : isPlaying || isPaused
                        ? 'Disabled while running'
                        : 'Click cannon'}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg flex items-center space-x-3">
                  <div className="text-blue-400 text-2xl">📊</div>
                  <div>
                    <div className="text-sm text-gray-400">Grid</div>
                    <div className="font-medium">50m scale</div>
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg flex items-center space-x-3">
                  <div className="text-purple-400 text-2xl">📈</div>
                  <div>
                    <div className="text-sm text-gray-400">History Paths</div>
                    <div className="font-medium">
                      {projectileHistories.length} saved
                    </div>
                  </div>
                </div>

                <div
                  className={`bg-gray-900 p-4 rounded-lg flex items-center space-x-3 ${
                    isSettingTarget ? 'ring-2 ring-yellow-500' : ''
                  }`}>
                  <div
                    className={`text-2xl ${
                      airResistance ? 'text-yellow-400' : 'text-gray-500'
                    }`}>
                    🌬️
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Air Resistance</div>
                    <div className="font-medium">
                      {airResistance ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation status indicator */}
              {!isPlaying && projectilePathRef.current.length > 0 && (
                <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-purple-400">📊</div>
                      <div>
                        <div className="font-medium">
                          {isPaused
                            ? 'Simulation Paused'
                            : 'Simulation Complete'}
                        </div>
                        <div className="text-sm text-gray-300">
                          {isPaused
                            ? `Paused at ${time.toFixed(
                                2
                              )}s - Click Play to resume`
                            : 'Save to history or analyze for suggestions'}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {isPaused ? (
                        <button
                          onClick={handlePlayPause}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">
                          ▶ Resume
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={saveToHistory}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">
                            💾 Save
                          </button>
                          <button
                            onClick={handleReply}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                            Analyze
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom info bar */}
        <div className="mt-6 bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <div className="text-gray-400">Initial Speed</div>
                <div className="text-lg font-mono">
                  {initialSpeed.toFixed(1)} m/s
                </div>
              </div>
              <div className="text-sm">
                <div className="text-gray-400">Current Speed</div>
                <div className="text-lg font-mono">
                  {currentSpeed.toFixed(1)} m/s
                </div>
              </div>
              <div className="text-sm">
                <div className="text-gray-400">Simulation Status</div>
                <div
                  className={`text-lg font-mono ${
                    isPlaying
                      ? 'text-green-400'
                      : isPaused
                      ? 'text-yellow-400'
                      : 'text-gray-400'
                  }`}>
                  {isPlaying ? 'PLAYING' : isPaused ? 'PAUSED' : 'STOPPED'}
                </div>
              </div>
              <div className="text-sm">
                <div className="text-gray-400">Target Distance</div>
                <div className="text-lg font-mono">
                  {Math.abs(targetPosition.x - cannonPosition.x).toFixed(1)} m
                </div>
              </div>
              <div className="text-sm">
                <div className="text-gray-400">History Size</div>
                <div className="text-lg font-mono">
                  {projectileHistories.length}
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              Press Space to play/pause • Ctrl+S to save history • Ctrl+H to
              show/hide history panel
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectileMotionSimulation
