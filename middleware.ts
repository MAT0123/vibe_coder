import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const APP_DOMAIN = process.env.APP_DOMAIN || 'localhost'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0]

  // Skip API routes and internal paths
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check if this is the main app domain
  const hostnameWithoutPort = hostname.split(':')[0]
  const isMainDomain = 
    hostnameWithoutPort === APP_DOMAIN ||
    hostnameWithoutPort === `www.${APP_DOMAIN}` ||
    hostnameWithoutPort === 'localhost'

  if (isMainDomain) {
    return NextResponse.next()
  }

  // This is a subdomain or custom domain - rewrite to serve API
  const url = request.nextUrl.clone()
  const originalPath = url.pathname
  
  // Rewrite to the serve API
  url.pathname = `/api/serve${originalPath === '/' ? '/index.html' : originalPath}`
  
  // Pass the original host as a query parameter for reliable lookup
  url.searchParams.set('__host', hostname)
  
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
