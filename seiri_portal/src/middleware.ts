import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/workspaces(.*)',  // Only protect workspaces route
])

export default clerkMiddleware(async (auth, req) => {
  // Temporarily disable auth protection for development
  // Uncomment when you have valid Clerk keys
  // if (isProtectedRoute(req)) {
  //   await auth.protect()
  // }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}