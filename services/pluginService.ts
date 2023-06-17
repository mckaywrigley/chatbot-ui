import { Message } from '@/types/chat';
import { GoogleBody } from '@/types/google';

export const functions = [
  {
    name: 'google-search',
    description: 'Searches Google for the specified query',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The query to search for',
        },
      },
    },
  },
];

export async function runPlugin(
  functionCall: Message['function_call'],
): Promise<Message | void> {
  if (!functionCall) {
    return;
  }

  let content = '';

  switch (functionCall.name) {
    case 'google-search': {
      try {
        const { query } = JSON.parse(functionCall.arguments || '{}');
        content = await googleSearchPlugin({ query });
      } catch (error) {
        content = String(error);
      }
      break;
    }
    default:
      break;
  }

  return {
    role: 'function',
    name: functionCall.name,
    content,
  };
}

export async function googleSearchPlugin(body: GoogleBody) {
  const response = await fetch('/api/google', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = await response.json();

  const text = json.items
    .map((item: any) => {
      return `[${item.title}](${item.link})\n${item.snippet}\n`;
    })
    .join('\n');

  return text;
}
