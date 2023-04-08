import { IconShare } from '@tabler/icons-react';
import { FC, useState } from 'react';
import toast from 'react-hot-toast';
import { Conversation } from '@/types/chat';

interface Props {
  conversation: Conversation;
}

export const StoreConversationButton: FC<Props> = ({ conversation }) => {
  const [loading, setLoading] = useState(false);

  const storeConversation = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to store this conversation on our server?',
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
      toast.success(`Conversation saved! URL copied to clipboard.`);
    } catch (error) {
      toast.error(error.message);
    }

    setLoading(false);
  };

  return (
    <>
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 opacity-60 dark:border-neutral-100"></div>
      ) : (
        <IconShare
          size={18}
          className="ml-2 cursor-pointer hover:opacity-50"
          onClick={storeConversation}
        />
      )}
    </>
  );
};
