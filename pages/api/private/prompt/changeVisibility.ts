import { NextApiRequest, NextApiResponse } from "next/types"
import { z } from "zod";


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      //  const result = await changePromptVisibility(req.body);

        res.status(200).json({result : 1});
    } catch (e) 
    {
        console.log(e);
        res.status(500);
    }
}

// const changePromptStatus = z.object({
//     id: z.number(),
// });

// async function changePromptVisibility(rawData : any) {
//     try {
//         const data = changePromptStatus.parse(rawData);
//         const prompt = await prisma.prompt.findFirst({
//             where: {
//                 id: data.id,
//             },
//         });

//         const changedStatus = !(prompt?.isPublic);

//         const selectedPrompt = await prisma.prompt.update({
//             where: {
//                 id: data.id,
//             },
//             data: {
//                 isPublic: changedStatus,
//             }
//           })
//         return selectedPrompt;
//     } catch(e) 
//     {
//         console.log(e);
//     }
// }

export default handler