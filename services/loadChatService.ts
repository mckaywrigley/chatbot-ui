import { database } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const loadChatHistory = async () => {
  try {
    let user = localStorage.getItem('user');
    const conversationsCollectionRef = collection(database, 'ChatHistory');
    const q = query(conversationsCollectionRef, where('user', '==', user));
    
    const querySnapshot = await getDocs(q).then( (data) => {
      const conversations = [] as any;
      data.forEach( (doc) => {
        conversations.push({ id: doc.id, ...doc.data() });
      });
      return conversations;
    });
    // 'conversations' contains an array of conversation objects retrieved for the specific user
    return (querySnapshot[0] != undefined) ?  querySnapshot[0].conversations : ''
  } catch (error) {
    console.error('Error loading conversations:', error);
    return [];
  }
};
