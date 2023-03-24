import express from 'express';
import { getModels } from '../pages/api/models';
import { readFileSync } from 'fs';
import { getStream } from '../utils/server';
import cors from 'cors';
import path from 'path';
import { pipeline } from 'stream/promises';

const app = express();
const port = 5661;

app.use(cors());

app.use(express.json());

app.post('/models', async (req, res) => {
  const key = req.body.key;
  const models = await getModels(key);
  res.type('application/json').status(200).send({ models });
});

app.post('/chat', async (req, res) => {
  const currentWorkingDirectory = process.cwd();
  const isProd = process.env.IS_PROD === '1';
  const pathToWasm = isProd
    ? process.env.PATH_TO_WASM || ''
    : path.resolve(currentWorkingDirectory, 'server', 'tiktoken_bg.wasm');
  const wasm = readFileSync(pathToWasm);
  const stream = await getStream({
    model: req.body.model,
    messages: req.body.messages,
    key: req.body.key,
    prompt: req.body.prompt,
    wasm,
  });

  res.type('application/octet-stream');
  await pipeline(stream as any, res);
  return null;
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
