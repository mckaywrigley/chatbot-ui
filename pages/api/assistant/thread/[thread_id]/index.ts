import { NextApiRequest, NextApiResponse } from "next";


async function validateThread(thread_id: string): Promise<string | boolean> {
  // Check if thread_id is valid
  const getThreadResponse = await fetch(`https://api.openai.com/v1/threads/${thread_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAi-Beta': 'assistants=v1', // Add the OpenAi-Beta header
    },
  });

  const getThreadData = await getThreadResponse.json();

  if (getThreadData.error) {
    console.error('Error getting thread:', getThreadData.error);
    return false;
  }

  return getThreadData.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { id: thread_id } = req.query;
    const thread = await validateThread(thread_id as string);

    if (!thread) {
      res.status(400).json({ error: 'Invalid thread_id' });
      return;
    }

    res.status(200).json(thread);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
}