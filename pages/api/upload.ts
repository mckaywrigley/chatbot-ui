import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import formidable from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { runIngestData } from '@/utils/ingest/ingest-data';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method !== `POST`) {
      return res.status(405).send(`Invalid method`);
    }
  
    const form = formidable({
      encoding: `utf-8`,
      multiples: true,
    });
  
    const formData = await new Promise<{ links: string[], pdfs: formidable.File[] }>((resolve, reject) => {
      form.parse(req, async (error, fields, files) => {
        if (error) {
          console.error(error);
          reject(`Something went wrong parsing the files`);
        }
  
        resolve({
          links: (fields[`links`] as string).split(`,`).map(link => link.trim()).filter(Boolean),
          pdfs: Object.values(files).flat().filter(file => file.size > 0),
        });
      });
    });
  
    const pathToDocs = path.join(process.cwd(), `docs`);
    const fileNames: Array<string> = [];
  
    if (formData.links.length === 0 && formData.pdfs.length === 0) {
      return res.status(422).json({ error: `Unprocessable input` });
    }
  
    const hashSum = createHash(`sha1`);

    if (formData.links) {
      const htmlFiles = await Promise.all(
        formData.links.map(async (link) => {
          const response = await axios.get(link);
          return response.data;
        })
      );

      fileNames.push(...await Promise.all(htmlFiles.map(
        async (htmlFile, index) => {
          const fileName = `${index}.html`;
          const newPath = `${pathToDocs}/${fileName}`;
          await fs.writeFile(newPath, htmlFile, { encoding: `utf8` });
          hashSum.update(await fs.readFile(newPath));
          return fileName;
        }
      )));
    }
  
    if (formData.pdfs) {
      fileNames.push(...await Promise.all(formData.pdfs.map(
        async (pdf, index) => {
          const oldPath = pdf.filepath;
          const fileName = `${index}.pdf`;
          const newPath = `${pathToDocs}/${fileName}`;
          await fs.rename(oldPath, newPath);
          hashSum.update(await fs.readFile(newPath));
          return fileName;
        })
      ));
    }
  
    const response = await runIngestData(hashSum.digest(`base64`));
  
    await Promise.all(
      fileNames.map(fileName => fs.unlink(`${pathToDocs}/${fileName}`))
    );
  
    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Something went wrong, we are working on it! `});
  }
}
