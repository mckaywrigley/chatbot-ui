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
      await navigator.clipboard.writeText(url);
      toast.success(t(`Conversation saved! The sharable link is copied to clipboard.`));
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
