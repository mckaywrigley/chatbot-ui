import { PrismaClient } from "@prisma/client"
import { NextApiRequest, NextApiResponse } from "next/types"
import { z } from "zod";

const prisma = new PrismaClient()

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const result = await getPrivatePrompts(req.body);
        res.status(200).json(result);
    } catch (e)
    {
        console.log(e);
        res.status(500);
    }
}

const Owner = z.object({
    ownerId: z.string(),
});

async function getPrivatePrompts(rawData : any) {
    const data = Owner.parse(rawData);
    try {
        const userPrompts = await prisma.prompt.findMany({
            where: {
                ownerId: data.ownerId,
            },
          })
        return userPrompts
    } catch(e)
    {
        console.log(e);
    }
}

export default handler