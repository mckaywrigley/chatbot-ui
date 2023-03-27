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

let wasmBuffer: Buffer | null = null;

function getWasm(): Buffer {
  if (wasmBuffer) {
    return wasmBuffer;
  }
  // This is sent up from the client when the sidecar is started.
  // Tauri gives us the path to the resource folder.
  const buf = readFileSync(process.env.PATH_TO_WASM || '');
  wasmBuffer = buf;
  return buf;
}

app.post('/chat', async (req, res) => {
  const wasm = getWasm();
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
