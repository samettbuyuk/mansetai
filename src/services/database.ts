import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  getDoc,
  runTransaction,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ProcessedNews } from './gemini';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const saveUser = async (user: { uid: string, email: string | null, displayName: string | null, photoURL: string | null }) => {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, path);
    const userSnapshot = await getDoc(userRef);
    
    if (!userSnapshot.exists()) {
      await setDoc(userRef, {
        ...user,
        newsCounter: 0,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(userRef, {
        ...user,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getNextId = async (userId: string): Promise<number> => {
  const userRef = doc(db, 'users', userId);
  try {
    return await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentCount = userDoc.exists() ? (userDoc.data()?.newsCounter || 0) : 0;
      const nextCount = currentCount + 1;
      
      transaction.update(userRef, { newsCounter: nextCount });
      return nextCount;
    });
  } catch (error) {
    console.error("Counter increment error:", error);
    return Date.now();
  }
};

export const saveNewsHistory = async (userId: string, news: ProcessedNews[], type: 'history_changed' | 'history_generated') => {
  const batch = news.map(async (item) => {
    const path = `users/${userId}/${type}/${item.id}`;
    try {
      await setDoc(doc(db, path), {
        ...item,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  });
  await Promise.all(batch);
};

export const getNewsHistory = async (userId: string, type: 'history_changed' | 'history_generated') => {
  const path = `users/${userId}/${type}`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    // Group by date
    const grouped: { [key: string]: ProcessedNews[] } = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.createdAt ? (data.createdAt as Timestamp).toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : 'Bilinmeyen Tarih';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({ ...data, id: doc.id } as ProcessedNews);
    });

    return Object.entries(grouped).map(([date, news]) => ({ date, news }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const deleteNewsItem = async (userId: string, itemId: string, type: 'history_changed' | 'history_generated') => {
  const path = `users/${userId}/${type}/${itemId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const clearNewsHistory = async (userId: string, type: 'history_changed' | 'history_generated') => {
  const path = `users/${userId}/${type}`;
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const batch = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(batch);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
