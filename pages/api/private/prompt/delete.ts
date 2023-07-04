import { PrismaClient } from "@prisma/client"
import { NextApiRequest, NextApiResponse } from "next/types"
import { z } from "zod";

const prisma = new PrismaClient()

const DeletePromptRequest = z.object({
    id: z.number()
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const result = await deletePrompt(req.body);
        res.status(200).json(result);
    } catch (e) 
    {
        console.log(e);
        res.status(500);
    }
}

async function deletePrompt(rawData : any) {

    try {
     const data = DeletePromptRequest.parse(rawData);
     const result = await prisma.prompt.delete({
        where: {
           id: data.id,
         },
       });
     return result;
    } catch (e)
    {
     console.log(e);
    }
 }


export default handler