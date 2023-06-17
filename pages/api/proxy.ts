export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { url } = await req.json();

    const response = await fetch(url);

    return response;
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};
export default handler;
