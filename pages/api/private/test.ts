import { NextApiRequest, NextApiResponse } from 'next/types';

import {
  API_ENTRYPOINT,
  PRIVATE_API_ENTRYPOINT,
  WORKSPACES_ENDPOINT,
} from '@/utils/app/const';

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  console.log(API_ENTRYPOINT);
  console.log(PRIVATE_API_ENTRYPOINT);
  console.log(WORKSPACES_ENDPOINT);
  res.status(200).json({
    1: API_ENTRYPOINT,
    2: PRIVATE_API_ENTRYPOINT,
    3: WORKSPACES_ENDPOINT,
  });
};

export default handler;
