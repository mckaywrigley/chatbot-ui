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
    const newMessage = body['message'] as Message;
    const conversationId: string = body['conversation_id'];
    if (newMessage && conversationId) {
      return await rdbmsCreateMessage(
        res,
        dataSource,
        user,
        newMessage,
        conversationId,
      );
    } else {
      return res
        .status(400)
        .json({ error: 'No message or conversationId provided' });
    }
  }
  if (req.method === 'PUT') {
    const updatedMessage = body['message'] as Message;
    const conversationId: string = body['conversation_id'];
    if (updatedMessage && conversationId) {
      return await rdbmsUpdateMessage(
        res,
        dataSource,
        user,
        updatedMessage,
        conversationId,
      );
    } else {
      return res
        .status(400)
        .json({ error: 'No message or conversationId provided' });
    }
  } else if (req.method === 'DELETE') {
    const messageId: string = body['message_id'];
    if (messageId) {
      return await rdbmsDeleteMessage(res, dataSource, user, messageId);
    } else {
      await dataSource.destroy();
      return res.status(400).json({ error: 'No message_id provided' });
    }
  } else {
    await dataSource.destroy();
    return res.status(400).json({ error: 'Method not supported' });
  }
};

const rdbmsCreateMessage = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  newMessage: Message,
  conversationId: string,
) => {
  const conversationRepo = dataSource.getRepository(RDBMSConversation);
  const messageRepo = dataSource.getRepository(RDBMSMessage);
  const rdbmsConversation = await conversationRepo.findOneBy({
    user: { id: user.id },
    id: conversationId,
  });

  if (rdbmsConversation !== null) {
    const rdbmsMessage = new RDBMSMessage();

    rdbmsMessage.user = user;
    rdbmsMessage.id = newMessage.id;
    rdbmsMessage.role = newMessage.role;
    rdbmsMessage.content = newMessage.content;
    rdbmsMessage.conversation = rdbmsConversation;

    await messageRepo.save(rdbmsMessage);
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

const rdbmsUpdateMessage = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  updatedMessage: Message,
  conversationId: string,
) => {
  const messageRepo = dataSource.getRepository(RDBMSMessage);
  const rdbmsMessage = await messageRepo.findOneBy({
    user: { id: user.id },
    id: updatedMessage.id,
    conversation: { id: conversationId },
  });

  if (rdbmsMessage) {
    rdbmsMessage.content = updatedMessage.content;
    await messageRepo.save(rdbmsMessage);
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

const rdbmsDeleteMessage = async (
  res: NextApiResponse,
  dataSource: DataSource,
  user: RDBMSUser,
  messageId: string,
) => {
  const messageRepo = dataSource.getRepository(RDBMSMessage);
  const deletedMessage = await messageRepo.findOneBy({
    user: { id: user.id },
    id: messageId,
  });

  if (deletedMessage !== null) {
    await messageRepo.remove(deletedMessage);

    await dataSource.destroy();
    return res.status(200).json({
      OK: true,
    });
  }

  await dataSource.destroy();
  return res.status(500).send({ error: 'Message not found' });
};

export default handler;
