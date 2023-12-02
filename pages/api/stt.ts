
import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import { createReadStream, readFileSync, renameSync, writeFileSync } from 'fs';
import OpenAI from 'openai';
import FormData  from 'form-data'
import { join } from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: {
    bodyParser: false, // Disable built-in body parsing
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }


  try {
    const form = new IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error parsing the form data.' });
      }

      const audioFile = files['audioFile']![0];

      const filepath = audioFile.filepath + ".mp3";
      renameSync(audioFile.filepath, filepath)

      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(filepath),
        model: 'whisper-1',
      });

      res.status(200).json({ transcription: transcription.text });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
}
