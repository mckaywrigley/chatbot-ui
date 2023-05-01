import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { getDataSource, getUser } from '../../../utils/server/rdbms';
import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import { RDBMSSystemPrompt, RDBMSUser } from '../../../types/rdbms';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { SystemPrompt } from '@/types/systemPrompt';

import { authOptions } from '../auth/[...nextauth]';

import { DataSource } from 'typeorm';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  let userId = '';
  if (NEXT_PUBLIC_NEXTAUTH_ENABLED) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'User is not authenticated' });
    } else if (!session.user) {
      return res.status(401).json({ error: 'User is not authenticated' });
    } else if (!session.user.email) {
      return res
        .status(401)
        .json({ error: 'User does not have an email address' });
    }
    userId = session.user.email;
  } else {
    userId = 'test_user';
  }

  const dataSource = await getDataSource();
  const user = await getUser(dataSource, userId);

  let body: any | null = null;
  if (req.body !== '') {
    body = JSON.parse(req.body);
  }

  if (req.method === 'POST') {
    return await rdbmsGetSystemPrompts(res, dataSource, user);
  } else if (req.method === 'PUT') {
    const updatedPrompts = body;
    if (body !== null) {
      return await rdbmsUpdateAllPrompts(res, dataSource, user, updatedPrompts);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No Prompts provided' });
    }
  } else if (req.method === 'DELETE') {
    return await rdbmsDeleteAllPrompts(res, dataSource, user);
  } else {
    await dataSource.destroy();
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsGetSystemPrompts = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
) => {
  const systemPromptRepo = dataSource.getRepository(RDBMSSystemPrompt);
  const rdbmsSystemPrompts = await systemPromptRepo.find({
    where: {
      user: { id: user.id },
    },
  });

  const systemPrompts: SystemPrompt[] = [];

  for (const rdbmsSystemPrompt of rdbmsSystemPrompts) {
    let systemPrompt: SystemPrompt = {
      id: rdbmsSystemPrompt.id,
      name: rdbmsSystemPrompt.name,
      content: rdbmsSystemPrompt.content,
    };

    systemPrompts.push(systemPrompt);
  }
  await dataSource.destroy();
  return res.status(200).json(systemPrompts);
};

const rdbmsUpdateAllPrompts = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  updatedSystemPrompts: SystemPrompt[],
) => {
  const rdbmsSystemPrompts: RDBMSSystemPrompt[] = [];
  const systemPromptRepo = dataSource.getRepository(RDBMSSystemPrompt);

  for (const systemPrompt of updatedSystemPrompts) {
    const rdbmsSystemPrompt = new RDBMSSystemPrompt();

    rdbmsSystemPrompt.user = user;
    rdbmsSystemPrompt.id = systemPrompt.id;
    rdbmsSystemPrompt.name = systemPrompt.name;
    rdbmsSystemPrompt.content = systemPrompt.content;

    rdbmsSystemPrompts.push(rdbmsSystemPrompt);
  }

  await systemPromptRepo.save(rdbmsSystemPrompts);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeleteAllPrompts = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
) => {
  const systemPromptRepo = dataSource.getRepository(RDBMSSystemPrompt);

  const deletedSystemPrompts = await systemPromptRepo.findBy({
    user: { id: user.id },
  });

  await systemPromptRepo.remove(deletedSystemPrompts);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

export default handler;
