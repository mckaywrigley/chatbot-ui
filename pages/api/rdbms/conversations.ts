import { NextApiRequest, NextApiResponse } from 'next';

import {
  RDBMSConversation,
  RDBMSFolder,
  RDBMSMessage,
  RDBMSUser,
} from '../../../types/rdbms';
import type { Role } from '@/types/chat';
import { Conversation, Message } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import { getDataSource } from './dataSource';

import { DataSource } from 'typeorm';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // TODO get user from bearer token

  const user = new RDBMSUser();
  user.user_id = 'test_user';

  let body: any | null = null;
  if (req.body !== '') {
    body = JSON.parse(req.body);
  }

  const dataSource = await getDataSource();

  if (req.method === 'POST') {
    return await rdbmsGetAllConversations(res, dataSource, user);
  } else if (req.method === 'PUT') {
    const updatedConversations = body;
    if (updatedConversations !== undefined) {
      return await rdbmsUpdateConversations(
        res,
        dataSource,
        user,
        updatedConversations,
      );
    } else {
      return res.status(400).json({ error: 'No conversations provided' });
    }
  } else if (req.method === 'DELETE') {
    return await rdbmsDeleteAllConversations(res, dataSource, user);
  } else {
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsGetAllConversations = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
) => {
  const conversationRepo = dataSource.getRepository(RDBMSConversation);
  const messageRepo = dataSource.getRepository(RDBMSMessage);
  const rdbmsConversations = await conversationRepo.find({
    where: { user: user },
    relations: ['folder'],
  });

  const conversations: Conversation[] = [];

  for (const rdbmsConversation of rdbmsConversations) {
    const model_id = rdbmsConversation.model_id as keyof typeof OpenAIModelID;

    const model = (OpenAIModels as any)[model_id];

    const rdbmsMessages = await messageRepo.find({
      where: {
        user: user,
        conversation: { id: rdbmsConversation.id },
      },
      order: { timestamp: { direction: 'ASC' } },
    });

    const messages: Message[] = [];
    rdbmsMessages.forEach((rdbmsMessage) => {
      let message: Message = {
        id: rdbmsMessage.id,
        content: rdbmsMessage.content,
        role: rdbmsMessage.role as Role,
      };
      messages.push(message);
    });

    let conversation: Conversation = {
      id: rdbmsConversation.id,
      name: rdbmsConversation.name,
      model: model,
      messages: messages,
      folderId:
        rdbmsConversation.folder !== null ? rdbmsConversation.folder.id : null,
      prompt: rdbmsConversation.prompt,
      temperature: rdbmsConversation.temperature,
    };

    conversations.push(conversation);
  }
  return res.status(200).json(conversations);
};

const rdbmsUpdateConversations = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  updatedConversations: Conversation[],
) => {
  const rdbmsConversations: RDBMSConversation[] = [];
  const folderRepo = dataSource.getRepository(RDBMSFolder);

  for (const conversation of updatedConversations) {
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

    rdbmsConversations.push(rdbmsConversation);
  }

  await dataSource.manager.save(rdbmsConversations);
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeleteAllConversations = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
) => {
  const conversationRepo = dataSource.getRepository(RDBMSConversation);

  const deletedConversations = await conversationRepo.findBy({
    user: user,
  });

  await conversationRepo.remove(deletedConversations);

  return res.status(200).json({
    OK: true,
  });
};

export default handler;
