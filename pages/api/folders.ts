import { FolderInterface } from '@/types/folder';
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
    const response = await getRequest('folders');
    const json = await response.json();
    const folders: FolderInterface[] = json?.data?.map(({ id, name, type }: FolderInterface) => ({ id, name, type })) || [];

    return new Response(JSON.stringify(folders), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

const post = async (req: Request): Promise<Response> => {
  const data: FolderInterface[] = await req.json();
  let rev: string | null = null;

  try {
    const getFolders = await getRequest('folders');
    ({ _rev: rev } = await getFolders.json());

    const response = await putRequest('folders', JSON.stringify({ _id: 'folders', _rev: rev, data }));

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
