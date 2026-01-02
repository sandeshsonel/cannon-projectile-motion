import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { useCannonContext } from '@/context/CannonProvider'

interface ItemProps {
  label: string
  value: boolean
  onChange: (checked: boolean) => void
}

const Item = ({ label, value, onChange }: ItemProps) => (
  <label className="flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted">
    <Checkbox checked={value} onCheckedChange={onChange} />
    <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">
      {label}
    </span>
  </label>
)

export default function ControlPanel() {
  const {
    state: { controlPannel },
    stateHandler: { handleToggleControlPannel: toggle }
  } = useCannonContext()

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex rounded-md border bg-background p-1 shadow-sm">
      <Item
        label="Velocity Vectors"
        value={controlPannel.isVector}
        onChange={(checked: boolean) => toggle('isVector', checked)}
      />
      <Separator orientation="vertical" className="h-6" />

      <Item
        label="Grid"
        value={controlPannel.isGrid}
        onChange={(checked: boolean) => toggle('isGrid', checked)}
      />
      <Separator orientation="vertical" className="h-6" />

      <Item
        label="Projectile Path"
        value={controlPannel.isPath}
        onChange={(checked: boolean) => toggle('isPath', checked)}
      />
      <Separator orientation="vertical" className="h-6" />

      <Item
        label="Air Resistance"
        value={controlPannel.isAirResistance}
        onChange={(checked: boolean) => toggle('isAirResistance', checked)}
      />
    </div>
  )
}
