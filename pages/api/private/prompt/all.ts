import { NextApiRequest, NextApiResponse } from "next/types"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        // const prompts = await prisma.prompt.findMany({
        //     where: {
        //         isPublic: true,
        //     },
        // })
        res.status(200).json({prompts: 1})
    } catch (e)
    {
        res.status(500);
    }
}

export default handler;