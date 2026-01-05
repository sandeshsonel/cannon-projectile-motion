import { type ReactNode } from 'react'
import { useCannonState } from '@/context'

import Navbar from './Navbar'
import Footer from './Footer'
import SimulationResultDialog from '../SimulationResultDialog'
import { formatTime } from '@/lib/utils'

interface Props {
  children: ReactNode
}

const AppLayout = ({ children }: Props) => {
  const {
    startTime,
    endTime,
    targetSummary: { isOpenSuccessModal, countTargetHit, countTotalFire }
  } = useCannonState()

  const totalTime =
    startTime && endTime ? formatTime((endTime - startTime) / 1000) : '00:00:00'

  return (
    <>
      <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100">
        <Navbar />
        <main className="flex-1 relative overflow-hidden">{children}</main>
        <Footer />
      </div>
      {isOpenSuccessModal && (
        <SimulationResultDialog
          open={isOpenSuccessModal}
          shots={countTotalFire}
          accuracy={Number(
            ((countTargetHit / countTotalFire) * 100).toFixed(2)
          )}
          targetsHit={countTargetHit}
          totalTime={totalTime}
        />
      )}
    </>
  )
}

export default AppLayout
