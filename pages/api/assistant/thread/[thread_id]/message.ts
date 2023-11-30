import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { thread_id } = req.query;

    // List messages for a thread
    const getMessagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread_id}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAi-Beta': 'assistants=v1', // Add the OpenAi-Beta header
      },
    });

    const getMessagesData = await getMessagesResponse.json();

    if (getMessagesData.error) {
      console.error('Error getting run:', getMessagesData.error);
      return false;
    }

    // TODO: implement complex message queries    
    res.status(200).json(getMessagesData.data[0]);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
}