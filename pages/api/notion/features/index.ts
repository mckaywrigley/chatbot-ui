import { NextRequest } from 'next/server';

import { ChatEverywhereFeatures } from '@/types/notion';

import { Client } from '@notionhq/client';
import { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';

const featuresDatabaseID = process.env.NOTION_FEATURES_DATABASE_ID as string;
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

  const url = new URL(req.nextUrl);
  const { lang } = Object.fromEntries(url.searchParams.entries());

  const databaseQuery = {
    database_id: featuresDatabaseID,
    sorts: [
      {
        property: 'Tier',
        direction: 'ascending',
      },
    ],
    filter: {
      property: 'Status',
      status: {
        equals: lang === 'zh' ? 'Published-zh' : 'Published',
      },
    },
  } as unknown as QueryDatabaseParameters;

  try {
    const response = await client.databases.query(databaseQuery);
    const results = response.results;

    const responsePayload = {
      featuresList: results
        .map((page) => {
          const hasProperties = 'properties' in page;
          const hasName =
            hasProperties &&
            'Name' in page.properties &&
            'title' in page.properties.Name;
          const hasTier =
            hasProperties &&
            'Tier' in page.properties &&
            'multi_select' in page.properties.Tier;

          if (hasProperties && hasName && hasTier) {
            return {
              id: page.id,
              title: (page.properties.Name as any).title[0].plain_text,
              lastEditedTime: page.last_edited_time,
              tier: (page.properties.Tier as any).multi_select.map(
                (tier: any) => tier.name,
              ),
            };
          }
          return null;
        })
        .filter((page) => page !== null) as ChatEverywhereFeatures[],
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
