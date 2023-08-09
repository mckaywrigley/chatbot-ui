import { Prompt } from '@/types/prompt';
import { database } from '../../firebaseConfig';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

export const updatePrompt = (updatedPrompt: Prompt, allPrompts: Prompt[]) => {
  const updatedPrompts = allPrompts.map((c) => {
    if (c.id === updatedPrompt.id) {
      return updatedPrompt;
    }

    return c;
  });

  savePrompts(updatedPrompts);

  return {
    single: updatedPrompt,
    all: updatedPrompts,
  };
};

export const savePrompts = async (prompts: Prompt[]) => {
  localStorage.setItem('prompts', JSON.stringify(prompts));
  
  let user = localStorage.getItem('user');
  const dbInstance = collection(database, 'PromptHistory');
  
  try {
    // Check if the user's data already exists in the database
    const q = query(dbInstance, where('user', '==', user));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.size > 0) {
      // If user's data exists, update the existing entry
      const docId = querySnapshot.docs[0].id; // Assuming there's only one matching document for a user
      const userDocRef = doc(dbInstance, docId);
      await updateDoc(userDocRef, {
        prompts: JSON.stringify(prompts),
      });
    } else {
      // If user's data does not exist, create a new entry
      await addDoc(dbInstance, {
        user: user,
        prompts: JSON.stringify(prompts),
      });
    }

  } catch (error) {
    console.error('Error saving prompts:', error);
  }
};
