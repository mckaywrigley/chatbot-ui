// import { createClient } from "@/lib/supabase/middleware"
// import { NextResponse, type NextRequest } from "next/server"

// export async function middleware(request: NextRequest) {
//   try {
//     const { supabase, response } = createClient(request)

//     const session = await supabase.auth.getSession()

//     const redirectToChat = session && request.nextUrl.pathname === "/"

//     if (redirectToChat) {
//       return NextResponse.redirect(new URL("/chat", request.url))
//     }

//     return response
//   } catch (e) {
//     return NextResponse.next({
//       request: {
//         headers: request.headers
//       }
//     })
//   }
// }

// middleware.ts

import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"

export async function middleware(request: NextRequest) {
  // i18n routing
  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  try {
    const { supabase, response } = createClient(request)

    const session = await supabase.auth.getSession()

    const redirectToChat = session && request.nextUrl.pathname === "/"

    if (redirectToChat) {
      return NextResponse.redirect(new URL("/chat", request.url))
    }

    return response
  } catch (e) {
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next).*)"
}
