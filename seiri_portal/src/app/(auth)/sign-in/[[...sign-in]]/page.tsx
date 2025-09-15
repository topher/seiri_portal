'use client'

import { SignIn } from '@clerk/nextjs'
import { SignInCard } from '@/features/auth/components/sign-in-card'

export default function SignInPage() {
  const isDevelopment = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  
  if (isDevelopment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SignInCard />
      </div>
    )
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  )
}