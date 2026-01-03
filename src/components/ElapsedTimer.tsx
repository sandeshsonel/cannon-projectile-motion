import { memo, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Timer } from 'lucide-react'
import { useCannonContext } from '@/context/CannonProvider'

type ElapsedTimerProps = {
  className?: string
  startAt?: number // seconds
}

function ElapsedTimer({ className }: ElapsedTimerProps) {
  const timeInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const {
    state: { startTime }
  } = useCannonContext()
  const [seconds, setSeconds] = useState(startTime)

  useEffect(() => {
    if (startTime > 0) {
      timeInterval.current = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (timeInterval.current) clearInterval(timeInterval.current)
    }
  }, [startTime])

  const formatTime = (total: number) => {
    const hrs = Math.floor(total / 3600)
    const mins = Math.floor((total % 3600) / 60)
    const secs = total % 60

    return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':')
  }

  return (
    <div
      className={cn(
        'absolute top-3 right-6 z-20 min-w-35 rounded-md p-4 border shadow-sm',
        'backdrop-blur-md',
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
