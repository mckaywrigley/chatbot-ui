import { NextResponse } from 'next/server';

import {
  DEFAULT_IMAGE_GENERATION_QUALITY,
  DEFAULT_IMAGE_GENERATION_STYLE,
} from '@/utils/app/const';
import { capitalizeFirstLetter } from '@/utils/app/ui';
import {
  addUsageEntry,
  getAdminSupabaseClient,
  getUserProfile,
  hasUserRunOutOfCredits,
  subtractCredit,
} from '@/utils/server/supabase';

import { ChatBody } from '@/types/chat';
import { PluginID } from '@/types/plugin';

import dayjs from 'dayjs';

const supabase = getAdminSupabaseClient();

export const config = {
  runtime: 'edge',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const unauthorizedResponse = new Response('Unauthorized', { status: 401 });

const MAX_TIMEOUT = 600; // 10 minutes

const generateMjPrompt = (
  userInputText: string,
  style: string = DEFAULT_IMAGE_GENERATION_STYLE,
  quality: string = DEFAULT_IMAGE_GENERATION_QUALITY,
  temperature: number = 0.5,
): string => {
  let resultPrompt = userInputText;

  if (style !== 'default') {
    resultPrompt += `, ${capitalizeFirstLetter(style)} style --v 5.1`;
  }

  switch (quality) {
    case 'High':
      resultPrompt += ' --quality 1';
      break;
    case 'Medium':
      resultPrompt += ' --quality .5';
      break;
    case 'Low':
      resultPrompt += ' --quality .25';
      break;
    default:
      resultPrompt += ' --quality 1';
      break;
  }

  if (temperature === 0.5) {
    resultPrompt += ' --chaos 5';
  } else if (temperature > 0.5) {
    resultPrompt += ' --chaos 50';
  }

  return resultPrompt;
};

const handler = async (req: Request): Promise<Response> => {
  const userToken = req.headers.get('user-token');

  const { data, error } = await supabase.auth.getUser(userToken || '');
  if (!data || error) return unauthorizedResponse;

  const user = await getUserProfile(data.user.id);
  if (!user || user.plan === 'free') return unauthorizedResponse;

  if (await hasUserRunOutOfCredits(data.user.id, PluginID.IMAGE_GEN)) {
    return new Response('Error', {
      status: 402,
      statusText: 'Ran out of Image generation credit',
    });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  let jobTerminated = false;

  const writeToStream = async (text: string, removeLastLine?: boolean) => {
    if (removeLastLine) {
      await writer.write(encoder.encode('[REMOVE_LAST_LINE]'));
    }
    await writer.write(encoder.encode(text));
  };

  const requestBody = (await req.json()) as ChatBody;

  const imageGeneration = async () => {
    const requestHeader = {
      Authorization: `Bearer ${process.env.THE_NEXT_LEG_API_KEY || ''}`,
      'Content-Type': 'application/json',
    };

    try {
      const latestUserPromptMessage =
        requestBody.messages[requestBody.messages.length - 1].content;

      writeToStream('```MJImage \n');
      writeToStream('Initializing ... \n');
      writeToStream(
        'This feature is still in Beta, please expect some non-ideal images and report any issue to admin. Thanks. \n',
      );

      const imageGenerationResponse = await fetch(
        `https://api.thenextleg.io/v2/imagine`,
        {
          method: 'POST',
          headers: requestHeader,
          body: JSON.stringify({
            msg: generateMjPrompt(
              latestUserPromptMessage,
              requestBody.imageStyle,
              requestBody.imageQuality,
              requestBody.temperature,
            ),
          }),
        },
      );

      if (!imageGenerationResponse.ok) {
        throw new Error('Image generation failed');
      }

      const imageGenerationResponseJson = await imageGenerationResponse.json();

      if (
        imageGenerationResponseJson.success !== true ||
        !imageGenerationResponseJson.messageId
      ) {
        console.log(imageGenerationResponseJson);
        console.error('Failed during submitting request');
        throw new Error('Image generation failed');
      }

      const imageGenerationMessageId = imageGenerationResponseJson.messageId;

      // Check every 4 seconds if the image generation is done
      let generationStartedAt = Date.now();
      let imageGenerationProgress = null;

      while (
        !jobTerminated &&
        (Date.now() - generationStartedAt < MAX_TIMEOUT * 1000 ||
          imageGenerationProgress < 100)
      ) {
        await sleep(4000);
        const imageGenerationProgressResponse = await fetch(
          `https://api.thenextleg.io/v2/message/${imageGenerationMessageId}?authToken=${process.env.THE_NEXT_LEG_API_KEY}`,
          { method: 'GET' },
        );

        if (!imageGenerationProgressResponse.ok) {
          console.log(await imageGenerationProgressResponse.status);
          console.log(await imageGenerationProgressResponse.text());
          throw new Error('Unable to fetch image generation progress');
        }

        const imageGenerationProgressResponseJson =
          await imageGenerationProgressResponse.json();

        const generationProgress = imageGenerationProgressResponseJson.progress;
        
        if (generationProgress === 100) {
          const generationLengthInSecond = Math.round(
            (Date.now() - generationStartedAt) / 1000,
          );
          writeToStream(`Completed in ${generationLengthInSecond}s\n`);
          writeToStream('``` \n');

          writeToStream(
            `![Generated Image](${imageGenerationProgressResponseJson.response.imageUrl}) \n`,
          );
          addUsageEntry(PluginID.IMAGE_GEN, user.id);
          subtractCredit(user.id, PluginID.IMAGE_GEN);
          imageGenerationProgress = 100;

          await writeToStream('[DONE]');
          writer.close();
          return;
        } else {
          if (imageGenerationProgress === null) {
            writeToStream(
              `Started to generate @ ${dayjs().format('hh:mm:ss')} \n`,
            );
          } else {
            writeToStream(
              `${
                generationProgress === 0
                  ? 'Waiting to be processed'
                  : `${generationProgress} %`
              } ... @ ${dayjs().format('hh:mm:ss')} \n`,
              true,
            );
          }
          imageGenerationProgress = generationProgress;
        }
      }

      await writeToStream('[DONE]');
      await writeToStream(
        'Unable to finish the generation in 5 minutes, please try again later.',
      );
      writer.close();
      return;
    } catch (error) {
      jobTerminated = true;

      console.log(error);
      await writeToStream(
        'Error occurred while generating image, please try again later.',
      );
      await writeToStream('[DONE]');
      writer.close();
      return;
    }
  };

  imageGeneration();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
};

export default handler;
