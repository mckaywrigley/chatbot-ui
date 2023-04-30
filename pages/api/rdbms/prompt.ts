import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { getDataSource, getUser } from '../../../utils/server/rdbms';
import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import { RDBMSFolder, RDBMSPrompt, RDBMSUser } from '../../../types/rdbms';
import { Prompt } from '@/types/prompt';

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
      return await rdbmsCreatePrompt(res, dataSource, user, newPrompt);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No prompt provided' });
    }
  } else if (req.method === 'PUT') {
    const updatedPrompt = body;
    if (updatedPrompt !== null) {
      return await rdbmsUpdatePrompt(res, dataSource, user, updatedPrompt);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No prompt provided' });
    }
  } else if (req.method === 'DELETE') {
    const promptId = body['prompt_id'];
    if (promptId !== undefined) {
      return await rdbmsDeletePrompt(res, dataSource, user, promptId);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No prompt_id provided' });
    }
  } else {
    await dataSource.destroy();
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsCreatePrompt = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  prompt: Prompt,
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const promptRepo = dataSource.getRepository(RDBMSPrompt);

  const rdbmsPrompt = new RDBMSPrompt();

  rdbmsPrompt.id = prompt.id;
  rdbmsPrompt.user = user;
  rdbmsPrompt.name = prompt.name;
  rdbmsPrompt.description = prompt.description;
  rdbmsPrompt.content = prompt.content;
  rdbmsPrompt.model_id = prompt.model.id;

  if (prompt.folderId !== null) {
    const updatedFolder = await folderRepo.findOneBy({
      id: prompt.folderId,
    });

    if (updatedFolder !== null) {
      rdbmsPrompt.folder = updatedFolder;
    }
  } else {
    rdbmsPrompt.folder = null;
  }

  await promptRepo.save(rdbmsPrompt);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsUpdatePrompt = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  prompt: Prompt,
) => {
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const promptRepo = dataSource.getRepository(RDBMSPrompt);

  const rdbmsPrompt = new RDBMSPrompt();

  rdbmsPrompt.id = prompt.id;
  rdbmsPrompt.user = user;
  rdbmsPrompt.name = prompt.name;
  rdbmsPrompt.description = prompt.description;
  rdbmsPrompt.content = prompt.content;
  rdbmsPrompt.model_id = prompt.model.id;

  if (prompt.folderId !== null) {
    const updatedFolder = await folderRepo.findOneBy({
      id: prompt.folderId,
    });

    if (updatedFolder !== null) {
      rdbmsPrompt.folder = updatedFolder;
    }
  } else {
    rdbmsPrompt.folder = null;
  }

  await promptRepo.save(rdbmsPrompt);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeletePrompt = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  promptId: string,
) => {
  const promptRepo = dataSource.getRepository(RDBMSPrompt);
  const deletedPrompt = await promptRepo.findOneBy({
    user: { id: user.id },
    id: promptId,
  });

  if (deletedPrompt !== null) {
    await promptRepo.remove(deletedPrompt);
  }

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

export default handler;
