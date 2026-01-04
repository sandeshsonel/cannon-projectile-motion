import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RotateCcw, Trophy } from 'lucide-react'

interface SimulationResultDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  shots: number
  accuracy: number
  targetsHit: number
  totalTime: string
}

export function SimulationResultDialog({
  open,
  shots,
  accuracy,
  targetsHit
}: // totalTime
SimulationResultDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm p-6 text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-white">
            <Trophy className="w-6 h-6" /> Simulation Passed!
          </DialogTitle>
          <DialogDescription>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
              Outstanding! You have successfully hit all{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {targetsHit} targets
              </span>{' '}
              with precision.
            </p>
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-2.5 flex flex-col items-center bg-slate-50 dark:bg-slate-900/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Shots Fired
            </span>
            <span className="text-lg font-mono font-bold text-slate-700 dark:text-slate-200">
              {shots}
            </span>
          </Card>

          <Card className="p-2.5 flex flex-col items-center bg-slate-50 dark:bg-slate-900/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Accuracy
            </span>
            <span className="text-lg font-mono font-bold text-green-600 dark:text-green-400">
              {accuracy}%
            </span>
          </Card>

          {/* <Card className="p-2.5 flex flex-col items-center bg-slate-50 dark:bg-slate-900/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Total Time
            </span>
            <span className="text-lg font-mono font-bold text-green-600 dark:text-green-400">
              {totalTime}
            </span>
          </Card> */}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Button
            className="w-full gap-2 font-bold shadow-lg shadow-red-500/20 cursor-pointer"
            onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" />
            Restart Simulation
          </Button>
          {/* 
          <Button
            variant="outline"
            className="w-full gap-2 font-bold"
            onClick={onViewResults}>
            <BarChart3 className="h-4 w-4" />
            View Results
          </Button> */}
        </div>
      </DialogContent>
    </Dialog>
  )
}
