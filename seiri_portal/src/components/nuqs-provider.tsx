// NuqsProvider is a server component wrapper
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ReactNode } from 'react'

interface NuqsProviderProps {
  children: ReactNode
}

export function NuqsProvider({ children }: NuqsProviderProps) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}