import { RotateCcw, Zap, Gauge, Flag, Rocket, Locate } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

import { useCannonContext } from '@/context/CannonProvider'

export const Footer = () => {
  const {
    state: { cannonSettings, targetPosition },
    stateHandler: {
      handleChangeSettings,
      handleChangePosition,
      handleTargetPosition
    }
  } = useCannonContext()
  return (
    <footer className="relative z-30 border-t bg-background shadow-xl">
      {/* TOP ACTION BAR */}
      <div className="flex flex-col lg:flex-row items-stretch">
        {/* FIRE CONTROLS */}
        <div className="flex items-center gap-4 px-4 py-1 border-b lg:border-b-0 lg:border-r">
          <Button
            size="lg"
            className="gap-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 cursor-pointer">
            <Rocket className="w-5 h-5" />
            FIRE
          </Button>

          <div className="flex items-center gap-2 rounded-full px-2 py-1">
            <IconButton icon={<RotateCcw className="w-5 h-5" />} />
          </div>
        </div>

        {/* LIVE STATS */}
        <div className="flex flex-1 flex-wrap items-center gap-8 px-6 py-2">
          <div className="w-28">
            <Stat
              icon={<Zap className="w-5 h-5 text-blue-500" />}
              label="Speed"
              value={cannonSettings.speed.toString()}
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
            value="26.6"
            unit="m/s"
          />

          <Stat
            icon={
              <span className="font-bold text-gray-600">
                V<sub>y</sub>
              </span>
            }
            label="Vertical"
            value="-56.3"
            unit="m/s"
          />
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
            min={4}
            max={65}
            value={targetPosition.y}
            unit="m"
            onChange={(value: number) => handleTargetPosition('y', value)}
          />
          <Range
            label="Horizontal"
            min={50}
            max={300}
            value={targetPosition.x}
            unit="m"
            onChange={(value: number) => handleTargetPosition('x', value)}
          />
        </FooterSection>
      </div>
    </footer>
  )
}

/* ---------- SUB COMPONENTS ---------- */

const IconButton = ({ icon }: { icon: React.ReactNode }) => (
  <Button
    variant="ghost"
    size="icon"
    className="cursor-pointer text-gray-500 hover:text-black">
    {icon}
  </Button>
)

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
  max = 100
}: {
  label: string
  value: number
  unit: string
  min?: number
  max?: number
  onChange?: (value: number) => void
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
      defaultValue={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(e) => onChange?.(e?.[0] ?? 0)}
    />
  </div>
)
