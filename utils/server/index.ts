import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import { AZURE_DEPLOYMENT_ID, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '../app/const';
import { ParsedEvent, ReconnectInterval, createParser } from 'eventsource-parser';

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

const API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = 'asst_r9UryYvlKp6phPKXeg6rYPf6';

async function createThread(messages: Message[]): Promise<string> {

  const correctedMessages = messages.map(message => {
    if (message.role !== 'user') {
      console.warn(`Correcting role from ${message.role} to 'user'`);
      return { ...message, role: 'user' };
    }
    return message;
  });


  const url = `${OPENAI_API_HOST}/v1/threads`;
  const requestBody = JSON.stringify({ messages: correctedMessages })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v1'
    },
    body: requestBody
  });

  if (!res.ok) {
    throw new Error(`Failed to create thread: ${res.statusText}`);
  }

  const data = await res.json();
  
  

  return data.id;
}

async function runThread(threadId: string) {
  if (!threadId) {
    console.error('Thread ID is undefined or invalid');
    throw new Error('Thread ID is undefined or invalid');
  }

  console.log('Initiating runThread with threadId:', threadId);

  const runUrl = `${OPENAI_API_HOST}/v1/threads/${threadId}/runs`;
  console.log('runUrl:', runUrl);

  const runRequestBody = JSON.stringify({
    assistant_id: ASSISTANT_ID,
    model: "gpt-4-1106-preview",
    // Include any other parameters if necessary
  });
  console.log('runRequestBody:', runRequestBody);

  const runResponse = await fetch(runUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v1'
    },
    body: runRequestBody
  });

  console.log('runResponse status:', runResponse.status);
  if (!runResponse.ok) {
    console.error('Failed to run thread:', runResponse.statusText);
    throw new Error(`Failed to run thread: ${runResponse.statusText}`);
  }

  const runData = await runResponse.json();
  console.log('runData:', runData);

  const runId = runData.id;
  console.log('Run ID:', runId);

  let runStatus = runData.status;
  while (runStatus === 'queued' || runStatus === 'in_progress') {
    console.log('Polling for run status...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds

    const statusUrl = `${OPENAI_API_HOST}/v1/threads/${threadId}/runs/${runId}`;
    console.log('Checking status at:', statusUrl);

    const statusResponse = await fetch(statusUrl, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      }
    });

    console.log('statusResponse status:', statusResponse.status);
    if (!statusResponse.ok) {
      console.error('Failed to get run status:', statusResponse.statusText);
      throw new Error(`Failed to get run status: ${statusResponse.statusText}`);
    }

    const statusData = await statusResponse.json();
    console.log('statusData:', statusData);

    runStatus = statusData.status;
    console.log('Current run status:', runStatus);
  }

  if (runStatus === 'completed') {
    console.log('Run completed, fetching messages...');

    const messagesUrl = `${OPENAI_API_HOST}/v1/threads/${threadId}/messages`;
    console.log('Fetching messages from:', messagesUrl);

    const messagesResponse = await fetch(messagesUrl, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      }
    });

    console.log('messagesResponse status:', messagesResponse.status);
    if (!messagesResponse.ok) {
      console.error('Failed to fetch messages:', messagesResponse.statusText);
      throw new Error(`Failed to fetch messages: ${messagesResponse.statusText}`);
    }

    const messagesData = await messagesResponse.json();
    console.log('Messages from assistant:', messagesData);

    // Extracting text from assistant messages
    const assistantMessages = messagesData.data
      .filter((msg: { role: string; }) => msg.role === 'assistant')
      .map(msg => msg.content.map(content => content.text?.value).join(' '))
      .join('\n');

    console.log('Extracted assistant messages:', assistantMessages);
    return assistantMessages;
  } else {
    console.log('Run ended with status:', runStatus);
    return null;
  }
}




export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature: number,
  key: string,
  messages: Message[],
  role: string,
) => {
  console.log('OpenAIStream called with:', { model, systemPrompt, temperature, messages });
  
  const threadId = await createThread([
    {
      role: 'user',
      content: systemPrompt,
    },
    ...messages,
  ]);

  const runData = await runThread(threadId);

  if (!runData || runData.trim() === '') {
    console.error('No response from assistant');
    throw new Error('No response from assistant');
  }

  console.log('Assistant response:', runData);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const queue = encoder.encode(runData); // Use runData directly
      controller.enqueue(queue);
      controller.close();
    },
  });

  console.log('Returning response stream');
  return stream;
};
