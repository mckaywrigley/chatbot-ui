import { NextApiRequest, NextApiResponse } from 'next';

import NotionClient from '@/services/notionClient';

const notion = new NotionClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { startCursor } = req.query;

  try {
    const response = await notion.getNewsList(
      startCursor ? (startCursor as string) : undefined,
    );
    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
