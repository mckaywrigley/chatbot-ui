import {FolderInterface} from '@/types/folder';
import {database} from '../../firebaseConfig';
import {collection, query, where, getDocs, addDoc, updateDoc, doc} from 'firebase/firestore';

export const saveFolders = async (folders: FolderInterface[]) => {
    localStorage.setItem('folders', JSON.stringify(folders));

    let user = localStorage.getItem('user');
    const dbInstance = collection(database, 'Folders');

    try {
        // Check if the user's data already exists in the database
        const q = query(dbInstance, where('user', '==', user));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.size > 0) {
            // If user's data exists, update the existing entry
            const docId = querySnapshot.docs[0].id; // Assuming there's only one matching document for a user
            const userDocRef = doc(dbInstance, docId);
            await updateDoc(userDocRef, {
                folders: JSON.stringify(folders),
            });
        } else {
            // If user's data does not exist, create a new entry
            await addDoc(dbInstance, {
                user: user,
                folders: JSON.stringify(folders),
            });
        }

    } catch (error) {
        console.error('Error saving prompts:', error);
    }
};
