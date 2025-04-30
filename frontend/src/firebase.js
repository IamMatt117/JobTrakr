import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  // TODO: Replace with your Firebase config object
  apiKey: "AIzaSyBha94bUHDsptqgO25QOaEMvUA0p0pUHaU",
  authDomain: "jobtrakr-345c3.firebaseapp.com",
  projectId: "jobtrakr-345c3",
  storageBucket: "jobtrakr-345c3.appspot.com",
  messagingSenderId: "356157781396",
  appId: "1:356157781396:web:a970d3e89c6df6e2cb4b81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app; 