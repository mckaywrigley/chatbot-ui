import prisma from "@/lib/prismadb";
import * as bcrypt from 'bcrypt';

interface RequestBody {
  username: string;
  password: string;
}

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const body = (await req.json()) as RequestBody;
    console.log('body', body);

    const user = await prisma.user.findFirst({
      where: {
        email: body?.username,
      }
    });
    console.log('1 user', user)
    if (user && (await bcrypt.compare(body?.password, user.password))) {
      const { password, ...userWithoutPass } = user;
      console.log('2 user', user)
      return new Response(JSON.stringify(userWithoutPass), { status: 200 });
    } else return new Response(JSON.stringify(null), { status: 500 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;