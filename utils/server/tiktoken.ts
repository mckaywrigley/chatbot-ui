import cl100k from '@dqbd/tiktoken/encoders/cl100k_base.json';
import p50k from '@dqbd/tiktoken/encoders/p50k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import fs from 'node:fs';

let initialized = false;

export const getTiktokenEncoding = async (model: string): Promise<Tiktoken> => {
  if (!initialized) {
    const wasmBinary = fs.readFileSync('./public/tiktoken_bg.wasm');
    const wasmModule = await WebAssembly.compile(wasmBinary);
    await init((imports) => WebAssembly.instantiate(wasmModule, imports));
  }
  initialized = true;

  if (model.indexOf('text-davinci-') !== -1) {
    return new Tiktoken(p50k.bpe_ranks, p50k.special_tokens, p50k.pat_str);
  }
  return new Tiktoken(cl100k.bpe_ranks, cl100k.special_tokens, cl100k.pat_str);
};
