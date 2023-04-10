import { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';

export const config = {
  runtime: 'edge',
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'GET') {
      const targetUrl = 'http://localhost:4000/langchain-chat';
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'text/event-stream',
        },
      });
  
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
  
      if(response.body){
        const nodeReadable = Readable.from(response.body.getReader());
        nodeReadable.pipe(res);
  
        req.on('close', () => {
          nodeReadable.destroy();
        });
      }
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in /api/langchain-chat:', error);
    res.status(500)
      .json({ error: 'Error fetching data from /langchain-chat.' });
  }
}

export default handler;