import { 
  collection, 
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export const applicationService = {
  async getUserApplications() {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated');
    }

    const applicationsRef = collection(db, 'applications');
    const q = query(
      applicationsRef,
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  async addApplication(applicationData) {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated');
    }

    const data = {
      ...applicationData,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'applications'), data);
    return {
      id: docRef.id,
      ...data
    };
  }
}; 