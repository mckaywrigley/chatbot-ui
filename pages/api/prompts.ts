import { Prompt } from '@/types/prompt';
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
    const response = await getRequest('prompts');
    const json = await response.json();
    const prompts: Prompt[] = json?.data?.map(({id, name, description, content, model, folderId}: Prompt) => ({id, name, description, content, model, folderId})) || [];

    return new Response(JSON.stringify(prompts), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

const post = async (req: Request): Promise<Response> => {
  const data: Prompt[] = await req.json();
  let rev: string | null = null;

  try {
    const getFolders = await getRequest('prompts');
    ({ _rev: rev } = await getFolders.json());

    const response = await putRequest('prompts', JSON.stringify({ _id: 'prompts', _rev: rev, data }));

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
