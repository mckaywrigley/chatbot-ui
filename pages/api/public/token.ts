import { getToken } from "next-auth/jwt";
const secret = process.env.NEXTAUTH_SECRET;

import { API_ENTRYPOINT, PRIVATE_API_ENTRYPOINT, WORKSPACES_ENDPOINT } from "@/utils/app/const"
import { NextApiRequest, NextApiResponse } from "next/types"

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const token = await getToken({ req: req, secret: secret });
  if (token) {
    // Signed in
    console.log("JSON Web Token", JSON.stringify(token, null, 2));
    res.status(200).json(JSON.stringify(token, null, 2))
  } else {
    // Not Signed in
    res.status(401);
  }
  res.end();
}
   
export default handler