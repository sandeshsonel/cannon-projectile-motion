import { memo } from 'react'
import { Github, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useCannonActions } from '@/context'

const Navbar = () => {
  const { handleReset } = useCannonActions()

  const handleNavigate = () => {
    window.open(import.meta.env.VITE_APP_GITHUB_URL, '_blank')
  }
  return (
    <nav className="h-10 flex items-center justify-between px-6 border-b bg-background">
      <div className="flex items-center gap-4">
        <h1 className="font-bold">Projectile Motion</h1>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleReset}
          variant="ghost"
          size="icon"
          className="cursor-pointer">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          onClick={handleNavigate}
          variant="ghost"
          size="icon"
          className="cursor-pointer">
          <Github className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}

export default memo(Navbar)
