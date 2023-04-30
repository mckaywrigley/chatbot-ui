import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import { getDataSource, getUser } from '../../../utils/server/rdbms';
import { NEXT_PUBLIC_NEXTAUTH_ENABLED } from '@/utils/app/const';

import {
  RDBMSConversation,
  RDBMSMessage,
  RDBMSUser,
} from '../../../types/rdbms';
import { Message } from '@/types/chat';

import { authOptions } from '../auth/[...nextauth]';

import { DataSource, In } from 'typeorm';

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
    const messages = body['messages'] as Message[];
    const conversationId: string = body['conversation_id'];
    if (messages) {
      return await rdbmsCreateMessages(
        res,
        dataSource,
        user,
        messages,
        conversationId,
      );
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No messages provided' });
    }
  } else if (req.method === 'PUT') {
    if (body) {
      const messages: Message[] = body;
      if (messages) {
        return await rdbmsUpdateMessages(res, dataSource, user, messages);
      } else {
        return res
          .status(400)
          .json({ error: 'No messages or conversation_id provided' });
      }
    }
  } else if (req.method === 'DELETE') {
    const messageIds: string[] = body['message_ids'];
    if (messageIds) {
      return await rdbmsDeleteMessages(res, dataSource, user, messageIds);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No message_id provided' });
    }
  } else {
    await dataSource.destroy();
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsCreateMessages = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  messages: Message[],
  conversationId: string,
) => {
  const conversationRepo = dataSource.getRepository(RDBMSConversation);
  const messageRepo = dataSource.getRepository(RDBMSMessage);
  const rdbmsConversation = await conversationRepo.findOneBy({
    user: { id: user.id },
    id: conversationId,
  });

  const newRdbmsMessages: RDBMSMessage[] = [];

  if (rdbmsConversation !== null) {
    for (const message of messages) {
      const rdbmsMessage = new RDBMSMessage();

      rdbmsMessage.user = user;
      rdbmsMessage.id = message.id;
      rdbmsMessage.role = message.role;
      rdbmsMessage.content = message.content;
      rdbmsMessage.conversation = rdbmsConversation;

      newRdbmsMessages.push(rdbmsMessage);
    }

    await messageRepo.save(newRdbmsMessages);
    await dataSource.destroy();
    return res.status(200).json({
      OK: true,
    });
  }

  await dataSource.destroy();
  return res.status(500).send({
    error: 'Conversation not found',
  });
};

const rdbmsUpdateMessages = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  messages: Message[],
) => {
  const messageRepo = dataSource.getRepository(RDBMSMessage);

  const updatedRdbmsMessages: RDBMSMessage[] = [];

  for (const message of messages) {
    const rdbmsMessage = new RDBMSMessage();

    rdbmsMessage.user = user;
    rdbmsMessage.id = message.id;
    rdbmsMessage.role = message.role;
    rdbmsMessage.content = message.content;

    updatedRdbmsMessages.push(rdbmsMessage);
  }

  await messageRepo.save(updatedRdbmsMessages);
  await dataSource.destroy();
  return res.status(200).json({
    OK: true,
  });
};

const rdbmsDeleteMessages = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  messageIds: string[],
) => {
  const messageRepo = dataSource.getRepository(RDBMSMessage);
  const deletedMessages = await messageRepo.findBy({
    user: { id: user.id },
    id: In(messageIds),
  });

  if (deletedMessages.length > 0) {
    await messageRepo.remove(deletedMessages);

    await dataSource.destroy();
    return res.status(200).json({
      OK: true,
    });
  }

  await dataSource.destroy();
  return res.status(500).send({ error: 'Messages not found' });
};

export default handler;
