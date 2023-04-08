import { IconBrandStackshare, IconLoader } from '@tabler/icons-react';
import { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { Conversation } from '@/types/chat';
import { useTranslation } from 'next-i18next';

interface Props {
  conversation: Conversation;
}

export const StoreConversationButton: FC<Props> = ({ conversation }) => {
  const { t } = useTranslation('chat');
  const [loading, setLoading] = useState(false);

  const shareConversationCopyButtonOnClick = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
      toast.dismiss('store-conversation-toast');
    } catch (error) {
      toast.error('Failed to copy the link to clipboard');
    }
  };

  const storeConversation = async () => {
    const confirmed = window.confirm(
      t(
        'By sharing this conversation, it will be stored on our server. Are you sure you want to share this conversation?',
      ) ||
        'By sharing this conversation, it will be stored on our server. Are you sure you want to share this conversation?',
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/storeConversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: conversation.name,
          prompts: conversation.messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to store the conversation');
      }

      const { accessible_id } = await response.json();

      const url = `${window.location.origin}?shareable_conversation_id=${accessible_id}`;

      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        toast.error(t(`Failed to copy the sharable link to clipboard.`));
      } else {
        toast(
          <div>
            <span>Conversation saved!</span>
            <button
              onClick={() => {
                shareConversationCopyButtonOnClick(url);
              }}
              className="mt-2 m-auto block rounded-md bg-blue-500 px-2 py-1 text-white text-sm"
            >
              Copy link
            </button>
          </div>,
          {
            id: 'store-conversation-toast',
            icon: '🔗',
            duration: 8000,
          },
        );
      }
    } catch (error) {
      toast.error((error as any).message);
    }

    setLoading(false);
  };

  return (
    <>
      {loading ? (
        <IconLoader size={18} className="ml-2" />
      ) : (
        <IconBrandStackshare
          size={18}
          className="ml-2 cursor-pointer hover:opacity-50"
          onClick={storeConversation}
        />
      )}
    </>
  );
};
