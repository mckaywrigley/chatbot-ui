import { FC, useContext, useEffect, useReducer, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { toast } from 'react-hot-toast';
import { IconCopy, IconTrash } from '@tabler/icons-react';
import { PromptRequest } from '@/types/prompt';
import { useSession } from "next-auth/react"
import { API_ENTRYPOINT, PRIVATE_API_ENTRYPOINT, PROMPT_ENDPOINT } from '@/utils/app/const';

interface Props {
  open: boolean;
  onClose: () => void;
}

const BASE_API_PROMPT_URL =`${API_ENTRYPOINT}/${PRIVATE_API_ENTRYPOINT}/${PROMPT_ENDPOINT}`;

export const MarketplaceDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('marketplace');

  const modalRef = useRef<HTMLDivElement>(null);
  const [publicPrompts, setPublicPrompts] = useState<PromptRequest[]>();
  const [privatePrompts, setPrivatePrompts] = useState<PromptRequest[]>();
  const { data: session, status } = useSession()

  useEffect(() => {
    async function setPrompts() {
        const privPrompts = await getPrivatePrompts(session?.user.id);
        const pubPrompts = await getPublicPrompts();
        setPrivatePrompts(privPrompts);
        setPublicPrompts(pubPrompts);
    }
    setPrompts();
 }, [onClose])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  // Render nothing if the dialog is not open.
  if (!open) {
    return <></>;
  }

  // Render the dialog.
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            role="dialog"
          >
            <div className="text-lg pb-4 font-bold text-black dark:text-neutral-200">
              {t('Marketplace')}
            </div>

            <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200 flex justify-between">
              {t('User prompts')}
              <div className='flex gap-2'>
                <span>Public</span>
                <span>Delete</span>
              </div>
            </div>
           { privatePrompts?.map(prompt => (
           <div className='flex gap-2 items-center' key={prompt.id}>
            <div className='w-full border px-2 py-1 rounded-md flex justify-between cursor-pointer my-2 items-center hover:bg-slate-900 transition-all' onClick={() => {
                navigator.clipboard.writeText(prompt.prompt)
                toast.success("Copied to clipboard")
                onClose();
            }}> 
              <div>
                <span>{prompt.prompt}</span>
              </div>
              <div>
                <IconCopy />
              </div>
            </div>
            
            <div className='flex gap-6 items-center justify-center'>
                <div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" value={prompt.id} className="sr-only peer" defaultChecked={prompt.isPublic ? true : false} onClick={()=>{
                    let status = changePromptVisibility(prompt.id)
                    toast.success("Prompt visibility changed")
                    onClose()
                  }}/>
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
                </div>
                <div>
                  <IconTrash className='cursor-pointer' 
                  onClick={()=> { deletePrompt(prompt.id); onClose();}}/>
                </div>
            </div>
            </div>))}

            <div className="text-sm font-bold mb-2 text-black dark:text-neutral-200">
              {t('Public prompts')}
            </div>
            {
              publicPrompts?.map(prompt => (<div key={prompt.id}>
                  <div className='w-full border px-2 py-1 rounded-md flex justify-between cursor-pointer my-2 items-center hover:bg-slate-900 transition-all' onClick={() => {
                      navigator.clipboard.writeText(prompt.prompt)
                      toast.success("Copied to clipboard")
                      onClose();
                  }}>
                      <div>
                          <span>{prompt.prompt}</span>
                      </div>
                      <div>
                        <IconCopy />
                      </div>
                  </div>
              </div>))
            }

            <button
              type="button"
              className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
              onClick={() => {
                onClose();
              }}
            >
              {t('Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

async function getPublicPrompts() {
  const url = `${BASE_API_PROMPT_URL}/all`;
  console.log(url)
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
 
  return res.json()
}

async function getPrivatePrompts(ownerId : string) {
  let data = { "ownerId": ownerId}
  const url = `${BASE_API_PROMPT_URL}/getPrivate`;
  const res = await fetch(url,{
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST'
  })

  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
 
  return res.json();
}

async function changePromptVisibility(id: string){
  let data = { "id": id}
  const url = `${BASE_API_PROMPT_URL}/changeVisibility`;

  const res = await fetch(url,{
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST'
  })

  if (!res.ok) {
    throw new Error('Failed to update prompt')
  }
 
  return res.json()
}

async function deletePrompt(id: string){
  let data = { "id": id}
  const url = `${BASE_API_PROMPT_URL}/delete`;
  const res = await fetch(url,{
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST'
  })

  if (!res.ok) {
    throw new Error('Failed to delete prompt')
  }
  toast.success("Prompt deleted");
  return res.json();
}