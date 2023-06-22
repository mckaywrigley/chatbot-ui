import {LOG_INCOMING_MESSAGES, LOG_TRIM_MESSAGES} from "@/utils/app/const";
import {ChatBody} from "@/types/chat";

function logOpenAIRequest(body: ChatBody, user: string | null | undefined) {
    if (LOG_INCOMING_MESSAGES) {
      let chatBody = body as ChatBody;
      if (LOG_TRIM_MESSAGES) {
        chatBody.messages = chatBody.messages.slice(-1);
      }
      const logMessage = {
          data: chatBody,
          user: user,
      }
      console.log(JSON.stringify(logMessage));
    }
}
export { logOpenAIRequest }