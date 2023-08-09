import prisma from "@/lib/prismadb";
import { NextApiRequest, NextApiResponse } from 'next';
import * as bcrypt from 'bcrypt';
import { signJwtAccessToken } from "@/lib/jwt";

interface RequestBody {
  username: string;
  password: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  try {
    const body = req.body as RequestBody;
    const user = await prisma.user.findFirst({
      where: {
        email: body?.username,
      }
    });
    if (user && (await bcrypt.compare(body?.password, user.password))) {
      const { password, ...userWithoutPass } = user;
      const accessToken = signJwtAccessToken(userWithoutPass);
      const result = {
        ...userWithoutPass,
        accessToken
      };
      console.log('handler result: ', result)
      res.status(200).json(JSON.stringify(result));
    } else {
      res.status(500).json({});
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error' })
  }
};

export default handler;