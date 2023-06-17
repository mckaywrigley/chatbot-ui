import { GoogleBody } from '@/types/google';

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
