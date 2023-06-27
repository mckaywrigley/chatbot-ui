import { NextApiRequest, NextApiResponse } from 'next';
import { API_BASE_URL } from '@/utils/app/const';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query, context } = req.body;

  try {
    const response = await fetch(`${API_BASE_URL}/endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, context }),
    });

    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
}