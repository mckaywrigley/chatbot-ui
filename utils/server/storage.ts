import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

import { Collection, Db, MongoClient } from 'mongodb';

let _db: Db | null = null;
export async function getDb(): Promise<Db> {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }
  if (_db !== null) {
    return _db;
  }
  const client = await MongoClient.connect(process.env.MONGODB_URI);

  let db = client.db('example');
  _db = db;
  return db;
}

export interface ConversationCollectionItem {
  userHash: string;
  conversation: Conversation;
}
export interface PromptsCollectionItem {
  userHash: string;
  prompts: Prompt[];
}

export interface FoldersCollectionItem {
  userHash: string;
  folders: FolderInterface[];
}

export class UserDb {
  private _conversations: Collection<ConversationCollectionItem>;
  private _folders: Collection<FoldersCollectionItem>;
  private _prompts: Collection<PromptsCollectionItem>;

  constructor(_db: Db, private _userId: string) {
    this._conversations =
      _db.collection<ConversationCollectionItem>('conversations');
    this._folders = _db.collection<FoldersCollectionItem>('folders');
    this._prompts = _db.collection<PromptsCollectionItem>('prompts');
  }

  static async fromUserHash(userId: string): Promise<UserDb> {
    return new UserDb(await getDb(), userId);
  }

  async getConversations(): Promise<Conversation[]> {
    return (
      await this._conversations.find({ userHash: this._userId }).toArray()
    ).map((item) => item.conversation);
  }

  async saveConversation(conversation: Conversation) {
    // upsert
    return this._conversations.updateOne(
      { userHash: this._userId, 'conversation.id': conversation.id },
      { $set: { conversation } },
      { upsert: true },
    );
  }

  async saveConversations(conversations: Conversation[]) {
    for (const conversation of conversations) {
      await this.saveConversation(conversation);
    }
  }
  removeConversation(id: string) {
    this._conversations.deleteOne({
      userHash: this._userId,
      'conversation.id': id,
    });
  }

  removeAllConversations() {
    this._conversations.deleteMany({ userHash: this._userId });
  }

  async getFolders(): Promise<FolderInterface[]> {
    const item = await this._folders.findOne({ userHash: this._userId });
    if (item) {
      return item.folders;
    }
    return [];
  }

  async saveFolders(folders: FolderInterface[]) {
    return this._folders.updateOne(
      { userHash: this._userId },
      { $set: { folders } },
      { upsert: true },
    );
  }

  async getPrompts(): Promise<Prompt[]> {
    const item = await this._prompts.findOne({ userHash: this._userId });
    if (item) {
      return item.prompts;
    }
    return [];
  }

  async savePrompts(prompts: Prompt[]) {
    return this._prompts.updateOne(
      { userHash: this._userId },
      { $set: { prompts } },
      { upsert: true },
    );
  }
}
