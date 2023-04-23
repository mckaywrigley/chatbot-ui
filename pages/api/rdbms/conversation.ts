import { NextApiRequest, NextApiResponse } from 'next';

import {
  RDBMSConversation,
  RDBMSFolder,
  RDBMSUser,
} from '../../../types/rdbms';
import { Conversation } from '@/types/chat';

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
    const newConversation = body;
    if (newConversation !== null) {
      return await rdbmsCreateConversation(res, user, newConversation);
    } else {
      return res.status(400).json({ error: 'No conversation provided' });
    }
  } else if (req.method === 'PUT') {
    const updatedConversation = body;
    if (updatedConversation !== null) {
      return await rdbmsUpdateConversation(res, user, updatedConversation);
    } else {
      return res.status(400).json({ error: 'No conversation provided' });
    }
  } else if (req.method === 'DELETE') {
    const conversationId = body['conversation_id'];
    if (conversationId !== undefined) {
      return await rdbmsDeleteConversation(res, user, conversationId);
    } else {
      return res.status(400).json({ error: 'No conversation_id provided' });
    }
  } else {
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsCreateConversation = async (
  res: NextApiResponse,
  user: RDBMSUser,
  conversation: Conversation,
) => {
  const dataSource = await getDataSource();
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const conversationRepo = dataSource.getRepository(RDBMSConversation);

  const rdbmsConversation = new RDBMSConversation();

  rdbmsConversation.user = user;
  rdbmsConversation.id = conversation.id;
  rdbmsConversation.name = conversation.name;
  rdbmsConversation.model_id = conversation.model.id;
  rdbmsConversation.prompt = conversation.prompt;
  rdbmsConversation.temperature = conversation.temperature;

  if (conversation.folderId !== null) {
    const updatedFolder = await folderRepo.findOneBy({
      id: conversation.folderId,
    });

    if (updatedFolder !== null) {
      rdbmsConversation.folder = updatedFolder;
    }
  } else {
    rdbmsConversation.folder = null;
  }

  await conversationRepo.save(rdbmsConversation);

  return res.status(200).json({
    OK: true,
  });
};

const rdbmsUpdateConversation = async (
  res: NextApiResponse,
  user: RDBMSUser,
  conversation: Conversation,
) => {
  const dataSource = await getDataSource();
  const folderRepo = dataSource.getRepository(RDBMSFolder);
  const conversationRepo = dataSource.getRepository(RDBMSConversation);

  const rdbmsConversation = new RDBMSConversation();

  rdbmsConversation.user = user;
  rdbmsConversation.id = conversation.id;
  rdbmsConversation.name = conversation.name;
  rdbmsConversation.model_id = conversation.model.id;
  rdbmsConversation.prompt = conversation.prompt;
  rdbmsConversation.temperature = conversation.temperature;

  if (conversation.folderId !== null) {
    const updatedFolder = await folderRepo.findOneBy({
      id: conversation.folderId,
    });

    if (updatedFolder !== null) {
      rdbmsConversation.folder = updatedFolder;
    }
  } else {
    rdbmsConversation.folder = null;
  }

  await conversationRepo.save(rdbmsConversation);

  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeleteConversation = async (
  res: NextApiResponse,
  user: RDBMSUser,
  conversationId: string,
) => {
  const dataSource = await getDataSource();
  const conversationRepo = dataSource.getRepository(RDBMSConversation);
  const deletedConversation = await conversationRepo.findOneBy({
    user: user,
    id: conversationId,
  });

  if (deletedConversation !== null) {
    await conversationRepo.remove(deletedConversation);
  }

  return res.status(200).json({
    OK: true,
  });
};

export default handler;
