import { NextRequest } from 'next/server';

import { ChatEverywhereNews } from '@/types/notion';

import { Client } from '@notionhq/client';
import { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';

const newsDatabaseID = process.env.NOTION_NEWS_DATABASE_ID as string;
const notionKey = process.env.NOTION_SECRET_KEY as string;
const client = new Client({ auth: notionKey });

export const config = {
  runtime: 'edge',
};

const handler = async (req: NextRequest): Promise<Response> => {
  if (req.method !== 'GET') {
    return new Response('Error', {
      status: 405,
      statusText: 'Method not allowed',
    });
  }

  const startCursor = req.nextUrl.searchParams.get('startCursor');

  const query = {
    database_id: newsDatabaseID,
    page_size: 15,
    sorts: [
      {
        property: 'Created time',
        direction: 'descending',
      },
    ],
    filter: {
      property: 'Status',
      status: {
        equals: 'Published',
      },
    },
  } as unknown as QueryDatabaseParameters;

  if (startCursor) {
    query.start_cursor = startCursor as string;
  }

  try {
    const response = await client.databases.query(query);
    const results = response.results;

    const responsePayload = {
      newsList: results
        .map((page) => {
          if (
            'properties' in page &&
            'Name' in page.properties &&
            'title' in page.properties.Name
          ) {
            return {
              id: page.id,
              title: page.properties.Name.title[0].plain_text,
              createdTime: page.created_time,
            };
          }
          return null;
        })
        .filter((page) => page !== null) as ChatEverywhereNews[],
      nextCursor: response.next_cursor,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('Error', {
      status: 500,
      statusText: 'Internal server error',
    });
  }
};

export default handler;
