import { Conversation } from '@/types/chat';
import { ExportFormatV4 } from '@/types/export';
import { User, UserConversation } from '@/types/user';

import { getExportableData, importData } from './importExport';

import { SupabaseClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';

const pushConversations = async (
  supabase: SupabaseClient,
  user: User,
  conversationPackage: ExportFormatV4,
) => {
  let storedConversations: UserConversation[] = [];
  let operationError = null;

  const { data: userConversations } = await supabase
    .from('user_conversations')
    .select('id')
    .eq('uid', user.id);

  if (userConversations && userConversations.length > 0) {
    const userConversationsId = userConversations[0].id;
    const { data, error } = await supabase
      .from('user_conversations')
      .update({
        conversations: conversationPackage,
        last_updated: dayjs().toString(),
      })
      .match({ id: userConversationsId });
    storedConversations = data || [];
    operationError = error;
  } else {
    const { data, error } = await supabase.from('user_conversations').insert({
      uid: user.id,
      conversations: conversationPackage,
      last_updated: dayjs().toString(),
    });
    storedConversations = data || [];
    operationError = error;
  }

  if(operationError) {
    throw new Error(operationError.message);
  }
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

const pullConversations = async (supabase: SupabaseClient, user: User) => {
  const { data: userConversations } = await supabase
    .from('user_conversations')
    .select('*')
    .eq('uid', user.id);

  if (userConversations && userConversations.length > 0) {
    const storedConversationPackage = (userConversations[0] as UserConversation)
      .conversations;
    importData(storedConversationPackage);
  }
};

export const syncConversations = async (
  supabase: SupabaseClient,
  user: User,
  conversationLastUpdatedAt: string,
) => {
  // We use simple syncing here, basically who has the most recent data wins
  const localLastUpdatedAt = dayjs(conversationLastUpdatedAt);
  
  const { data: userConversations } = await supabase
    .from('user_conversations')
    .select('last_updated')
    .eq('uid', user.id);

  const remoteTimestamp = userConversations?.[0] ? dayjs(userConversations?.[0]?.last_updated) : null;
  const exportableConversations = getExportableData();

  if (localLastUpdatedAt && remoteTimestamp) {
    if (localLastUpdatedAt > remoteTimestamp) {
      console.log('Local data is newer, pushing to remote');
      await pushConversations(supabase, user, exportableConversations);
    } else {
      console.log('Remote data is newer, pulling from remote');
      await pullConversations(supabase, user);
    }
  } else if (localLastUpdatedAt) {
    console.log('Local data is newer, pushing to remote');
    await pushConversations(supabase, user, exportableConversations);
  } else if (remoteTimestamp) {
    console.log('Remote data is newer, pulling from remote');
    await pullConversations(supabase, user);
  } else {
    console.log('No data found, pushing to remote');
    await pushConversations(supabase, user, exportableConversations);
  }
};

export const updateConversationLastUpdatedAtTimeStamp = () => {
  localStorage.setItem('conversationLastUpdatedAt', dayjs().toString());
};

export const saveConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};
