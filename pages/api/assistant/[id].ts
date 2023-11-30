import { NextApiRequest, NextApiResponse } from "next";

async function validateAssistant(assistant_id: string): Promise<string | boolean> {
  // Check if assistant_id is valid
  const getAssistantResponse = await fetch(`https://api.openai.com/v1/assistants/${assistant_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAi-Beta': 'assistants=v1', // Add the OpenAi-Beta header
    },
  });

  const getAssistantData = await getAssistantResponse.json();

  if (getAssistantData.error) {
    console.error('Error getting assistant:', getAssistantData.error);
    return false;
  }

  return getAssistantData.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { id: assistant_id } = req.query;
    const assistant = await validateAssistant(assistant_id as string);

    if (!assistant) {
      res.status(400).json({ error: 'Invalid assistant_id' });
      return;
    }

    res.status(200).json(assistant);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
}