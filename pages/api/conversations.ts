import { Conversation } from '@/types/chat';
import { getRequest, putRequest } from '../../utils/server/couchdb';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'POST') {
    return await post(req);
  } else {
    return await get(req);
  }
};

const get = async (req: Request): Promise<Response> => {
  try {
    const response = await getRequest('conversations');
    const json = await response.json();
    const conversations: Conversation[] = json?.data?.map(({id, name, messages, model, prompt, folderId}: Conversation) => ({id, name, messages, model, prompt, folderId})) || [];

    return new Response(JSON.stringify(conversations), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

const post = async (req: Request): Promise<Response> => {
  const data: Conversation[] = await req.json();
  let rev: string | null = null;

  try {
    const getConversations = await getRequest('conversations');
    ({ _rev: rev } = await getConversations.json());

    const response = await putRequest('conversations', JSON.stringify({ _id: 'conversations', _rev: rev, data }));

    if (response.ok) {
      return new Response(JSON.stringify({"ok": true}), { status: 200 });
    } else {
      console.log(await response.json());
      throw new Error(`Failed to update record ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
