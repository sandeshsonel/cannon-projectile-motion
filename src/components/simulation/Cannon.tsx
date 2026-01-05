import { useCannonActions, useCannonState } from '@/context'
import React, { memo, useCallback, useEffect, useRef } from 'react'

const BARREL_LENGTH = 70
const ROTATION_SPEED = 1
const MOVE_SPEED = 5

const clampAngle = (v: number) => Math.max(-90, Math.min(0, v))

const Cannon: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const isDraggingRef = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const {
    cannonSettings: { angle, position },
    isAngleSelected
  } = useCannonState()

  const {
    handleChangeSettings,
    handleChangePosition,
    handleSelectCannonAngle,
    handleToggleFire
  } = useCannonActions()

  /* ---------------- ROTATION ---------------- */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isAngleSelected || !svgRef.current) return

      const rect = svgRef.current.getBoundingClientRect()
      const dx = e.clientX - rect.left - position.x
      const dy = e.clientY - rect.top - position.y

      const nextAngle = Math.atan2(dy, dx) * (180 / Math.PI)
      handleChangeSettings('angle', clampAngle(nextAngle))
    },
    [isAngleSelected, position.x, position.y, handleChangeSettings]
  )

  /* ---------------- DRAG MOVE ---------------- */
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !svgRef.current) return

      const rect = svgRef.current.getBoundingClientRect()
      handleChangePosition({
        x: e.clientX - rect.left - dragOffset.current.x,
        y: e.clientY - rect.top - dragOffset.current.y
      })
    },
    [handleChangePosition]
  )

  /* ---------------- KEYBOARD ---------------- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isAngleSelected) return

      switch (e.key) {
        case 'ArrowLeft':
          handleChangePosition('x', position.x - MOVE_SPEED)
          break
        case 'ArrowRight':
          handleChangePosition('x', position.x + MOVE_SPEED)
          break
        case 'ArrowUp':
          handleChangeSettings('angle', clampAngle(angle - ROTATION_SPEED))
          break
        case 'ArrowDown':
          handleChangeSettings('angle', clampAngle(angle + ROTATION_SPEED))
          break
      }
    },
    [
      isAngleSelected,
      angle,
      position.x,
      handleChangePosition,
      handleChangeSettings
    ]
  )

  /* ---------------- GLOBAL EVENTS ---------------- */
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', () => (isDraggingRef.current = false))
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleMouseMove, handleDragMove, handleKeyDown])

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0"
      width="100%"
      height="100%"
      onClick={() => handleToggleFire()}
      onMouseMove={() => handleSelectCannonAngle(false)}>
      <g
        transform={`translate(${position.x}, ${position.y}) rotate(${angle})`}
        style={{ cursor: 'crosshair' }}>
        <circle r={20} fill="#444" />
        <rect
          x={0}
          y={-8}
          width={BARREL_LENGTH}
          height={14}
          rx={6}
          fill="#1f2933"
        />
      </g>
    </svg>
  )
}

export default memo(Cannon)
