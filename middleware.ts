import { getRedirectTarget } from "@/lib/auth/get-redirect-target"
import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"
import { normalizeCode } from "@/lib/affiliate/codes"
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_SECONDS
} from "@/lib/affiliate/constants"

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_AUTH === "1"

function stripLocale(pathname: string, locales: string[]): string {
  const segments = pathname.split("/")
  if (segments.length > 1 && locales.includes(segments[1])) {
    return "/" + segments.slice(2).join("/")
  }
  return pathname
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

// Supabase's SSR client sets refreshed auth cookies on the `response` object
// we captured from createClient(). Building a fresh NextResponse for a redirect
// discards those cookies and loops the user through refresh on every request.
// Copy them over before returning the redirect.
function redirectWith(
  request: NextRequest,
  path: string,
  response: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(new URL(path, request.url))
  response.cookies.getAll().forEach(cookie => {
    redirect.cookies.set(cookie)
  })
  return redirect
}

export async function middleware(request: NextRequest) {
  try {
    // Auth gate runs FIRST. i18nRouter always returns a response (a rewrite
    // for the default locale, a redirect for others) - letting it run first
    // would short-circuit middleware before we ever read the session cookie,
    // so logged-in users get stuck on the marketing page at /.
    const { supabase, response } = createClient(request)
    const pathname = stripLocale(request.nextUrl.pathname, i18nConfig.locales)

    // Capture an influencer referral code (?ref=CODE) into a cookie so the
    // attribution survives until the viewer signs up. Set it on `response`,
    // whose cookies are copied onto whatever we ultimately return (a redirect
    // via redirectWith, or the i18n rewrite below).
    const refParam = request.nextUrl.searchParams.get("ref")
    if (refParam) {
      const code = normalizeCode(refParam)
      if (code) {
        response.cookies.set(REFERRAL_COOKIE, code, {
          maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
          httpOnly: true,
          sameSite: "lax",
          path: "/"
        })
      }
    }

    const isRoot = pathname === "/" || pathname === ""
    const isLogin = pathname === "/login" || pathname.startsWith("/login/")
    const isSignup = pathname === "/signup" || pathname.startsWith("/signup/")
    const isForgotPassword =
      pathname === "/forgot-password" || pathname.startsWith("/forgot-password/")
    const isWelcome =
      pathname === "/welcome" || pathname.startsWith("/welcome/")
    const isBlog = pathname === "/blog" || pathname.startsWith("/blog/")
    const isAbout = pathname === "/about"
    const isPrivacy = pathname === "/privacy"
    const isTerms = pathname === "/terms"
    // Internal ops dashboard - gated by its own ADMIN_API_SECRET password
    // prompt, not Supabase login. It must be reachable REGARDLESS of session
    // state, so it's handled as an early bypass below rather than folded into
    // isPublicAuth - that list also gets redirect-AWAY-from-it treatment for
    // already-logged-in users (see the `isPublicAuth || isRoot` branch further
    // down), which would lock out an admin who's also signed into their own
    // account.
    if (isAdminPath(pathname)) {
      const i18nResult = i18nRouter(request, i18nConfig)
      response.cookies.getAll().forEach(cookie => {
        i18nResult.cookies.set(cookie)
      })
      return i18nResult
    }
    // All public pages an unauthenticated user is allowed to see.
    const isPublicAuth =
      isLogin || isSignup || isForgotPassword || isWelcome || isBlog || isAbout || isPrivacy || isTerms
    const isOnboarding = pathname === "/onboarding"
    const seenWelcome = request.cookies.get("seen_welcome")?.value === "1"

    const target = await getRedirectTarget(supabase)

    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log("[mw]", {
        pathname,
        isRoot,
        isLogin,
        isOnboarding,
        target
      })
    }

    let redirectResponse: NextResponse | null = null

    if (target.kind === "path" && target.path === "/login") {
      // Unauthenticated. First visit (no seen_welcome cookie) → the 3-slide
      // greeting. Otherwise allow welcome / login / signup / forgot-password
      // and "/" (marketing landing); everything else bounces to /login.
      if (isRoot && !seenWelcome) {
        redirectResponse = redirectWith(request, "/welcome", response)
      } else if (!isPublicAuth && !isRoot) {
        redirectResponse = redirectWith(request, "/login", response)
      }
    } else if (target.kind === "profile_pending") {
      // Signup trigger hasn't completed - only onboarding may render.
      if (!isOnboarding) {
        redirectResponse = redirectWith(request, "/onboarding", response)
      }
    } else if (target.kind === "path") {
      const targetPath = target.path
      if (isPublicAuth || isRoot) {
        // Logged-in user on marketing / auth pages - send to their
        // destination. Includes /signup + /forgot-password so a stale
        // session never strands them on the auth surface.
        redirectResponse = redirectWith(request, targetPath, response)
      } else if (targetPath === "/onboarding" && !isOnboarding) {
        // Not onboarded - must be on /onboarding.
        redirectResponse = redirectWith(request, "/onboarding", response)
      } else if (isOnboarding && targetPath !== "/onboarding") {
        // Already onboarded - bounce away from /onboarding to home.
        // The `targetPath !== "/onboarding"` guard stops the loop where
        // a not-yet-onboarded user already sits on /onboarding: without
        // it we'd redirect /onboarding -> /onboarding (ERR_TOO_MANY_
        // REDIRECTS).
        redirectResponse = redirectWith(request, targetPath, response)
      }
    }

    if (redirectResponse) return redirectResponse

    // No auth redirect needed - hand off to i18nRouter for the locale rewrite.
    // Propagate any refreshed Supabase cookies onto its response so the browser
    // sees them on the way back.
    const i18nResult = i18nRouter(request, i18nConfig)
    response.cookies.getAll().forEach(cookie => {
      i18nResult.cookies.set(cookie)
    })
    return i18nResult
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[mw] error:", e)
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth|supabase-proxy).*)"
}
