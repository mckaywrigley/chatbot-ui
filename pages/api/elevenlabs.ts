import { NextApiRequest, NextApiResponse } from 'next';

import axios from 'axios';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { text } = req.body;
  const voice_settings = {
    stability: 0,
    similarity_boost: 0,
  };
  // Make sure to remove any non-text like javascript
  let plainText = text.replace(/```[\s\S]*?```/g, ''); // remove any triple backtick code blocks and their content
  plainText = plainText.replace(/`([^`]+)`/g, '$1'); // remove any inline code blocks

  const url =
    'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM';
  const body = JSON.stringify({
    text,
    voice_settings,
  });
  console.log('body', body);
  try {
    const response = await axios.post(url, body, {
      responseType: 'arraybuffer',
      headers: {
        accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': '440192f914b43f96c0fc77f3d893de23',
      },
      method: 'POST',
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin requests

    res.status(200).send(Buffer.from(response.data));
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching audio:', error);
      const results = error.message;
    } else {
      console.error('Error fetching audio:', error);
    }
  }
};

export default handler;
