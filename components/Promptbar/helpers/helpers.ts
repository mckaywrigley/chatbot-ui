import { Prompt } from "@/types/prompt";
import { v4 as uuidv4 } from 'uuid';

type PromptHelperType = {
    prompts: Prompt[];
    defaultModelId?: any;
    OpenAIModels?: any;
    prompt: Prompt
}

export const createPrompt = ({ prompts, defaultModelId, OpenAIModels }: PromptHelperType) => {
    if (defaultModelId) {
        const newPrompt: Prompt = {
            id: uuidv4(),
            name: `Prompt ${prompts.length + 1}`,
            description: '',
            content: '',
            model: OpenAIModels[defaultModelId],
            folderId: null,
        };

        return [...prompts, newPrompt];
    }
};


export const deletePrompt = ({ prompt, prompts }: PromptHelperType) => prompts.filter((p) => p.id !== prompt.id)
export const updatePrompt = ({ prompt, prompts }: PromptHelperType) => prompts.map(p => (p.id === prompt.id) ? prompt : p)
export const getUpdatedPrompt = (e: any) => {
    if (e.dataTransfer) {
        const prompt = JSON.parse(e.dataTransfer.getData('prompt'));

        return {
            ...prompt,
            folderId: e.target.dataset.folderId,
        };
    }
}

