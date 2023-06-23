import { NextApiRequest } from 'next';

function parseApiKey(bearToken: string) {
  const token = bearToken.trim().replaceAll('Bearer ', '').trim();

  return {
    guestCode: token,
  };
}

function timingSafeEqual(a: string, b: string) {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }

  return result === 0;
}

export function auth(req: Request | NextApiRequest) {
  const SERVER_GUEST_CODE = process.env.GUEST_CODE ?? '';

  if (!SERVER_GUEST_CODE) {
    return {
      error: false,
    };
  }

  let authToken = '';

  // Check if it's a NextApiRequest (Next.js) or a Request (Express.js)
  if (typeof req.headers.get === 'function') {
    // NextApiRequest: req.headers.get('Authorization')
    authToken = req.headers.get('Authorization') ?? '';
  } else {
    // Request: req.headers.authorization
    authToken =
      (req as unknown as NextApiRequest).headers['authorization'] ?? '';
  }

  // check if it is openai api key or user token
  const { guestCode } = parseApiKey(authToken);

  // Compare buffer with two codes
  const isGuestCodeValid = timingSafeEqual(guestCode, SERVER_GUEST_CODE);

  if (!isGuestCodeValid) {
    return {
      error: true,
      status: 401,
      statusText: 'Unauthorized',
    };
  }

  return {
    error: false,
  };
}
