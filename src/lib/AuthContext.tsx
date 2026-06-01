import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserRole {
  role: 'admin' | 'physiotherapist' | 'receptionist' | 'patient';
}

interface AuthContextType {
  user: User | null;
  role: UserRole['role'] | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (u: string, p: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithCredentials: async () => {},
  logOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole['role'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there is a local demo session
    const localDemoStr = localStorage.getItem('demo_admin');
    if (localDemoStr) {
      setUser({ uid: 'mock-admin-uid', email: 'admin@prophysical.com', displayName: 'Personal Administrativo (Demo)' } as unknown as User);
      setRole('admin');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setRole(userDoc.data()?.role as UserRole['role']);
          } else {
            // Bootstrap logic
            if (firebaseUser.email === 'Cristhian.A.Carrera@gmail.com' || firebaseUser.email === 'admin@prophysical.com') {
               await setDoc(userDocRef, {
                 role: 'admin',
                 email: firebaseUser.email,
                 displayName: firebaseUser.displayName || 'Root Admin',
                 createdAt: Date.now()
               });
               setRole('admin');
            } else {
               setRole('patient');
            }
          }
        } catch (e) {
          console.error("Error fetching user role", e);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithCredentials = async (u: string, p: string) => {
    const sanitizedU = u.trim().toLowerCase();
    if (sanitizedU === 'admin' && p === 'admin2026') {
      localStorage.setItem('demo_admin', 'true');
      setUser({ uid: 'mock-admin-uid', email: 'admin@prophysical.com', displayName: 'Personal Administrativo (Demo)' } as unknown as User);
      setRole('admin');
      return;
    }

    // Map generic 'admin' login to an email since Firebase auth requires email
    const email = sanitizedU === 'admin' ? 'admin@prophysical.com' : sanitizedU;

    try {
      await signInWithEmailAndPassword(auth, email, p);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
        try {
          await createUserWithEmailAndPassword(auth, email, p);
        } catch (createError: any) {
          if (createError.code === 'auth/operation-not-allowed') {
             throw new Error('operation-not-allowed');
          }
          throw createError;
        }
      } else if (error.code === 'auth/operation-not-allowed') {
         throw new Error('operation-not-allowed');
      } else {
        throw error;
      }
    }
  };

  const logOut = async () => {
    localStorage.removeItem('demo_admin');
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, signInWithCredentials, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
