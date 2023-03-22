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
};
