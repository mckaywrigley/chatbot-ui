import { NextApiRequest, NextApiResponse } from 'next';

import { NotionAPI } from 'notion-client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { id } = req.query;
  if (!id) {
    res.status(400).json({ message: 'Missing id' });
    return;
  }

  const api = new NotionAPI();
  try {
    const recordMap = await api.getPage(id as string);

    res.status(200).json({
      recordMap,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
