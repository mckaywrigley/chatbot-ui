import { Message } from '@/types/chat';
import { GoogleBody } from '@/types/google';

import TurndownService from 'turndown';

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
  {
    name: 'web-text-scraper',
    description: 'Scrapes the text from the specified URL and return Markdown',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to scrape',
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
    case 'web-text-scraper': {
      try {
        const { url } = JSON.parse(functionCall.arguments || '{}');
        content = await webScraperPlugin(url);
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

export async function webScraperPlugin(url: string) {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  const html = await response.text();

  // 本文抽出
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const article = doc.querySelector('article,main,div') ?? document.body;

  const turndownService = new TurndownService();
  turndownService.addRule('script', {
    filter: 'script',
    replacement: () => '',
  });
  const markdown = turndownService.turndown(article.innerHTML || '');
  return markdown.slice(0, 2000);
}
