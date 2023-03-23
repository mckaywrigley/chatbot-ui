import { Conversation } from "@/types";

export const exportConversations = () => {
  const history = localStorage.getItem("conversationHistory");

  if (!history) return;

  const blob = new Blob([history], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = "chatbot_ui_history.json";
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importConversations = (conversations: Conversation[]) => {
  localStorage.setItem("conversationHistory", JSON.stringify(conversations));
  localStorage.setItem("selectedConversation", JSON.stringify(conversations[conversations.length - 1]));
};

interface languageMap {
  [key: string]: string | undefined
}

export const programmingLanguages: languageMap = {
  'javascript': '.js',
  'python': '.py',
  'java': '.java',
  'c': '.c',
  'cpp': '.cpp',
  'c++': '.cpp',
  'c#': '.cs',
  'ruby': '.rb',
  'php': '.php',
  'swift': '.swift',
  'objective-c': '.m',
  'kotlin': '.kt',
  'typescript': '.ts',
  'go': '.go',
  'perl': '.pl',
  'rust': '.rs',
  'scala': '.scala',
  'haskell': '.hs',
  'lua': '.lua',
  'shell': '.sh',
  'sql': '.sql',
  'html': '.html',
  'css': '.css'
  // add more file extensions here, make sure the key is same as language prop in CodeBlock.tsx component
};


export const generateRandomString = (length: Number, lowercase=false) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY3456789"; // excluding similar looking characters like Z, 2, I, 1, O, 0
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return lowercase ? result.toLowerCase() : result;
}
