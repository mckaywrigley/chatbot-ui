import { useContext, useEffect, useState } from 'react';

import HomeContext from '@/pages/api/home/home.context';

import { Tiktoken, encoding_for_model } from '@dqbd/tiktoken';
import BigNumber from 'bignumber.js';

const PRICING: Record<string, BigNumber> = {
  'gpt-4': BigNumber('0.03').div(1000),
  'gpt-4-32k': BigNumber('0.03').div(1000),
  'gpt-3.5-turbo': BigNumber('0.002').div(1000),
};

export function ChatInputTokenCount(props: { content: string | undefined }) {
  const {
    state: { selectedConversation },
  } = useContext(HomeContext);

  const [tokenizer, setTokenizer] = useState<Tiktoken | null>(null);

  useEffect(() => {
    const modelId = selectedConversation?.model.id;

    let model: Tiktoken | null = null;
    if (modelId?.startsWith('gpt-4')) {
      model = encoding_for_model('gpt-4', {
        '<|im_start|>': 100264,
        '<|im_end|>': 100265,
        '<|im_sep|>': 100266,
      });
    } else if (modelId?.startsWith('gpt-3.5-turbo')) {
      model = encoding_for_model('gpt-3.5-turbo', {
        '<|im_start|>': 100264,
        '<|im_end|>': 100265,
        '<|im_sep|>': 100266,
      });
    }

    setTokenizer(model);
    return () => model?.free();
  }, [selectedConversation?.model.id]);

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: selectedConversation?.prompt ?? '' },
    ...(selectedConversation?.messages ?? []),
    { role: 'user', content: props.content ?? '' },
  ];

  const isGpt3 = selectedConversation?.model.id.startsWith('gpt-3.5-turbo');
  const msgSep = isGpt3 ? '\n' : '';
  const roleSep = isGpt3 ? '\n' : '<|im_sep|>';

  const serialized = [
    messages
      .map(({ role, content }) => {
        return `<|im_start|>${role}${roleSep}${content}<|im_end|>`;
      })
      .join(msgSep),
    `<|im_start|>assistant${roleSep}`,
  ].join(msgSep);

  const count = tokenizer?.encode(serialized, 'all').length;
  const pricing: BigNumber | undefined =
    PRICING[selectedConversation?.model.id || 'gpt-3.5-turbo'];

  if (pricing == null || count == null) return null;
  return (
    <div className="bg-opacity-10 bg-neutral-300 rounded-full py-1 px-2 text-neutral-400">
      {count} / ${pricing.multipliedBy(count).toFixed()}
    </div>
  );
}
