import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const models: OpenAIModel[] = Object.values(OpenAIModelID)
      .map((value: string) => ({
        id: value,
        name: OpenAIModels[value as OpenAIModelID].name,
        maxLength: OpenAIModels[value as OpenAIModelID].maxLength,
        tokenLimit: OpenAIModels[value as OpenAIModelID].tokenLimit,
      }));

    return new Response(JSON.stringify(models), {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=84600, immutable',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
