import { Tiktoken } from '@dqbd/tiktoken';
import { Readability } from '@mozilla/readability';
import jsdom, { JSDOM } from 'jsdom';

export const extractTextFromHtml = (
  encoding: Tiktoken,
  html: string,
  maxToken: number,
): string => {
  const virtualConsole = new jsdom.VirtualConsole();
  virtualConsole.on('error', (error) => {
    if (!error.message.includes('Could not parse CSS stylesheet')) {
      console.error(error);
    }
  });

  const dom = new JSDOM(html, { virtualConsole });
  const doc = dom.window.document;
  const parsed = new Readability(doc).parse();
  if (!parsed) {
    return '';
  }
  const textDecoder = new TextDecoder();
  let sourceText = cleanSourceText(parsed.textContent);

  // 400 tokens per source
  let encodedText = encoding!.encode(sourceText);
  if (encodedText.length > maxToken) {
    encodedText = encodedText.slice(0, maxToken);
  }
  return textDecoder.decode(encoding!.decode(encodedText));
};

export const cleanSourceText = (text: string) => {
  return text
    .trim()
    .replace(/(\n){4,}/g, '\n\n\n')
    .replace(/\n\n/g, ' ')
    .replace(/ {3,}/g, '  ')
    .replace(/\t/g, '')
    .replace(/\n+(\s*\n)*/g, '\n');
};
