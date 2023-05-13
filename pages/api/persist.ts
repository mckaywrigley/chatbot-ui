// POST and GET for KV store
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

const KEYS_TO_SYNC: string[] = [
  'conversation',
  'prompt',
  'folder',
  'conversationHistory',
  'selectedConversation',
  'prompts',
  'folders',
];

const syncLocalToKv = async (values: Record<string, string>): Promise<void> => {
  const lsAsObject: Record<string, string> = {};

  for (const key of KEYS_TO_SYNC) {
    const value = values[key];
    if (value) {
      lsAsObject[key] = value;
    }
  }

  await kv.mset(lsAsObject);
};

const syncKvToLocal = async (): Promise<Record<string, string>> => {
  const values: string[] = await kv.mget(...KEYS_TO_SYNC);
  let res: Record<string, string> = {};

  KEYS_TO_SYNC.forEach((key, index) => {
    const value = values[index];
    if (value) {
      res[key] = value;
    }
  });

  return res;
};

const handler = async (req: Request): Promise<Response> => {
  // set values in KV store with a POST
  if (req.method === 'POST') {
    const body = await req.json();
    await syncLocalToKv(body);
    return new Response('OK');
  }

  // get values from KV store with a GET
  if (req.method === 'GET') {
    const values = await syncKvToLocal();
    return new Response(JSON.stringify(values), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  return new Response('Method not allowed', { status: 405 });
};

export default handler;
