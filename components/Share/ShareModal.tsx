import { Conversation } from '@/types';
import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCopy, IconDownload, IconCheck } from '@tabler/icons-react';
import { currentDate } from '@/utils/app/importExport';

interface Props {
  onClose: () => void;
}

export const ShareModal: FC<Props> = ({ onClose }) => {
  const { t } = useTranslation('share');

  const [markdown, setMarkdown] = useState<string>('');
  const [contentCopied, setContentCopied] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleShareMarkdown = () => {
    const selectedConversation = localStorage.getItem('selectedConversation');
    if (selectedConversation) {
      const parsedSelectedConversation: Conversation =
        JSON.parse(selectedConversation);

      const markdown = parsedSelectedConversation.messages.map(message => {
        return `**${message.role}**: ${message.content}`
      })

      setMarkdown(markdown.join('\n\n'))
    }
  }

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `cahtify_conversation_${currentDate()}.md`;
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const copyOnClick = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(markdown).then(() => {
      setContentCopied(true);
      setTimeout(() => {
        setContentCopied(false);
      }, 2000);
    });
  };

  return (
    <div
      className="z-100 fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-hidden rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            role="dialog"
          >
            <p className="text-xl font-bold text-neutral-200">
              {t('Share This Chat')}
            </p>
            {markdown.length ? (
              <div className='mt-4'>
                <p className="text-lg text-neutral-200">
                  {t('Here is your chat transcript:')}
                </p>
                <div className='flex gap-4 mt-2'>
                  <button
                    type="button"
                    className='flex items-center justify-center gap-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300'
                    onClick={copyOnClick}
                  >
                    {contentCopied ? (
                      <>
                        <IconCheck />
                        {t("Copied")}
                      </>
                    ) : (
                      <>
                        <IconCopy />
                        {t("Copy Content")}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className='flex items-center justify-center gap-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300'
                    onClick={handleDownloadMarkdown}
                  >
                    <IconDownload />
                    {t("Download .md")}
                  </button>
                </div>
                <pre className='bg-gray-200 border border-gray-200 rounded-lg overflow-auto p-4 whitespace-pre-line my-4 dark:bg-zinc-800 dark:border-gray-700 max-h-[200px]'>
                  {markdown}
                </pre>
                <div className='flex justify-center'>
                  <button className='text-blue-400 hover:undline' onClick={onClose}>Close</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-lg text-neutral-200">
                  {t('How do you want to share this chat?')}
                </p>

                <div className="flex items-start gap-4 mt-8">
                  <div className="min-w-[120px]">
                    <button
                      type="button"
                      className="w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
                      onClick={handleShareMarkdown}
                    >
                      Plain Text (Markdown)
                    </button>
                  </div>
                  <p className='text-lg'>
                    Share conversation in Markdown format
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
