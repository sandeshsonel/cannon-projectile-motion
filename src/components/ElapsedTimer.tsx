import { memo, useEffect, useRef, useState } from 'react'
import { cn, formatTime } from '@/lib/utils'
import { Timer } from 'lucide-react'
import { useCannonState } from '@/context'

type ElapsedTimerProps = {
  className?: string
}

function ElapsedTimer({ className }: ElapsedTimerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { endTime, isReset } = useCannonState()
  const startTimeRef = useRef<number | null>(null)
  const startTime = sessionStorage.getItem('startTime')
  const [seconds, setSeconds] = useState(0)

  const handleResetTime = () => {
    setSeconds(0)
    startTimeRef.current = null
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    if ((!startTime && !startTimeRef.current) || endTime) return

    startTimeRef.current = !startTimeRef.current
      ? parseInt(startTime || '')
      : startTimeRef.current

    const update = () => {
      const startTime = startTimeRef.current
      if (startTime) {
        const elapsed = (Date.now() - startTime) / 1000
        setSeconds(elapsed)
      }
    }

    update()

    intervalRef.current = setInterval(update, 50)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [startTime, endTime])

  useEffect(() => {
    if (endTime && startTime) {
      setTimeout(() => {
        setSeconds((endTime - parseInt(startTime)) / 1000)
      }, 0)
    }
    startTimeRef.current = null
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
  }, [endTime])

  useEffect(() => {
    if (isReset) {
      const timeoutId = setTimeout(() => {
        handleResetTime()
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [isReset])

  return (
    <div
      className={cn(
        'absolute top-3 right-6 z-20 min-w-35 rounded-md p-4 border shadow-sm backdrop-blur-md',
        className
      )}>
      <div className="mb-2 flex items-center gap-2">
        <Timer className="h-4 w-4 text-gray-500" />
        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-gray-500">
          Elapsed Time
        </span>
      </div>

      <div className="text-center text-xl font-bold tracking-widest text-black">
        {formatTime(seconds)}
      </div>
    </div>
  )
}

export default memo(ElapsedTimer)
