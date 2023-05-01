import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { getDataSource, getUser } from '../../../utils/server/rdbms';
import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import { RDBMSSystemPrompt, RDBMSUser } from '../../../types/rdbms';
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

  let body;
  if (req.body !== '') {
    body = JSON.parse(req.body);
  }

  if (req.method === 'POST') {
    const newPrompt = body;
    if (newPrompt !== null) {
      return await rdbmsCreateSystemPrompt(res, dataSource, user, newPrompt);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No system prompt provided' });
    }
  } else if (req.method === 'PUT') {
    const updatedSystemPrompt = body;
    if (updatedSystemPrompt !== null) {
      return await rdbmsUpdateSystemPrompt(
        res,
        dataSource,
        user,
        updatedSystemPrompt,
      );
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No system prompt provided' });
    }
  } else if (req.method === 'DELETE') {
    const systemPromptId = body['system_prompt_id'];
    if (systemPromptId !== undefined) {
      return await rdbmsDeleteSystemPrompt(
        res,
        dataSource,
        user,
        systemPromptId,
      );
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No system_prompt_id provided' });
    }
  } else {
    await dataSource.destroy();
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsCreateSystemPrompt = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  systemPrompt: SystemPrompt,
) => {
  const systemPromptRepo = dataSource.getRepository(RDBMSSystemPrompt);

  const rdbmsSystemPrompt = new RDBMSSystemPrompt();

  rdbmsSystemPrompt.id = systemPrompt.id;
  rdbmsSystemPrompt.user = user;
  rdbmsSystemPrompt.name = systemPrompt.name;
  rdbmsSystemPrompt.content = systemPrompt.content;

  await systemPromptRepo.save(rdbmsSystemPrompt);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsUpdateSystemPrompt = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  systemPrompt: SystemPrompt,
) => {
  const systemPrompRepo = dataSource.getRepository(RDBMSSystemPrompt);

  const rdbmsSystemPrompt = new RDBMSSystemPrompt();

  rdbmsSystemPrompt.id = systemPrompt.id;
  rdbmsSystemPrompt.user = user;
  rdbmsSystemPrompt.name = systemPrompt.name;
  rdbmsSystemPrompt.content = systemPrompt.content;

  await systemPrompRepo.save(rdbmsSystemPrompt);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeleteSystemPrompt = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  systemPromptId: string,
) => {
  const systemPromptRepo = dataSource.getRepository(RDBMSSystemPrompt);
  const deletedSystemPrompt = await systemPromptRepo.findOneBy({
    user: { id: user.id },
    id: systemPromptId,
  });

  if (deletedSystemPrompt !== null) {
    await systemPromptRepo.remove(deletedSystemPrompt);
  }

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

export default handler;
