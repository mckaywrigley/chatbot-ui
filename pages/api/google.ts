import { ChatBody, Message } from '@/types/chat';
import { GoogleSource } from '@/types/google';
import { OPENAI_API_HOST } from '@/utils/app/const';
import { cleanSourceText } from '@/utils/server/google';
import { Readability } from '@mozilla/readability';
import endent from 'endent';
import jsdom, { JSDOM } from 'jsdom';
import { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {
    const { messages, key, model } = req.body as ChatBody;

    const userMessage = messages[messages.length - 1];

    const googleRes = await fetch(
      `https://customsearch.googleapis.com/customsearch/v1?key=${
        process.env.GOOGLE_API_KEY
      }&cx=${process.env.GOOGLE_CSE_ID}&q=${userMessage.content.trim()}&num=5`,
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
          const res = await fetch(source.link);
          const html = await res.text();

          const virtualConsole = new jsdom.VirtualConsole();
          virtualConsole.on('error', (error) => {
            if (!error.message.includes('Could not parse CSS stylesheet')) {
              console.error(error);
            }
          });

          const dom = new JSDOM(html, { virtualConsole });
          const doc = dom.window.document;
          const parsed = new Readability(doc).parse();

          if (parsed) {
            let sourceText = cleanSourceText(parsed.textContent);

            return {
              ...source,
              // TODO: switch to tokens
              text: sourceText.slice(0, 2000),
            } as GoogleSource;
          }

          return null;
        } catch (error) {
          return null;
        }
      }),
    );

    const filteredSources: GoogleSource[] = sourcesWithText.filter(Boolean);

    const answerPrompt = endent`
    Provide me with the information I requested. Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as a markdown link as you use them at the end of each sentence by number of the source (ex: [[1]](link.com)). Provide an accurate response and then stop. Today's date is ${new Date().toLocaleDateString()}.

    Example Input:
    What's the weather in San Francisco today?

    Example Sources:
    [Weather in San Francisco](https://www.google.com/search?q=weather+san+francisco)

    Example Response:
    It's 70 degrees and sunny in San Francisco today. [[1]](https://www.google.com/search?q=weather+san+francisco)

    Input:
    ${userMessage.content.trim()}

    Sources:
    ${filteredSources.map((source) => {
      return endent`
      ${source.title} (${source.link}):
      ${source.text}
      `;
    })}

    Response:
    `;

    const answerMessage: Message = { role: 'user', content: answerPrompt };

    const answerRes = await fetch(`${OPENAI_API_HOST}/v1/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`,
        ...(process.env.OPENAI_ORGANIZATION && {
          'OpenAI-Organization': process.env.OPENAI_ORGANIZATION,
        }),
      },
      method: 'POST',
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: 'system',
            content: `Use the sources to provide an accurate response. Respond in markdown format. Cite the sources you used as [1](link), etc, as you use them.`,
          },
          answerMessage,
        ],
        max_tokens: 1000,
        temperature: 1,
        stream: false,
      }),
    });

    const { choices: choices2 } = await answerRes.json();
    const answer = choices2[0].message.content;

    res.status(200).json({ answer });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
};

export default handler;
