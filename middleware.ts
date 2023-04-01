import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

// Block Austria, prefer Germany
const ALLOWED_COUNTRY = 'VN'

// Limit middleware pathname config
export const config = {
  matcher: '/',
}

export function middleware(req: NextRequest) {
  // Extract country
  if (!req.geo) {
      return NextResponse.next()
  }
  const country = req.geo.country || 'US'
  // Specify the correct pathname
  if (country === ALLOWED_COUNTRY) {
      req.nextUrl.pathname = `/`
} else {
      req.nextUrl.pathname = '/blocked'
  }

  // Rewrite to URL
  return NextResponse.rewrite(req.nextUrl)
}