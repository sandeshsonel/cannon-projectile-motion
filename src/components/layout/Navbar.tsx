import { Info, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Navbar = () => {
  return (
    <nav className="h-10 flex items-center justify-between px-6 border-b bg-background">
      <div className="flex items-center gap-4">
        <h1 className="font-bold">Projectile Motion</h1>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="cursor-pointer">
          <Info className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}
