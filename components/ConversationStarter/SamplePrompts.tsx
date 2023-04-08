import { FC, useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';

const DEMO_PROMPTS = [
  'Compose a heartfelt apology email to my boss for missing an important meeting.',
  "Generate a witty toast for my best friend's wedding.",
  'Create a catchy slogan for my new eco-friendly laundry detergent.',
  'Draft an engaging social media post announcing the launch of my online store.',
  'Craft a persuasive pitch for my innovative smartphone app to potential investors.',
  'Write an attention-grabbing headline for my blog post on reducing food waste.',
  'Develop a memorable tagline for a charity marathon event.',
  'Design a captivating Instagram caption for my latest travel adventure.',
  'Invent a creative name for a new line of organic skincare products.',
  'Construct an inspiring pep talk for my team before a big game.',
];

type Props = {
  promptOnClick: (prompt: string) => void;
};

export const SamplePrompts: FC<Props> = ({ promptOnClick }) => {
  const { t } = useTranslation('prompts');

  return (
    <div className="mt-5 flex flex-col text-sm overflow-y-auto h-64">
      {DEMO_PROMPTS.map((prompt, index) => (
        <div
          key={index}
          className="mb-2 cursor-pointer rounded-md border border-neutral-200 bg-transparent p-1 pr-2 text-neutral-400 dark:border-neutral-600 dark:text-white"
          onClick={() => promptOnClick(t(prompt))}
        >
          {t(prompt)}
        </div>
      ))}
    </div>
  );
};
