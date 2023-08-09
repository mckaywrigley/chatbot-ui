import { Conversation } from '@/types/chat';
import { database } from '../../firebaseConfig';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

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

export const saveConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = async (conversations: Conversation[]) => {
  let user = localStorage.getItem('user');
  const dbInstance = collection(database, 'ChatHistory');

  try {
    // Check if the user's data already exists in the database
    const q = query(dbInstance, where('user', '==', user));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.size > 0) {
      // If user's data exists, update the existing entry
      const docId = querySnapshot.docs[0].id; // Assuming there's only one matching document for a user
      const userDocRef = doc(dbInstance, docId);
      await updateDoc(userDocRef, {
        conversations: JSON.stringify(conversations),
      });
    } else {
      // If user's data does not exist, create a new entry
      await addDoc(dbInstance, {
        user: user,
        conversations: JSON.stringify(conversations),
      });
    }

    // Save the conversations to localStorage
    localStorage.setItem('conversationHistory', JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving conversations:', error);
  }
};
