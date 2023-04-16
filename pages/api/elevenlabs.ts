import { NextApiRequest, NextApiResponse } from 'next/types';

import { ElevenLabsSpeech } from '@/utils/server';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    console.log(req.body);
    const { text } = await req.body;
    const audio = await ElevenLabsSpeech(text, {
      stability: 0,
      similarity_boost: 0,
    }).catch((error) => {
      console.error(error);
    });
    if (!audio) {
      throw new Error('handler: Error parsing audio blob');
    }
    console.log(audio);
    const headers = new Headers({
      'Content-Type': 'audio/mpeg',
    });
    const response = new Response(audio, {
      headers,
    });
    console.log(response);
    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};
interface VoiceBody {
  text: 'string';
  voice_settings: {
    stability: number;
    similarity_boost: number;
  };
}
const DEFAULT_STABILITY = 0;
const DEFAULT_SIMILARITY_BOOST = 0;

export default handler;
