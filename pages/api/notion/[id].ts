import { NextRequest } from 'next/server';

import { Client } from '@notionhq/client';
import { NotionCompatAPI } from 'notion-compat';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Error', {
      status: 405,
      statusText: 'Method not allowed',
    });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return new Response('Missing id', {
      status: 400,
      statusText: 'Missing id',
    });
  }

  const api = new NotionCompatAPI(
    new Client({ auth: process.env.NOTION_SECRET_KEY }),
  );
  try {
    const recordMap = await api.getPage(id as string);

    return new Response(JSON.stringify({ recordMap }), {
      status: 200,
      statusText: 'OK',
    });
  } catch (error) {
    console.error(error);
    return new Response('Internal server error', {
      status: 500,
      statusText: 'Internal server error',
    });
  }
}
