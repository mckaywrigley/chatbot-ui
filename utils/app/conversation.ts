import { Conversation } from '@/types/chat';
import { ExportFormatV4 } from '@/types/export';
import { LatestExportFormat } from '@/types/export';
import { User, UserConversation } from '@/types/user';

import { cleanConversationHistory } from './clean';
import { getExportableData, cleanData } from './importExport';

import { SupabaseClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';

export const getNonDeletedConversations = (
  conversations: Conversation[],
): Conversation[] => conversations.filter((c) => !c.deleted);

type ConversationCollectionHash = {
  [id: string]: Conversation;
};

// This function conversations to conversationHash in order to optimize run time
const convertToConversationCollectionHash = (
  conversations: Conversation[],
): ConversationCollectionHash => {
  const conversationHash: ConversationCollectionHash = {};

  conversations.forEach((conversation) => {
    if (!conversation.id) return;
    conversationHash[conversation.id] = { ...conversation };
  });

  return conversationHash;
};

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

const getUserRemoteConversations = async (
  supabase: SupabaseClient,
  user: User,
): Promise<LatestExportFormat | null> => {
  const { data: userConversations } = await supabase
    .from('user_conversations')
    .select('*')
    .eq('uid', user.id);

  if (userConversations && userConversations.length > 0) {
    const storedConversationPackage = (userConversations[0] as UserConversation)
      .conversations;

    const { history, folders, prompts } = cleanData(storedConversationPackage);

    return {
      history,
      folders,
      prompts,
    } as LatestExportFormat;
  }

  return null;
};

const updateUserRemoteConversations = async (
  supabase: SupabaseClient,
  user: User,
  conversationPackage: LatestExportFormat,
) => {
  const { data: userConversations } = await supabase
    .from('user_conversations')
    .select('id')
    .eq('uid', user.id);

  if (userConversations && userConversations.length > 0) {
    const userConversationsId = userConversations[0].id;
    const { error } = await supabase
      .from('user_conversations')
      .update({
        conversations: conversationPackage,
      })
      .match({ id: userConversationsId });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await supabase.from('user_conversations').insert({
      uid: user.id,
      conversations: conversationPackage,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
};

const mergeTwoConversations = (
  localConversation: Conversation | null,
  remoteConversation: Conversation | null,
): Conversation | null => {
  let mergedConversation: Conversation;

  if (localConversation !== null && remoteConversation !== null) {
    // Deleted attribute has the highest precedence
    if (localConversation.deleted || remoteConversation.deleted) {
      mergedConversation = { ...localConversation };
      mergedConversation.messages = [];
      mergedConversation.prompt = '';
    } else {
      // If both conversations are not deleted, then we compare the lastUpdateAtUTC
      mergedConversation =
        remoteConversation.lastUpdateAtUTC > localConversation.lastUpdateAtUTC
          ? { ...remoteConversation }
          : { ...localConversation };
    }
    return mergedConversation;
  }

  return localConversation !== null ? localConversation : remoteConversation;
};

export const syncConversations = async (
  supabase: SupabaseClient,
  user: User,
): Promise<LatestExportFormat | null> => {
  // TODO: Implement the same syncing mechanism for prompts

  const remoteConversationObject = await getUserRemoteConversations(
    supabase,
    user,
  );
  let localConversationObject = getExportableData();

  let remoteConversations: Conversation[] = [];
  let localConversations = cleanConversationHistory(
    localConversationObject.history,
  );

  if (remoteConversationObject) {
    remoteConversations = cleanConversationHistory(
      remoteConversationObject.history,
    );
  }

  const localConversationHashes =
    localConversations.length === 0
      ? {}
      : convertToConversationCollectionHash(localConversations);
  const remoteConversationHashes =
    remoteConversations.length === 0
      ? {}
      : convertToConversationCollectionHash(remoteConversations);

  // Merge both remoteConversations and remoteConversations
  let mergedConversationCollectionHash: ConversationCollectionHash = {};

  remoteConversations.forEach((remoteConversation) => {
    const mergedConversation = mergeTwoConversations(
      localConversationHashes[remoteConversation.id] || null,
      remoteConversation,
    );
    if (mergedConversation) {
      mergedConversationCollectionHash[mergedConversation.id] =
        mergedConversation;
    }
  });

  localConversations.forEach((localConversation) => {
    const mergedConversation = mergeTwoConversations(
      localConversation,
      remoteConversationHashes[localConversation.id] || null,
    );
    if (mergedConversation) {
      mergedConversationCollectionHash[mergedConversation.id] =
        mergedConversation;
    }
  });

  const storableConversationExport: LatestExportFormat = {
    history: Object.values(mergedConversationCollectionHash),
    folders: localConversationObject.folders,
    prompts: localConversationObject.prompts,
    version: localConversationObject.version,
  };

  try {
    await updateUserRemoteConversations(
      supabase,
      user,
      storableConversationExport,
    );

    return storableConversationExport;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const updateConversationLastUpdatedAtTimeStamp = () => {
  localStorage.setItem('conversationLastUpdatedAt', dayjs().valueOf().toString());
};

export const saveConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};
