import { NextApiRequest, NextApiResponse } from 'next';
import { config } from 'dotenv';
import { Message } from '@/types/chat';

config(); // Load environment variables from .env.local file

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

async function createMessage(thread_id: string, message: Message): Promise<string | boolean> {
  // Create a new message
  const createMessageResponse = await fetch(`https://api.openai.com/v1/threads/${thread_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAi-Beta': 'assistants=v1', // Add the OpenAi-Beta header
    },
    body: JSON.stringify({
      role: message.role,
      content: message.content,
    }),
  });

  const createMessageData = await createMessageResponse.json();

  if (createMessageData.error) {
    console.error('Error creating message:', createMessageData.error);
    return false;
  }

  return createMessageData.id;
}
        
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    let { message, assistant_id } = req.body;
    let { thread_id } = req.query;
    
    // Check if assistant_id exists
    const assistant = await validateAssistant(assistant_id);
    const thread = await validateThread(thread_id as string);

    if (!assistant) {
      res.status(400).json({ error: 'Invalid assistant_id' });
      return;
    }

    if (!thread) {
      res.status(400).json({ error: 'Invalid thread_id' });
      return;
    }

    assistant_id = assistant as string;
    thread_id = thread as string;

    message && await createMessage(thread_id, message);

    const response = await fetch(`https://api.openai.com/v1/threads/${thread_id}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAi-Beta': 'assistants=v1', // Add the OpenAi-Beta header
      },
      body: JSON.stringify({
        assistant_id: assistant_id,
      }),
    });

    const runData = await response.json();

    if (runData.error) {
      res.status(400).json({ error: 'Invalid thread_id' });
      return;
    }

    res.status(200).json(runData);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
}