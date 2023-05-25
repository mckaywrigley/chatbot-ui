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
  steps: 50,
  negativePrompts: "blur, low resolution"
};

const CREATIVELY_LEVELS_MAPPING = {
  high: {
    steps: 40,
    cfgScale: 2
  },
  medium: {
    steps: 50,
    cfgScale: 4
  },
  low: {
    steps: 100,
    cfgScale: 7
  }
}

// The lower the temperature, the less creative the generation
const getImageGenerationConfig = (temperature: number = 0.5) => {
  if(temperature < 0.3) {
    return {
      ...IMAGE_GENERATION_CONFIG,
      ...CREATIVELY_LEVELS_MAPPING.low
    }
  }else if(temperature < 0.7) {
    return {
      ...IMAGE_GENERATION_CONFIG,
      ...CREATIVELY_LEVELS_MAPPING.medium
    }
  }else {
    return {
      ...IMAGE_GENERATION_CONFIG,
      ...CREATIVELY_LEVELS_MAPPING.high
    }
  }
}

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

      const generationTemperature = requestBody.temperature;
      const numberOfImages = 2;

      writeToStream('```Image Generation \n');
      writeToStream('Generating image(s) ... \n');

      const imageGenerationConfig = getImageGenerationConfig(generationTemperature);

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
            {
              text: imageGenerationConfig.negativePrompts,
              weight: -0.5,
            }
          ],
          height: imageGenerationConfig.height,
          width: imageGenerationConfig.width,
          style_preset: imageGenerationConfig.stylePreset,
          cfg_scale: imageGenerationConfig.cfgScale,
          steps: imageGenerationConfig.steps,
        }),
      };

      for(let imageIndex = 0; imageIndex < numberOfImages; imageIndex++) {
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
  
        if(imageIndex === 0) {
          writeToStream(`Receiving image(s) ... \n`);
          writeToStream('``` \n');
        }
  
        writeToStream(`![Generated Image](${imagePublicUrlData.publicUrl}) \n`);
  
        addUsageEntry(PluginID.IMAGE_GEN, user.id);
        subtractCredit(user.id, PluginID.IMAGE_GEN);
      }

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
