import { OPENAI_API_HOST } from '@/utils/app/const';
import { extractTextFromHtml } from '@/utils/server/webpage';

import { Plugin } from '@/types/agent';
import { Message } from '@/types/chat';
import { GoogleSource } from '@/types/google';

import { ToolExecutionContext } from './executor';

import endent from 'endent';

export default {
  nameForModel: 'google_search',
  nameForHuman: 'GoogleSearch',
  descriptionForHuman: 'useful for when you need to ask with google search.',
  descriptionForModel: 'useful for when you need to ask with google search.',
  displayForUser: true,
  execute: async (
    context: ToolExecutionContext,
    query: string,
  ): Promise<string> => {
    const encoding = context.encoding;
    const encodedQuery = encodeURIComponent(query.trim());
    const apiKey = process.env.GOOGLE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;
    const googleRes = await fetch(
      `https://customsearch.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodedQuery}&num=5`,
    );

    const googleData = await googleRes.json();
    const sources: GoogleSource[] = googleData.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      displayLink: item.displayLink,
      snippet: item.snippet,
      image: item.pagemap?.cse_image?.[0]?.src,
      text: '',
    }));

    const sourcesWithText: any = await Promise.all(
      sources.map(async (source) => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 5000),
          );

          const res = (await Promise.race([
            fetch(source.link),
            timeoutPromise,
          ])) as any;

          const html = await res.text();
          const text = extractTextFromHtml(encoding!, html, 400);
          if (!text) {
            return {
              ...source,
              text,
            } as GoogleSource;
          }
          return null;
        } catch (error) {
          console.error(error);
          return null;
        }
      }),
    );

    const filteredSources: GoogleSource[] = sourcesWithText.filter(Boolean);
    let sourceTexts: string[] = [];
    let tokenSizeTotal = 0;
    for (const source of filteredSources) {
      const text = endent`
      ${source.title} (${source.link}):
      ${source.text}
      `;
      const tokenSize = encoding.encode(text).length;
      if (tokenSizeTotal + tokenSize > 2000) {
        break;
      }
      sourceTexts.push(text);
      tokenSizeTotal += tokenSize;
    }

    const answerPrompt = endent`
    Provide me with the information I requested. Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as a markdown link as you use them at the end of each sentence by number of the source (ex: [[1]](link.com)). Provide an accurate response and then stop. Today's date is ${new Date().toLocaleDateString()}.

    Example Input:
    What's the weather in San Francisco today?

    Example Sources:
    [Weather in San Francisco](https://www.google.com/search?q=weather+san+francisco)

    Example Response:
    It's 70 degrees and sunny in San Francisco today. [[1]](https://www.google.com/search?q=weather+san+francisco)

    Input:
    ${query.trim()}

    Sources:
    ${sourceTexts}

    Response:
    `;

    const answerMessage: Message = { role: 'user', content: answerPrompt };
    const modelId = context.model?.id ?? 'gpt-3.5-turbo';
    const answerRes = await fetch(`${OPENAI_API_HOST}/v1/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...(process.env.OPENAI_ORGANIZATION && {
          'OpenAI-Organization': process.env.OPENAI_ORGANIZATION,
        }),
      },
      method: 'POST',
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: `Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as [1](link), etc, as you use them. Maximum 4 sentences.`,
          },
          answerMessage,
        ],
        max_tokens: 1000,
        temperature: 1,
        stream: false,
      }),
    });

    const json = await answerRes.json();
    if (json.error) {
      throw new Error(json.error);
    }
    const answer = json.choices[0].message.content;
    return answer;
  },
} as Plugin;
