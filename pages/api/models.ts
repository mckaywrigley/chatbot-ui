import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types';

export const config = {
  runtime: 'edge',
};

export async function getModels(key: string): Promise<OpenAIModel[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`,
    },
  });

  const json = await response.json();

  const models: OpenAIModel[] = json.data
    .map((model: any) => {
      for (const [key, value] of Object.entries(OpenAIModelID)) {
        if (value === model.id) {
          return {
            id: model.id,
            name: OpenAIModels[value].name,
          };
        }
      }
    })
    .filter(Boolean);
  return models;
}

const handler = async (req: Request): Promise<Response> => {
  try {
    const { key } = (await req.json()) as {
      key: string;
    };
    const models = await getModels(key);
    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
