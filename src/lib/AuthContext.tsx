import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';

interface UserRole {
  role: 'admin' | 'physiotherapist' | 'receptionist' | 'patient';
}

interface AuthContextType {
  user: User | null;
  role: UserRole['role'] | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (u: string, p: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithCredentials: async () => {},
  resetPassword: async () => {},
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
    
    // Check if there is a local DB staff session
    const staffId = localStorage.getItem('local_staff_id');
    if (staffId) {
      setUser({ uid: staffId, email: localStorage.getItem('local_staff_user') + '@prophysical.com', displayName: localStorage.getItem('local_staff_name') || '' } as unknown as User);
      setRole(localStorage.getItem('local_staff_role') as UserRole['role']);
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
            // Check if user is a staff_user created by admin
            const staffDocRef = doc(db, 'staff_users', firebaseUser.uid);
            const staffDoc = await getDoc(staffDocRef);
            
            if (staffDoc.exists()) {
               setRole(staffDoc.data()?.role as UserRole['role']);
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

    // Try Staff local login
    try {
      const q = query(collection(db, 'staff_users'), where('username', '==', sanitizedU), where('password', '==', p));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const staffDoc = querySnapshot.docs[0];
        const staffData = staffDoc.data();
        
        localStorage.setItem('local_staff_id', staffDoc.id);
        localStorage.setItem('local_staff_user', staffData.username);
        localStorage.setItem('local_staff_name', staffData.name);
        localStorage.setItem('local_staff_role', staffData.role);
        
        setUser({ uid: staffDoc.id, email: staffData.username + '@prophysical.com', displayName: staffData.name } as unknown as User);
        setRole(staffData.role as UserRole['role']);
        return;
      }
    } catch (e) {
      console.error("Staff lookup failed", e);
    }

    // Map generic 'admin' login to an email since Firebase auth requires email
    const email = sanitizedU === 'admin' ? 'admin@prophysical.com' : sanitizedU;

    try {
      await signInWithEmailAndPassword(auth, email, p);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
         throw new Error('Credenciales inválidas o usuario no encontrado en la base de datos.');
      } else if (error.code === 'auth/operation-not-allowed') {
         throw new Error('operation-not-allowed');
      } else {
        throw error;
      }
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
         throw new Error('No existe ningún usuario registrado con ese correo electrónico.');
      } else {
         throw new Error('Error al enviar el correo de recuperación. Intenta nuevamente.');
      }
    }
  };

  const logOut = async () => {
    localStorage.removeItem('demo_admin');
    localStorage.removeItem('local_staff_id');
    localStorage.removeItem('local_staff_user');
    localStorage.removeItem('local_staff_name');
    localStorage.removeItem('local_staff_role');
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && location.pathname.startsWith('/admin')) {
       // Super admin, physio, and receptionist should have access to /admin
       // If user is null, they should be able to see the login screen
       if (user && role !== 'admin' && role !== 'physiotherapist' && role !== 'receptionist') {
         navigate('/', { replace: true });
       }
    }
  }, [loading, location.pathname, role, user, navigate]);

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, signInWithCredentials, resetPassword, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
