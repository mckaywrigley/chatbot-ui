import { NextApiRequest, NextApiResponse } from 'next';

import {
  RDBMSConversation,
  RDBMSMessage,
  RDBMSUser,
} from '../../../types/rdbms';

import { getDataSource } from './dataSource';

import { Message } from 'postcss';
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
  } else if (req.method === 'DELETE') {
    const messageId: string = body['message_id'];
    if (messageId !== undefined) {
      return await rdbmsDeleteMessage(res, dataSource, user, messageId);
    } else {
      return res.status(400).json({ error: 'No message_id provided' });
    }
  } else {
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
    user: user,
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
    return res.status(200).json({
      OK: true,
    });
  }

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
    user: user,
    id: messageId,
  });

  if (deletedMessage !== null) {
    await messageRepo.remove(deletedMessage);

    return res.status(200).json({
      OK: true,
    });
  }

  return res.status(500).send({ error: 'Message not found' });
};

export default handler;
