import {Conversation} from '@/types/chat';
import {StorageType} from '@/types/storage';

import {localSaveConversations} from './documentBased/local/conversations';
import {
    rdbmsCreateConversation,
    rdbmsDeleteConversation,
    rdbmsUpdateConversation,
} from './rdbms/conversation';
import {saveSelectedConversation} from './selectedConversation';

export const storageCreateConversation = (
    storageType: StorageType,
    newConversation: Conversation,
    allConversations: Conversation[],
) => {
    const updatedConversations = [...allConversations, newConversation];

   if (storageType === StorageType.RDBMS) {
        rdbmsCreateConversation(newConversation);
    } else {
        localSaveConversations(updatedConversations);
    }

    return updatedConversations;
};

export const storageUpdateConversation = (
    storageType: StorageType,
    updatedConversation: Conversation,
    allConversations: Conversation[],
) => {
    const updatedConversations = allConversations.map((c) => {
        if (c.id === updatedConversation.id) {
            return updatedConversation;
        }

        return c;
    });

    saveSelectedConversation(updatedConversation);

   if (storageType === StorageType.RDBMS) {
        rdbmsUpdateConversation(updatedConversation);
    } else {
        localSaveConversations(updatedConversations);
    }

    return {
        single: updatedConversation,
        all: updatedConversations,
    };
};

export const storageDeleteConversation = (
    storageType: StorageType,
    conversationId: string,
    allConversations: Conversation[],
) => {
    const updatedConversations = allConversations.filter(
        (c) => c.id !== conversationId,
    );

    if (storageType === StorageType.RDBMS) {
        rdbmsDeleteConversation(conversationId);
    } else {
        localSaveConversations(updatedConversations);
    }

    return updatedConversations;
};
