// ESM
import Fastify from 'fastify';
import { getModels } from '../pages/api/models';
import { readFileSync } from 'fs';
import { getStream } from '../utils/server';
import { ReadableStream } from 'stream/web';
import gs from 'get-stream';
import cors from '@fastify/cors';
import path from 'path';

const fastify = Fastify({
  logger: true
});

fastify.register(cors);

fastify.post('/models', async (request, reply) => {
  const key = (request.body as any).key;
  const res = await getModels(key);
  // console.log('res', models(request));
  // curl GET example
  // curl -X GET http://localhost:9987/models
  reply.type('application/json').code(200);
  return {
    models: res
  };
});

fastify.post('/chat', async (request, reply) => {
  const currentWorkingDirectory = process.cwd();
  const isProd = process.env.IS_PROD === '1';
  const pathToWasm = isProd
    ? process.env.PATH_TO_WASM || ''
    : path.resolve(currentWorkingDirectory, 'server', 'tiktoken_bg.wasm');
  const wasm = readFileSync(pathToWasm);
  const stream: ReadableStream<any> = await getStream({
    model: request.body.model,
    messages: request.body.messages,
    key: request.body.key,
    prompt: request.body.prompt,
    wasm,
  });
  // TODO: Figure out how to get the stream properly working.
  // Convert the stream to a buffer
  const buffer = await gs.buffer(stream);
  reply.type('application/octet-stream').send(buffer);
});


fastify.listen({ port: 5661 }, (err, address) => {
  if (err) {
    throw err;
  }
  console.log('Server listening on', address);
});
