import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { getDataSource, getUser } from '../../../utils/server/rdbms';
import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import {
  RDBMSConversation,
  RDBMSFolder,
  RDBMSMessage,
  RDBMSUser,
} from '../../../types/rdbms';
import type { Role } from '@/types/chat';
import { Conversation, Message } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

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
      await dataSource.destroy();
      return res.status(400).json({ error: 'No conversations provided' });
    }
  } else if (req.method === 'DELETE') {
    return await rdbmsDeleteAllConversations(res, dataSource, user);
  } else {
    await dataSource.destroy();
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
    where: {
      user: { id: user.id },
    },
    order: { creation_time: { direction: 'ASC' } },
    relations: ['folder'],
  });

  const conversations: Conversation[] = [];

  for (const rdbmsConversation of rdbmsConversations) {
    const model_id = rdbmsConversation.model_id as keyof typeof OpenAIModelID;

    const model = (OpenAIModels as any)[model_id];

    const rdbmsMessages = await messageRepo.find({
      where: {
        user: { id: user.id },
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

  await dataSource.destroy();
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

  await dataSource.destroy();
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
    user: { id: user.id },
  });

  await conversationRepo.remove(deletedConversations);

  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

export default handler;
