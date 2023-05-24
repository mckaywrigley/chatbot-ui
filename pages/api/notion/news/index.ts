import { NextApiRequest, NextApiResponse } from 'next';

import { ChatEverywhereNews } from '@/types/notion';

import { Client } from '@notionhq/client';
import { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';

const newsDatabaseID = process.env.NOTION_NEWS_DATABASE_ID as string;
const notionKey = process.env.NOTION_SECRET_KEY as string;
const client = new Client({ auth: notionKey });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { startCursor } = req.query;
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
  } as QueryDatabaseParameters;

  if (startCursor) {
    query.start_cursor = startCursor as string;
  }

  try {
    const response = await client.databases.query(query);
    const results = response.results;

    res.status(200).json({
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
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
