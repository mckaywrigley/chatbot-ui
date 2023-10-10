import { MODEL_API_HOST, MODEL_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '@/utils/app/const';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  if (MODEL_API_TYPE === 'query_cortex') {
    try {
      const {key} = (await req.json()) as {
        key: string;
      };

      let url = `${MODEL_API_HOST}/user_roles`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        return new Response(response.body, {
          status: 500,
          headers: response.headers,
        });
      } else if (response.status !== 200) {
        console.error(
            `API returned an error ${
                response.status
            }: ${await response.text()}`,
        );
        throw new Error('The API returned an error');
      }

      const json = await response.json();
      const userRoles = json.roles

      return new Response(JSON.stringify(userRoles), {status: 200});
    } catch (error) {
      console.error(error);
      return new Response('Error', {status: 500});
    }
  } else {
    return new Response('[]', {status: 200});
  }
};

export default handler;
