import { Message, OpenAIModel } from "@/types";
import { OpenAIStream } from "@/utils/server";

export const config = {
  runtime: "edge"
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key } = (await req.json()) as {
      model: OpenAIModel;
      messages: Message[];
      key: string;
    };

    const charLimit = 12000;
    let charCount = 0;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (charCount + message.content.length > charLimit) {
        break;
      }
      charCount += message.content.length;
      messagesToSend = [message, ...messagesToSend];
    }

    const stream = await OpenAIStream(model, key, messagesToSend);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
};

export default handler;
