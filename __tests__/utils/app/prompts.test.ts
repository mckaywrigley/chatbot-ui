import { vi, expect, beforeEach, describe, it } from 'vitest';
import { updatePrompt, savePrompts } from '@/utils/app/prompts';
import { Prompt } from '@/types/prompt';
import { OpenAIModel} from "@/types/openai";

describe('prompts tests', () => {
    let prompts: Prompt[];
    const mockPrompt1: Prompt = {
        id: 'uuid1',
        name: 'Mock Prompt 1',
        description: 'This is a mock prompt for testing',
        content: 'This is the content of the mock prompt 1',
        model: {
            id: 'modelid1',
            name: 'Model 1',
            maxLength: 10000,
            tokenLimit: 8000,
        },
        folderId: null
    };
    const mockPrompt2: Prompt = {
        id: 'uuid2', // Replace with proper UUID
        name: 'Mock Prompt 2',
        description: 'This is a second mock prompt for testing',
        content: 'This is the content of the mock prompt 2',
        model: {
            id: 'modelid2',
            name: 'Model 2',
            maxLength: 10000,
            tokenLimit: 8000,
        },
        folderId: null
    };
    const newPromptText: string = 'New Prompt 1';

    beforeEach(() => {
        prompts = [mockPrompt1, mockPrompt2];
        (global as any).localStorage = {
            setItem: vi.fn(),
            getItem: vi.fn()
        } as any;
    });

    describe('updatePrompt function', () => {
        it('should update prompt', () => {
            const updatedPrompt = {id: 'uuid1', content: newPromptText};
            const result = updatePrompt(updatedPrompt, prompts);
            expect((result.single as Prompt).content).toBe(newPromptText);
            expect((result.all as Prompt[]).find(p => p.id === updatedPrompt.id).content).toBe(newPromptText);
        });

        it('should not update a non-existent prompt', () => {
            const nonExistentPrompt = {id: 3, text: 'Non Existent Prompt'};
            const result = updatePrompt(nonExistentPrompt, prompts);
            expect((result.single as Prompt).id).toBe(3);
            expect((result.all as Prompt[]).find(p => p.id === nonExistentPrompt.id)).toBeUndefined();
        });
    });

    describe('savePrompts function', () => {
        it('should save prompts to local storage', () => {
            savePrompts(prompts);
            let currentPrompts = localStorage.getItem('prompts') || '[]';
            expect(global.localStorage.setItem).toHaveBeenCalledWith('prompts', JSON.stringify(prompts));
        });
    });
});
