import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/', '/index'],
};

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    if (user === process.env.USERNAME && pwd === process.env.PASSWORD) {
      return NextResponse.next();
    }
  }
  url.pathname = '/api/basic-auth';

  return NextResponse.rewrite(url);
}
