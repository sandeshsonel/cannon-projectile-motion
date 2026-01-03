import type { ReactNode } from 'react'

import Navbar from './Navbar'
import Footer from './Footer'

interface Props {
  children: ReactNode
}

const AppLayout = ({ children }: Props) => {
  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100">
      <Navbar />
      <main className="flex-1 relative overflow-hidden">{children}</main>
      <Footer />
    </div>
  )
}

export default AppLayout
