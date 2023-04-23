import { NextApiRequest, NextApiResponse } from 'next';

import { RDBMSFolder, RDBMSPrompt, RDBMSUser } from '../../../types/rdbms';
import { Prompt } from '@/types/prompt';

import { getDataSource } from './dataSource';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // TODO get user from bearer token

  const user = new RDBMSUser();
  user.user_id = 'test_user';

  let body;
  if (req.body !== '') {
    body = JSON.parse(req.body);
  }

  if (req.method === 'POST') {
    const newPrompt = body;
    console.log(newPrompt);
    if (newPrompt !== null) {
      return await rdbmsCreatePrompt(res, user, newPrompt);
    } else {
      return res.status(400).json({ error: 'No prompt provided' });
    }
  } else if (req.method === 'PUT') {
    const updatedPrompt = body;
    if (updatedPrompt !== null) {
      return await rdbmsUpdatePrompt(res, user, updatedPrompt);
    } else {
      return res.status(400).json({ error: 'No prompt provided' });
    }
  } else if (req.method === 'DELETE') {
    const promptId = body['prompt_id'];
    if (promptId !== undefined) {
      return await rdbmsDeletePrompt(res, user, promptId);
    } else {
      return res.status(400).json({ error: 'No prompt_id provided' });
    }
  } else {
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsCreatePrompt = async (
  res: NextApiResponse,
  user: RDBMSUser,
  prompt: Prompt,
) => {
  const dataSource = await getDataSource();
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

  return res.status(200).json({
    OK: true,
  });
};

const rdbmsUpdatePrompt = async (
  res: NextApiResponse,
  user: RDBMSUser,
  prompt: Prompt,
) => {
  const dataSource = await getDataSource();
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

  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeletePrompt = async (
  res: NextApiResponse,
  user: RDBMSUser,
  promptId: string,
) => {
  const dataSource = await getDataSource();
  const promptRepo = dataSource.getRepository(RDBMSPrompt);
  const deletedPrompt = await promptRepo.findOneBy({
    user: user,
    id: promptId,
  });

  if (deletedPrompt !== null) {
    await promptRepo.remove(deletedPrompt);
  }

  return res.status(200).json({
    OK: true,
  });
};

export default handler;
