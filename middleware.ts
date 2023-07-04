import { NextRequest, NextResponse } from "next/server"
import HttpStatusCode from "./utils/app/HttpStatusCode";

export { default } from "next-auth/middleware"

export function middleware(request: NextRequest) {

    if((request.nextUrl.searchParams.has('workspace') || request.cookies.has('workspace')) && (request.cookies.has('token') || request.nextUrl.searchParams.has('token'))){
        const response = NextResponse.next();
        return response;
    } else {
        return NextResponse.json({error: HttpStatusCode.UNAUTHORIZED},  {
            status: HttpStatusCode.UNAUTHORIZED,
        });
    }
  }

export const config = { matcher: ["/api/private/:path*", "/api/chat", "/api/google"] }
