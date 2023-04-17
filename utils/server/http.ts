import { NextApiRequest } from 'next';

import { Headers } from '@/agent/tools/requests';

export const extractHeaders = (request: Request | NextApiRequest): Headers => {
  let headers: Record<string, string> = {};
  if (request instanceof Request) {
    let ite = request.headers.entries();
    let entry = ite.next();
    while (!entry.done) {
      headers[entry.value[0]] = entry.value[1];
      entry = ite.next();
    }
    return headers;
  } else {
    const headers = (request as NextApiRequest).headers;
    for (const key in headers) {
      headers[key] = headers[key];
    }
  }
  return headers;
};
