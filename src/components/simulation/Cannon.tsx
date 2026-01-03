import { useCannonActions, useCannonState } from '@/context'
import React, { useEffect, useRef } from 'react'

const barrelLength = 70
const rotationSpeed = 1
const moveSpeed = 5

const Cannon: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const isDraggingRef = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const {
    cannonSettings: { angle, position },
    isAngleSelected
  } = useCannonState()
  const {
    handleChangeSettings,
    handleChangePosition,
    handleSelectCannonAngle
  } = useCannonActions()

  const clampAngle = (v: number) => Math.max(-90, Math.min(0, v))

  /* ---------------- ROTATION ---------------- */
  const handleMouseMove = (e: MouseEvent) => {
    if (isAngleSelected) return

    const rect = svgRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const dx = mx - position.x
    const dy = my - position.y

    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    handleChangeSettings('angle', clampAngle(angle))
  }

  /* ---------------- DRAG START ---------------- */
  // const handleMouseDown = (e: React.MouseEvent) => {
  //   e.stopPropagation()
  //   setIsSelected(true)
  //   isDraggingRef.current = true

  //   const rect = svgRef.current!.getBoundingClientRect()
  //   dragOffset.current = {
  //     x: e.clientX - rect.left - position.x,
  //     y: e.clientY - rect.top - position.y
  //   }
  // }

  /* ---------------- DRAG MOVE ---------------- */
  const handleWindowMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return

    const rect = svgRef.current!.getBoundingClientRect()

    handleChangePosition({
      x: e.clientX - rect.left - dragOffset.current.x,
      y: e.clientY - rect.top - dragOffset.current.y
    })
  }

  /* ---------------- DRAG END ---------------- */
  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  /* ---------------- KEYBOARD ---------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAngleSelected) return

      if (e.key === 'ArrowLeft') {
        const xPosition = position.x - moveSpeed
        handleChangePosition('x', xPosition)
      }
      if (e.key === 'ArrowRight') {
        const xPosition = position.x + moveSpeed
        handleChangePosition('x', xPosition)
      }
      if (e.key === 'ArrowUp' && !isAngleSelected) {
        handleChangeSettings('angle', clampAngle(angle - rotationSpeed))
      }
      if (e.key === 'ArrowDown' && !isAngleSelected) {
        handleChangeSettings('angle', clampAngle(angle + rotationSpeed))
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [angle, isAngleSelected])

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0"
      width="100%"
      height="100%"
      onClick={() => handleSelectCannonAngle(!isAngleSelected)}>
      <g
        transform={`translate(${position.x}, ${position.y}) rotate(${angle})`}
        style={{ cursor: 'crosshair' }}>
        <circle r={20} fill="#444" />
        <rect
          x={0}
          y={-8}
          width={barrelLength}
          height={14}
          rx={6}
          fill="#1f2933"
        />
      </g>
    </svg>
  )
}

export default Cannon
