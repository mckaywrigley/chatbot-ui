import { IconCheck, IconClipboard, IconDownload } from '@tabler/icons-react';
import { FC, memo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { onedark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTranslation } from 'next-i18next';
import axios from 'axios';
import {
  generateRandomString,
  programmingLanguages,
} from '@/utils/app/codeblock';

interface Props {
  language: string;
  value: string;
}

export const CodeBlock: FC<Props> = memo(({ language, value }) => {
  const { t } = useTranslation('markdown');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };

  const saveCodeToServer = async () => {
    try {
      await axios.post('save-code.ts', { code: value });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="codeblock relative font-sans text-[16px]">
      <div className="flex items-center justify-between py-1.5 px-4">
        <span className="text-xs lowercase text-white">{language}</span>

        <div className="flex items-center">
          <button
            className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-white"
            onClick={copyToClipboard}
          >
            {isCopied ? <IconCheck size={18} /> : <IconClipboard size={18} />}
            {isCopied ? t('Copied!') : t('Copy code')}
          </button>
          <button
            className="flex items-center rounded bg-none p-1 text-xs text-white"
            onClick={saveCodeToServer}
          >
            <IconDownload size={18} />
          </button>
        </div>
      </div>

      <SyntaxHighlighter
        language={language}
        style={onedark}
        customStyle={{ margin: 0 }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
});
CodeBlock.displayName = 'CodeBlock';
