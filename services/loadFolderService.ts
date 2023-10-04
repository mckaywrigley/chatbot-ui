import { database } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const loadFolderHistory = async () => {
  try {
    let user = localStorage.getItem('user');
    const promptsCollectionRef = collection(database, 'Folders');
    const q = query(promptsCollectionRef, where('user', '==', user));

    const querySnapshot = await getDocs(q).then( (data) => {
      const folders = [] as any;
      data.forEach( (doc) => {
        folders.push({ id: doc.id, ...doc.data() });
      });
      return folders;
    });
    // 'folders' contains an array of prompt objects retrieved for the specific user
    return (querySnapshot[0] != undefined) ?  querySnapshot[0].folders : ''
  } catch (error) {
    console.error('Error loading prompts:', error);
    return [];
  }
};
