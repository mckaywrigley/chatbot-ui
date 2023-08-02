import prisma from '@/lib/prismadb';
import * as bcrypt from 'bcrypt';

interface RequestBody {
  name: string;
  email: string;
  password: string;
}

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const body = (await req.json()) as RequestBody;
    console.log('body', body);

    const user = await prisma.user.create({
      data: {
        name: body?.name,
        email: body?.email,
        password: await bcrypt.hash(body?.password, 10)
      }
    });
    console.log('user', user);
    const { password, ...result } = user;
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}

export default handler;