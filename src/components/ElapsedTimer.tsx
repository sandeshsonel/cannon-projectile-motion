import { memo, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Timer } from 'lucide-react'
import { useCannonState } from '@/context'

type ElapsedTimerProps = {
  className?: string
}

function ElapsedTimer({ className }: ElapsedTimerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { startTime, endTime } = useCannonState()
  const startTimeRef = useRef<number | null>(null)

  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!startTime && !startTimeRef.current) return

    startTimeRef.current = !startTimeRef.current
      ? startTime
      : startTimeRef.current

    const update = () => {
      const startTime = startTimeRef.current
      if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setSeconds(elapsed)
      }
    }

    update()

    intervalRef.current = setInterval(update, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [startTime])

  useEffect(() => {
    if (endTime && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [endTime])

  const formatTime = (total: number) => {
    const hrs = Math.floor(total / 3600)
    const mins = Math.floor((total % 3600) / 60)
    const secs = total % 60

    return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':')
  }

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
