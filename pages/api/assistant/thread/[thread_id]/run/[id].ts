import { NextApiRequest, NextApiResponse } from "next";

async function validateRun(thread_id: string, run_id: string): Promise<string | boolean> {
  // Check if run_id is valid
  const getRunResponse = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAi-Beta': 'assistants=v1', // Add the OpenAi-Beta header
    },
  });

  const getRunData = await getRunResponse.json();

  if (getRunData.error) {
    console.error('Error getting run:', getRunData.error);
    return false;
  }

  return getRunData;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { thread_id, id: run_id } = req.query;
    const run = await validateRun(thread_id as string, run_id as string);

    if (!run) {
      res.status(400).json({ error: 'Invalid run_id' });
      return;
    }

    res.status(200).json(run);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
}