import { NextApiRequest, NextApiResponse } from 'next';

import { OPENAI_API_HOST } from '@/utils/app/const';
import { OpenAIError } from '@/utils/server';
import { cleanSourceText } from '@/utils/server/google';

import { Message } from '@/types/chat';
import { GoogleBody, GoogleSource } from '@/types/google';

import { Tiktoken, TiktokenModel, encoding_for_model } from '@dqbd/tiktoken';
import { Readability } from '@mozilla/readability';
import endent from 'endent';
import jsdom, { JSDOM } from 'jsdom';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { query, googleAPIKey, googleCSEId } =
      (await req.json()) as GoogleBody;

    const googleRes = await fetch(
      `https://customsearch.googleapis.com/customsearch/v1?key=${
        googleAPIKey ? googleAPIKey : process.env.GOOGLE_API_KEY
      }&cx=${
        googleCSEId ? googleCSEId : process.env.GOOGLE_CSE_ID
      }&q=${query}&num=5`,
    );

    return googleRes;
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

/**
 * Truncates the input text to the specified tokens limit.
 */
function truncateTokens(encoding: Tiktoken, text: string, limit: number) {
  const tokens = encoding.encode(text);
  if (tokens.length <= limit) return text;
  const truncatedTokens = tokens.slice(0, limit);
  const truncatedText = new TextDecoder().decode(
    encoding.decode(truncatedTokens),
  );
  return truncatedText;
}

export default handler;
