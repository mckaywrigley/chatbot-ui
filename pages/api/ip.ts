import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    let ip = (req.headers['x-forwarded-for'] as string)?.split(',').shift() || req.socket.remoteAddress || '';

    // If the IP is in IPv6 format, convert it to IPv4
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    res.json({ ip });
}
