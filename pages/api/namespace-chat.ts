import { OpenAIError } from '@/utils/server';
import { NextApiRequest, NextApiResponse } from 'next';
import { createQAChain } from '@/utils/server/createQAChain';
import { DEFAULT_TEMPERATURE } from '@/utils/app/const';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {

  try {
    const { model, temperature, messages, key, prompt, namespace } = req.body;
    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    try {
      const qaChain = await createQAChain(model, prompt, temperatureToUse, key, messages, namespace)

      res.status(200).json({
        answer: qaChain.text,
        sources: qaChain.sourceDocuments
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Something went wrong with the chain' });
    }
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      res.status(500).json({ error: error.message || 'Something went wrong with OpenAI' });
    } else {
      res.status(500).json({ error: 'Something just went wrong' });
    }
  }
};
