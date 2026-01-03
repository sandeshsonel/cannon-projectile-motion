import { memo } from 'react'
import { Zap, Gauge, Flag, Rocket, Locate, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

import { useCannonContext } from '@/context/CannonProvider'
import { formatTime } from '@/lib/utils'

const Footer = () => {
  const {
    state: { cannonSettings, targetPosition, isPlaying },
    helperState: { activeProjectile },
    stateHandler: {
      handleChangeSettings,
      handleChangePosition,
      handleTargetPosition,
      handleToggleFire
      // handleToogleIsPause,
      // handleRestartProjectile,
      // handleResumeProjectile
    }
  } = useCannonContext()

  const currentSpeed = Math.sqrt(
    (activeProjectile?.vx ?? 0) * (activeProjectile?.vx ?? 0) +
      (activeProjectile?.vy ?? 0) * (activeProjectile?.vy ?? 0)
  )

  // // Calculate hit probability
  // const calculateHitProbability = useCallback(() => {
  //   if (activeProjectile === null) return 0

  //   const distanceToTarget = Math.sqrt(
  //     Math.pow(targetPosition.x - activeProjectile.x, 2) +
  //       Math.pow(targetPosition.y - activeProjectile.y, 2)
  //   )

  //   // Simple probability calculation based on distance
  //   const baseProbability = Math.max(0, 100 - distanceToTarget)
  //   const velocityFactor = Math.min(1, currentSpeed / 50)

  //   return Math.min(100, Math.max(0, baseProbability * velocityFactor))
  // }, [activeProjectile, targetPosition, currentSpeed])

  return (
    <footer className="relative z-30 border-t bg-background shadow-xl">
      {/* TOP ACTION BAR */}
      <div className="flex flex-col lg:flex-row items-stretch">
        {/* FIRE CONTROLS */}
        <div className="flex items-center gap-4 px-4 py-1 border-b lg:border-b-0 lg:border-r">
          <Button
            size="lg"
            className="gap-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 cursor-pointer"
            onClick={() => handleToggleFire()}>
            <Rocket className="w-5 h-5" />
            FIRE
          </Button>

          {/* <div className="flex items-center gap-2 rounded-full px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                isPaused
                  ? handleResumeProjectile()
                  : isPlaying
                  ? handleToogleIsPause(true)
                  : handleRestartProjectile()
              }
              className="cursor-pointer text-gray-500 hover:text-black">
              {isPaused ? (
                <Play className="w-5 h-5" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <RotateCcw className="w-5 h-5" />
              )}
            </Button>
          </div> */}
        </div>

        {/* LIVE STATS */}
        <div className="flex flex-1 flex-wrap items-center gap-8 px-6 py-2">
          <Stat
            icon={<Clock className="w-5 h-5 text-blue-500" />}
            label="Time"
            value={formatTime(activeProjectile?.time ?? 0).toString()}
            unit="m/s"
          />
          <div className="w-28">
            <Stat
              icon={<Zap className="w-5 h-5 text-blue-500" />}
              label="Speed"
              value={currentSpeed.toFixed(1).toString()}
              unit="m/s"
            />
          </div>

          <Separator orientation="vertical" className="hidden lg:block h-8" />

          <Stat
            icon={
              <span className="font-bold text-gray-600">
                V<sub>x</sub>
              </span>
            }
            label="Horizontal"
            value={activeProjectile?.vx?.toFixed?.(1).toString() ?? '0'}
            unit="m/s"
          />

          <Stat
            icon={
              <span className="font-bold text-gray-600">
                V<sub>y</sub>
              </span>
            }
            label="Vertical"
            value={activeProjectile?.vy?.toFixed?.(1).toString() ?? '0'}
            unit="m/s"
          />
          {/* <Stat
            icon={
              <span className="font-bold text-gray-600">
                V<sub>y</sub>
              </span>
            }
            label="Hit Probability"
            value={`${calculateHitProbability().toFixed(1)}%`}
            unit="m/s"
          /> */}
        </div>
      </div>

      {/* BOTTOM SETTINGS */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-t divide-y md:divide-y-0 md:divide-x">
        <FooterSection
          title="Cannon Velocity"
          icon={<Gauge className="w-4 h-4" />}>
          <Range
            label="Speed"
            value={cannonSettings.speed}
            unit="m/s"
            onChange={(value) => handleChangeSettings('speed', value)}
          />
          <Range
            label="Angle"
            value={Math.abs(cannonSettings.angle)}
            unit="°"
            max={90}
            onChange={(value) =>
              handleChangeSettings('angle', -Math.abs(value))
            }
          />
        </FooterSection>

        <FooterSection
          title="Cannon Position"
          icon={<Locate className="w-4 h-4" />}>
          <Range
            label="Vertical"
            min={60}
            max={560}
            value={cannonSettings.position.x}
            unit="m"
            onChange={(value) => handleChangePosition('x', value)}
          />
          <Range
            label="Horizontal"
            min={20}
            max={348}
            value={cannonSettings.position.y}
            unit="m"
            onChange={(value) => handleChangePosition('y', value)}
          />
        </FooterSection>

        <FooterSection
          title="Target Position"
          icon={<Flag className="w-4 h-4" />}>
          <Range
            label="Vertical"
            min={0}
            max={65}
            value={targetPosition.y}
            unit="m"
            disabled={isPlaying}
            onChange={(value: number) => handleTargetPosition('y', value)}
          />
          <Range
            label="Horizontal"
            min={50}
            max={300}
            value={targetPosition.x}
            unit="m"
            disabled={isPlaying}
            onChange={(value: number) => handleTargetPosition('x', value)}
          />
        </FooterSection>
      </div>
    </footer>
  )
}

export default memo(Footer)

/* ---------- SUB COMPONENTS ---------- */

const Stat = ({
  icon,
  label,
  value,
  unit
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
}) => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
      {icon}
    </div>
    <div>
      <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
      <div className="font-mono text-lg font-bold text-black">
        {value}
        <span className="ml-1 text-xs">{unit}</span>
      </div>
    </div>
  </div>
)

const FooterSection = ({
  title,
  icon,
  children
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) => (
  <Card className="rounded-none border-0 gap-1.5">
    <CardHeader className="pb-2">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-black">
        {icon}
        {title}
      </h3>
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
)

const Range = ({
  label,
  value,
  unit,
  onChange,
  min = 0,
  max = 100,
  disabled = false
}: {
  label: string
  value: number
  unit: string
  min?: number
  max?: number
  onChange?: (value: number) => void
  disabled?: boolean
}) => (
  <div className="space-y-3">
    <div className="flex justify-between text-xs text-gray-600">
      <span>{label}</span>
      <span className="font-semibold text-foreground">
        {value}
        {unit}
      </span>
    </div>
    <Slider
      disabled={disabled}
      defaultValue={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(e) => onChange?.(e?.[0] ?? 0)}
    />
  </div>
)
