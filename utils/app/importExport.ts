import { Conversation } from '@/types/chat';
import { Folder } from '@/types/folder';

function currentDate() {
  const date = new Date();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  return `${month}-${day}`;
}

export const exportData = () => {
  let history = localStorage.getItem('conversationHistory');
  let folders = localStorage.getItem('folders');

  if (history) {
    history = JSON.parse(history);
  }

  if (folders) {
    folders = JSON.parse(folders);
  }

  const data = {
    history,
    folders,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `chatbot_ui_history_${currentDate()}.json`;
  link.href = url;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importData = (
  conversations: Conversation[],
  folders: Folder[],
) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
  localStorage.setItem(
    'selectedConversation',
    JSON.stringify(conversations[conversations.length - 1]),
  );
  localStorage.setItem('folders', JSON.stringify(folders));
};
