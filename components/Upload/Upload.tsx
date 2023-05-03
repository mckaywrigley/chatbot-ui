import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { NewConversationArgs } from '@/types/chat';
import { useTranslation } from 'react-i18next';

interface IUploadForm extends HTMLFormElement {
  elements: IUploadFormControlsCollection;
}

interface IUploadFormControlsCollection extends HTMLFormControlsCollection {
  links: HTMLTextAreaElement;
  pdfs: HTMLInputElement;
}

type UploadProps = {
  newConversationName: string;
  onUploadComplete(args: NewConversationArgs): void;
};

export function Upload({ onUploadComplete }: UploadProps) {
  const linkInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.value = ``;
      setFiles([]);
    }
  }, [uploading]);

  async function handleSubmitAsync(event: FormEvent<IUploadForm>) {
    setError(null);
    setUploading(true);

    event.preventDefault();

    await fetch(`/api/upload`, {
      body: new FormData(event.currentTarget),
      method: `POST`,
    })
      .then(async response => {
        const { duplicate, error, namespace } = await response.json();

        if (error) {
          throw new Error(error);
        }

        return {
          duplicate,
          namespace,
        };
      })
      .then(onUploadComplete)
      .catch(error => setError(error.message))
      .finally(() => setUploading(false));
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.currentTarget.files ?? []));
  }

  return (
    <div className="bg-white dark:bg-[#343541] flex-1 self-center min-h-screen flex justify-center items-center">
      <div className="h-full w-fit flex flex-col gap-8 items-center">
        <div className="flex flex-col gap-8 items-stretch">
          <p className="text-lg">{t('Provide links and/or pdfs to parse')}</p>
          {error && <p className="text-center text-red-500">{error}</p>}
          <form className="flex flex-col gap-12" onSubmit={handleSubmitAsync}>
            <fieldset className="flex flex-col items-stretch gap-6" disabled={uploading}>
              <div className="flex flex-col gap-2">
                <label className="text-center" htmlFor={linkInputId}>
                  {t('Enter comma separated links')}
                </label>
                <textarea
                  className="bg-transparent dark:bg-transparent resize-none rounded-md border border-neutral-600 bg-[#202123] px-2.5 py-2 text-[14px] leading-3 text-white"
                  id={linkInputId}
                  name="links"
                  rows={10}
                />
              </div>
              <div className="flex flex-col items-stretch gap-4">
                <button
                  className="cursor-pointer select-none items-center gap-3 rounded-md border border-white/20 p-3 text-white transition-colors duration-200 hover:bg-gray-500/10 disabled:opacity-50"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('Upload PDFs')}
                </button>
                {files.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <p className="font-bold">{t('Uploaded PDFs')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from(files).map(file => (
                        <span
                          key={file.name}
                          className="flex items-center justify-center gap-2 p-2 border border-white/20 rounded-sm"
                        >
                          {file.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <input
                  accept=".pdf"
                  className="hidden"
                  disabled={uploading}
                  name="pdfs"
                  multiple={true}
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                />
              </div>
            </fieldset>
            <button
              className="cursor-pointer select-none items-center gap-3 rounded-full border border-white/20 p-3 text-white transition-colors duration-200 hover:bg-gray-500/10 disabled:opacity-50"
              disabled={uploading}
              type="submit"
            >
              {uploading ? t('Submitting...') : t('Submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
