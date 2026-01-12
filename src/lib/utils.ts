import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { Target } from '@/types'
import { TARGET_CONFIG } from '@/config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

// Format time as MM:SS:MS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds - Math.floor(seconds)) * 100)

  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}:${ms.toString().padStart(2, '0')}`
}

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min

const randomInt = (min: number, max: number) =>
  Math.floor(randomBetween(min, max + 1))

export function generateTargets(options?: {
  minCount?: number
  maxCount?: number
  minX?: number
  maxX?: number
  minSpacing?: number
  maxSpacing?: number
  y?: number
}): Target[] {
  const {
    minCount = 3,
    maxCount = 6,
    minX = 100,
    maxX = 300,
    minSpacing = 20,
    maxSpacing = 50,
    y = 4
  } = options || {}

  const count = randomInt(minCount, maxCount)
  const spacing = randomInt(minSpacing, maxSpacing)
  const targets: Target[] = []

  while (targets.length < count) {
    const x = Math.round(randomBetween(minX, maxX)) + 6

    if (!targets.some((t) => Math.abs(t.position.x - x) < spacing)) {
      targets.push({
        id: crypto.randomUUID(),
        position: { x, y }
      })
    }
  }

  return targets
}

export function createTargetsFromConfig() {
  return generateTargets({
    minCount: TARGET_CONFIG.count.min,
    maxCount: TARGET_CONFIG.count.max,
    minX: TARGET_CONFIG.xRange.min,
    maxX: TARGET_CONFIG.xRange.max,
    minSpacing: TARGET_CONFIG.spacing.min,
    maxSpacing: TARGET_CONFIG.spacing.max,
    y: TARGET_CONFIG.y
  })
}
