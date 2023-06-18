import { Message } from '@/types/chat';
import { GoogleBody } from '@/types/google';

import rehypeDomParse from 'rehype-dom-parse';
import rehypeRemark from 'rehype-remark';
import rehypeSanitize, { Root } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { Plugin, unified } from 'unified';
import { filter } from 'unist-util-filter';

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
  const article =
    doc.querySelector('article,#article,.article,main,#main,.main') ?? doc.body;

  const file = await unified()
    .use(rehypeDomParse, { fragment: true })
    .use(removeExtra)
    .use(rehypeSanitize)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(article.innerHTML);

  const markdown = String(file);

  return markdown.slice(0, 2000);
}

const ignoreTagNames = ['style', 'script', 'nav'];
const removeExtra: Plugin<[], Root, Root> = () => (tree) => {
  return (
    filter(tree, { cascade: false }, (node) => {
      return (
        node.type !== 'comment' &&
        !('tagName' in node && ignoreTagNames.includes(node.tagName + ''))
      );
    }) || undefined
  );
};
