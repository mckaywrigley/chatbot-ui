import { NextApiRequest, NextApiResponse } from 'next';

import { findRelevantSections } from '@/services/embeddings';

import { Message } from '@/types/chat';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const messages = req.body as Message[];

  const userQuestion = messages.find((m) => m.role == 'user');
  if (userQuestion) {
    const context = await findRelevantSections(userQuestion?.content);

    // filter out embedding vector and similarity score
    return res
      .status(200)
      .json(context.map((doc) => ({ title: doc.title, content: doc.content })));
  }

  return res.status(200).json([]);
};

export default handler;
