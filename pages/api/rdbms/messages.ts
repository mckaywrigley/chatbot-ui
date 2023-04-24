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
    const messages = body['messages'] as Message[];
    const conversationId: string = body['conversation_id'];
    if (messages !== null) {
      return await rdbmsCreateMessages(
        res,
        dataSource,
        user,
        messages,
        conversationId,
      );
    } else {
      return res.status(400).json({ error: 'No messages provided' });
    }
  } else if (req.method === 'DELETE') {
    const messageId: string[] = body['message_ids'];
    if (messageId !== undefined) {
      return await rdbmsDeleteMessages(res, dataSource, user, messageId);
    } else {
      return res.status(400).json({ error: 'No message_id provided' });
    }
  } else {
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
    return res.status(200).json({
      OK: true,
    });
  }

  return res.status(500).send({
    error: 'Conversation not found',
  });
};

const rdbmsDeleteMessages = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  messageIds: string[],
) => {
  const messageRepo = dataSource.getRepository(RDBMSMessage);

  const deletedMessages: RDBMSMessage[] = [];
  for (const messageId of messageIds) {
    const deletedMessage = await messageRepo.findOneBy({
      user: { id: user.id },
      id: messageId,
    });
    if (deletedMessage !== null) {
      deletedMessages.push(deletedMessage);
    }
  }

  if (deletedMessages.length > 0) {
    await messageRepo.remove(deletedMessages);

    return res.status(200).json({
      OK: true,
    });
  }

  return res.status(500).send({ error: 'Messages not found' });
};

export default handler;
