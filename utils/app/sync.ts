import { Conversation } from '@/types/chat';
import { LatestExportFormat } from '@/types/export';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';
import { User, UserConversation } from '@/types/user';

import { cleanConversationHistory } from './clean';
import { cleanData, getExportableData } from './importExport';

import { SupabaseClient } from '@supabase/supabase-js';

type MergeableObjectCollectionHash = {
  [id: string]: MergeableObject;
};

type MergeableObject = Conversation | FolderInterface | Prompt | null;

// This function convert object to mergeableHash to optimize run time during the merger
const convertToMergeableObjectCollectionHash = (
  mergeableObjects: MergeableObject[],
): MergeableObjectCollectionHash => {
  const collectionHash: MergeableObjectCollectionHash = {};

  mergeableObjects.forEach((mergeableObject) => {
    if (!mergeableObject?.id) return;
    collectionHash[mergeableObject.id] = { ...mergeableObject };
  });

  return collectionHash;
};

const getUserRemoteData = async (
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

const updateUserRemoteData = async (
  supabase: SupabaseClient,
  user: User,
  dataPackage: LatestExportFormat,
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
        conversations: dataPackage,
      })
      .match({ id: userConversationsId });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { data, error } = await supabase.from('user_conversations').insert({
      uid: user.id,
      conversations: dataPackage,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
};

const mergeTwoObjects = (
  localObject: MergeableObject,
  remoteObject: MergeableObject,
  cleanUpFunction?: (object: MergeableObject) => MergeableObject,
): MergeableObject => {
  if (
    localObject !== null &&
    remoteObject !== null &&
    typeof localObject !== typeof remoteObject
  )
    return null;

  let mergedObject: MergeableObject;

  if (localObject !== null && remoteObject !== null) {
    // If both conversations are not deleted, then we compare the lastUpdateAtUTC
    mergedObject =
      (remoteObject.lastUpdateAtUTC || 0) > (localObject.lastUpdateAtUTC || 0)
        ? { ...remoteObject }
        : { ...localObject };

    if (localObject?.deleted === true || remoteObject?.deleted === true) {
      mergedObject.deleted = true;
      if (cleanUpFunction) {
        mergedObject = cleanUpFunction(mergedObject);
      }
    }
    return mergedObject;
  }

  return localObject !== null ? localObject : remoteObject;
};

const mergeTwoMergeableCollections = (
  localMergeableObjects: MergeableObject[],
  remoteMergeableObjects: MergeableObject[],
): MergeableObject[] => {
  const localMergeableObjectHash = convertToMergeableObjectCollectionHash(
    localMergeableObjects,
  );
  const remoteMergeableObjectHash = convertToMergeableObjectCollectionHash(
    remoteMergeableObjects,
  );

  const mergedMergeableObjectHash: MergeableObjectCollectionHash = {};

  remoteMergeableObjects.forEach((remoteMergeableObject) => {
    if (!remoteMergeableObject) return;
    const mergedMergeableObject = mergeTwoObjects(
      localMergeableObjectHash[remoteMergeableObject.id] || null,
      remoteMergeableObject,
    );
    if (mergedMergeableObject) {
      mergedMergeableObjectHash[mergedMergeableObject.id] =
        mergedMergeableObject;
    }
  });

  localMergeableObjects.forEach((localMergeableObject) => {
    if (!localMergeableObject) return;
    const mergedMergeableObject = mergeTwoObjects(
      localMergeableObject,
      remoteMergeableObjectHash[localMergeableObject.id] || null,
    );
    if (mergedMergeableObject) {
      mergedMergeableObjectHash[mergedMergeableObject.id] =
        mergedMergeableObject;
    }
  });

  return Object.values(mergedMergeableObjectHash) as MergeableObject[];
};

export const syncData = async (
  supabase: SupabaseClient,
  user: User,
  replaceRemoteData: boolean = false,
): Promise<LatestExportFormat | null> => {
  let mergedHistory: Conversation[] = [];
  let mergedFolders: FolderInterface[] = [];
  let mergedPrompts: Prompt[] = [];

  const remoteDataObject = await getUserRemoteData(supabase, user);
  let localDataObject = getExportableData();

  // Merge conversations history
  let remoteConversations: Conversation[] = [];
  let localConversations = cleanConversationHistory(localDataObject.history);

  if (remoteDataObject && !replaceRemoteData) {
    remoteConversations = cleanConversationHistory(remoteDataObject.history);
  }

  mergedHistory = mergeTwoMergeableCollections(
    localConversations,
    remoteConversations,
  ) as Conversation[];

  // Merge folders
  let remoteFolders: FolderInterface[] = [];
  let localFolders = localDataObject.folders;

  if (remoteDataObject && !replaceRemoteData) {
    remoteFolders = remoteDataObject.folders;
  }

  mergedFolders = mergeTwoMergeableCollections(
    localFolders,
    remoteFolders,
  ) as FolderInterface[];

  // Merge prompts
  let remotePrompts: Prompt[] = [];
  let localPrompts = localDataObject.prompts;

  if (remoteDataObject && !replaceRemoteData) {
    remotePrompts = remoteDataObject.prompts;
  }

  mergedPrompts = mergeTwoMergeableCollections(
    localPrompts,
    remotePrompts,
  ) as Prompt[];

  const storableConversationExport: LatestExportFormat = {
    history: mergedHistory,
    folders: mergedFolders,
    prompts: mergedPrompts,
    version: localDataObject.version,
  };

  try {
    await updateUserRemoteData(supabase, user, storableConversationExport);

    return storableConversationExport;
  } catch (e) {
    console.error(e);
    return null;
  }
};
