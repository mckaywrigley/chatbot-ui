import { NextApiRequest, NextApiResponse } from 'next';

import {
  RDBMSConversation,
  RDBMSMessage,
  RDBMSUser,
} from '../../../types/rdbms';
import { Message } from '@/types/chat';

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
    user: user,
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
      user: user,
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
