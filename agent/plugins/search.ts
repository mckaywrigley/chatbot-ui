import { Plugin } from '@/types/agent';
import { GoogleSource } from '@/types/google';

import { ToolExecutionContext } from './executor';

export default {
  nameForModel: 'Search',
  nameForHuman: 'Search',
  descriptionForHuman: 'useful for when you need to ask with search.',
  descriptionForModel: 'useful for when you need to ask with search.',
  execute: async (
    context: ToolExecutionContext,
    query: string,
  ): Promise<string> => {
    const locale = context.locale;
    const encodedQuery = encodeURIComponent(query);
    const uri = `http://${locale}.wikipedia.org/w/api.php?format=json&action=query&list=search&prop=revisions&rvprop=content&srsearch=${encodedQuery}`;
    const response = await fetch(uri);
    const result = await response.json();
    if (result.query.search.length === 0) {
      return 'No Result';
    }
    const texts = [];
    for (let key in result.query.search) {
      if (result.query.search[key].missing !== undefined) {
        continue;
      }
      const text = result.query.search[key].snippet;
      texts.push(text);
    }
    return texts.join('\n').slice(2000) || 'No Result';
  },
} as Plugin;
