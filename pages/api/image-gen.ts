import { NextResponse } from 'next/server';

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

const unauthorizedResponse = new Response('Unauthorized', { status: 401 });

// Reference https://platform.stability.ai/rest-api#tag/v1generation/operation/textToImage
const IMAGE_GENERATION_CONFIG = {
  engineName: 'stable-diffusion-xl-beta-v2-2-2',
  height: 512,
  width: 512,
  stylePreset: 'photographic',
  cfgScale: 4,
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

  const writeToStream = async (text: string) => {
    await writer.write(encoder.encode(text));
  };

  try {
    const requestBody = (await req.json()) as ChatBody;

    const imageGeneration = async () => {
      const latestUserPrompt =
        requestBody.messages[requestBody.messages.length - 1].content;

      writeToStream('```Image Generation \n');
      writeToStream('Generating image ... \n');

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.STABILITY_AI_KEY}`,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: latestUserPrompt,
              weight: 0.5,
            },
          ],
          height: IMAGE_GENERATION_CONFIG.height,
          width: IMAGE_GENERATION_CONFIG.width,
          style_preset: IMAGE_GENERATION_CONFIG.stylePreset,
          cfg_scale: IMAGE_GENERATION_CONFIG.cfgScale,
        }),
      };

      const imageGenerationResponse = await fetch(
        `https://api.stability.ai/v1/generation/${IMAGE_GENERATION_CONFIG.engineName}/text-to-image`,
        options,
      );

      const imageGenerationResponseJson = await imageGenerationResponse.json();
      const base64ImageString = imageGenerationResponseJson.artifacts[0].base64;

      // Upload base64 Image to Supabase Storage
      const imageFileName = `${user.id}-${v4()}.png`;
      const { error } = await supabase.storage
        .from('ai-images')
        .upload(imageFileName, decode(base64ImageString), {
          cacheControl: '3600',
          upsert: false,
        });
      if (error) throw error;

      const { data: imagePublicUrlData } = await supabase.storage
        .from('ai-images')
        .getPublicUrl(imageFileName);

      writeToStream(`Image generated! \n`);
      writeToStream('``` \n');

      writeToStream(`![Generated Image](${imagePublicUrlData.publicUrl}) \n`);
      writeToStream(`[Link](${imagePublicUrlData.publicUrl}) \n`);

      addUsageEntry(PluginID.IMAGE_GEN, user.id);
      subtractCredit(user.id, PluginID.IMAGE_GEN);

      await writeToStream('[DONE]');
      writer.close();
    };

    imageGeneration();

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    writer.close();
    return new Response('Error', { status: 500 });
  }
};

export default handler;
