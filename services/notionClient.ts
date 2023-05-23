import { ChatEverywhereNews } from '@/types/notion';

import { Client } from '@notionhq/client';
import { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';

class NotionClient {
  private client: Client;
  private newsDatabaseID: string;

  constructor() {
    this.newsDatabaseID = process.env.NOTION_NEWS_DATABASE_ID as string;
    const notionKey = process.env.NOTION_SECRET_KEY as string;
    this.client = new Client({ auth: notionKey });
  }

  async getNewsList(
    startCursor?: string,
  ): Promise<{ newsList: ChatEverywhereNews[]; nextCursor: string | null }> {
    const query = {
      database_id: this.newsDatabaseID,
      page_size: 15,
      sorts: [
        {
          property: 'Created time',
          direction: 'descending',
        },
      ],
    } as QueryDatabaseParameters;

    if (startCursor) {
      query.start_cursor = startCursor;
    }
    const response = await this.client.databases.query(query);
    const results = response.results;

    return {
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
  }
}

export default NotionClient;
