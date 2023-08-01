import { OpenAIModel, OpenAIModelID, OpenAIModels } from "@/types/openai";
import { PrivateAIModel, PrivateAIModelID, PrivateAIModels } from "@/types/privateIA";

export const getModelById = (modelId: string): PrivateAIModel | OpenAIModel => {
    if (Object.keys(PrivateAIModelID).find(key => PrivateAIModelID[key as keyof typeof PrivateAIModelID] === modelId)) {
        return PrivateAIModels[modelId as PrivateAIModelID];
    }
    return OpenAIModels[modelId as OpenAIModelID];
}