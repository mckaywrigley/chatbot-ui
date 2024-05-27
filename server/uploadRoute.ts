import express, { Request, Response } from 'express';
import multer from 'multer';
import storage from './storage';
import { bucketName } from './config';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const blob = storage.bucket(bucketName || '').file(req.file.originalname);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error('Blob stream error', err);
      res.status(500).send(err);
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
      res.status(200).send({ message: 'File uploaded successfully', url: publicUrl });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Error uploading to Google Cloud Storage', error);
    res.status(500).send(error);
  }
});

export default router;