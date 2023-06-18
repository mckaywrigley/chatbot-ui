import {LLAMA_API_HOST, OPENAI_API_HOST, OPENAI_API_VERSION, OPENAI_ORGANIZATION} from '@/utils/app/const';

import {OpenAIModel, OpenAIModelID, OpenAIModels} from '@/types/openai';

export const config = {
  runtime: 'edge',
};

type Model = {
  id?: string
  model?: string
  url?: string
  owned_by?: string
}

async function getModels(url: string, type: 'openai' | 'azure' | 'llama', apiKey: string): Promise<Model[]> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(type === 'openai' && {
        Authorization: `Bearer ${apiKey ? apiKey : process.env.OPENAI_API_KEY}`
      }),
      ...(type === 'azure' && {
        'api-key': `${apiKey ? apiKey : process.env.OPENAI_API_KEY}`
      }),
      ...((type === 'openai' && OPENAI_ORGANIZATION) && {
        'OpenAI-Organization': OPENAI_ORGANIZATION,
      }),
    },
  });

  if (response.status === 401) {
    console.error(`${type} API authentication error ${response.status}: ${await response.text()}`);
    throw new Error('OpenAI API returned an error');
  } else if (response.status !== 200) {
    console.error(`${type} API returned an error ${response.status}: ${await response.text()}`);
    throw new Error('OpenAI API returned an error');
  }

  const data = (await response.json())?.data
  // console.log('data', data)

  return data;
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const { key: apiKey } = (await req.json()) as { key: string; };

    const modelsFromApi = (await Promise.all([
      getModels(`${OPENAI_API_HOST}/v1/models`, 'openai', apiKey).catch(() => []),
      getModels(`${OPENAI_API_HOST}/openai/deployments?api-version=${OPENAI_API_VERSION}`, 'azure', apiKey).catch(() => []),
      getModels(`${LLAMA_API_HOST}/v1/models`, 'llama', apiKey).catch(() => []),
    ])).flat(1);

    const models = modelsFromApi.map(model => {
      const model_id = (model.model || model.id) as OpenAIModelID;
      const model_name = model_id.match(/\/models\/([a-zA-Z0-9-]+)\./)?.[1] || 'any-llama';
      const isOpenAIModel = model.owned_by?.match(/openai/i);

      return isOpenAIModel
        ? OpenAIModels[model_id]
        : OpenAIModels[model_id] || {...OpenAIModels[OpenAIModelID.ANY_LLAMA], name: model_name, id: model_id} as OpenAIModel
    }).filter(Boolean);

    console.log('models', models);

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
