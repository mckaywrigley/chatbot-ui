import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function generateFileName(codeBlock: string): string {
  // This is a very basic implementation. You might want to generate
  // more meaningful names based on the content of the code block.
  const timestamp = Date.now();
  return `codeBlock-${timestamp}.txt`;
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const code = req.body;
    const fileName = generateFileName(); // Implement this function to generate a unique file name for each code snippet
    const filePath = path.join(process.cwd(), 'code-snippets', `${fileName}.txt`);

    fs.writeFile(filePath, code, (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ message: 'Error saving code snippet' });
      } else {
        res.status(200).json({ message: 'Code snippet saved successfully' });
      }
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
