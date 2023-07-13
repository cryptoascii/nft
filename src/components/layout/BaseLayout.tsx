import React, { ReactNode } from 'react'
import Header from './Header'

type TProps = {
  children: ReactNode
}

export const BaseLayout = (props: TProps) => {
  const { children } = props;
  return (
    <div className='h-full'>
      <Header />
      <main>
        {children}
      </main>
    </div>
  )
}
