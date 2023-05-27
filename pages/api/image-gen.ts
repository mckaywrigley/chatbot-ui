import { NextResponse } from 'next/server';

import {
  DEFAULT_IMAGE_GENERATION_SAMPLE,
  DEFAULT_IMAGE_GENERATION_STYLE,
} from '@/utils/app/const';
import {
  addUsageEntry,
  getAdminSupabaseClient,
  getUserProfile,
  hasUserRunOutOfCredits,
  subtractCredit,
} from '@/utils/server/supabase';

import { ChatBody } from '@/types/chat';
import { PluginID } from '@/types/plugin';

import { decode } from 'base64-arraybuffer';
import { v4 } from 'uuid';

const supabase = getAdminSupabaseClient();

export const config = {
  runtime: 'edge',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const unauthorizedResponse = new Response('Unauthorized', { status: 401 });

const MAX_TIMEOUT = 300; // 5 minutes

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

  const writeToStream = async (text: string) => {
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

      writeToStream('```Image Generation \n');
      writeToStream('Generating ... \n');

      const options = {
        method: 'POST',
        headers: requestHeader,
        body: JSON.stringify({
          msg: latestUserPromptMessage,
        }),
      };

      const imageGenerationResponse = await fetch(
        `https://api.thenextleg.io/v2/imagine`,
        options,
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
        Date.now() - generationStartedAt < MAX_TIMEOUT * 1000 ||
        imageGenerationProgress < 100
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

        console.log(imageGenerationProgressResponseJson);

        const generationProgress = imageGenerationProgressResponseJson.progress;

        if (generationProgress === 100) {
          writeToStream(`100% ... \n`);
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
        } else if (generationProgress !== imageGenerationProgress) {
          writeToStream(`${generationProgress}% ... \n`);
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
