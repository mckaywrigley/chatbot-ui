import { database } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const loadPromptHistory = async () => {
  try {
    let user = localStorage.getItem('user');
    const promptsCollectionRef = collection(database, 'PromptHistory');
    const q = query(promptsCollectionRef, where('user', '==', user));
    
    const querySnapshot = await getDocs(q).then( (data) => {
      const prompts = [] as any;
      data.forEach( (doc) => {
        prompts.push({ id: doc.id, ...doc.data() });
      });
      return prompts;
    });
    // 'prompts' contains an array of prompt objects retrieved for the specific user
    return (querySnapshot[0] != undefined) ?  querySnapshot[0].prompts : ''
  } catch (error) {
    console.error('Error loading prompts:', error);
    return [];
  }
};
