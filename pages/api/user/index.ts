import prisma from '@/lib/prismadb';
import * as bcrypt from 'bcrypt';
import { NextApiRequest, NextApiResponse } from 'next';
import { IResponse } from '@/types/response';
import { withPrismaError } from '@/hooks/withPrismaError';

interface RequestBody {
  name: string;
  email: string;
  password: string;
}


const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  const body = req.body as RequestBody;
  const user = await prisma.user.create({
    data: {
      name: body?.name,
      email: body?.email,
      password: await bcrypt.hash(body?.password, 10)
    }
  });
  const { password, ...result } = user;
  res.status(200).json({
    success: true,
    message: '请求成功',
    data: result
  } as IResponse);
}

export default withPrismaError(handler);