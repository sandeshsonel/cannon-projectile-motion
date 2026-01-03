import type { ReactNode } from 'react'

import Footer from './Footer'
import Navbar from './Navbar'

interface Props {
  children: ReactNode
}

export const AppLayout = ({ children }: Props) => {
  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100">
      <Navbar />
      <main className="flex-1 relative overflow-hidden">{children}</main>
      <Footer />
    </div>
  )
}
