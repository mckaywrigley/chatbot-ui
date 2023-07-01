import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ChatBody } from '@/types/chat';

export const middleware = async (req: NextRequest) => {
  const chatBody = (await req.json()) as ChatBody;
  if (chatBody.pluginUrlList && chatBody.pluginUrlList.length > 0) {
    return NextResponse.redirect(new URL('/api/plugin-chat', req.url));
  }
  return NextResponse.next();
};

export const config = {
  matcher: '/api/chat',
};
