import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
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
    // Keep demo session
    localStorage.removeItem('local_staff_id');
    localStorage.removeItem('local_staff_user');
    localStorage.removeItem('local_staff_name');
    localStorage.removeItem('local_staff_role');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // 1. Check if user is a staff_user first by their active authenticated UID
          const staffDocRef = doc(db, 'staff_users', firebaseUser.uid);
          const staffDoc = await getDoc(staffDocRef);
          
          if (staffDoc.exists()) {
             setRole(staffDoc.data()?.role as UserRole['role']);
          } else {
             // 2. Check if a staff document exists with their authenticated email
             let staffFoundByEmail = false;
             if (firebaseUser.email) {
                 const emailLower = firebaseUser.email.toLowerCase();
                 // Query staff_users by email address
                 const qs = await getDocs(query(collection(db, 'staff_users'), where('email', '==', emailLower)));
                 if (!qs.empty) {
                     const matchedDoc = qs.docs[0];
                     const matchedData = matchedDoc.data();
                     
                     // Migrate/save the document using the authenticated user's real UID
                     await setDoc(doc(db, 'staff_users', firebaseUser.uid), {
                         ...matchedData,
                         email: emailLower
                     });
                     
                     setRole(matchedData.role as UserRole['role']);
                     staffFoundByEmail = true;
                 }
             }
             
             if (!staffFoundByEmail) {
                 // 3. Fall back to checking the 'users' collection for patients/clients
                 const userDocRef = doc(db, 'users', firebaseUser.uid);
                 const userDoc = await getDoc(userDocRef);
                 
                 if (userDoc.exists()) {
                   setRole(userDoc.data()?.role as UserRole['role']);
                 } else {
                   // Default fallback if not found in db records
                   setRole('patient');
                 }
             }
          }
        } catch (e) {
          console.error("Error fetching user role", e);
          setRole(null);
        }
      } else {
        // DEMO BYPASS: Restore if demo_admin is in localStorage
        if (localStorage.getItem('demo_admin') === 'true') {
           const dUid = localStorage.getItem('demo_user_id') || 'demo-admin-id';
           const dRole = (localStorage.getItem('demo_user_role') as UserRole['role']) || 'admin';
           setUser({ uid: dUid, email: 'demo@prophysical.com', displayName: 'Usuario Demo' } as unknown as User);
           setRole(dRole);
           setLoading(false);
           return;
        }
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
    
    // 1. Try to query the DB for this user (could be email or username) without checking password field
    try {
        const usersRef = collection(db, 'staff_users');
        let q = query(usersRef, where('username', '==', sanitizedU));
        let loginSnapshot = await getDocs(q);
        
        if (loginSnapshot.empty && sanitizedU.includes('@')) {
            q = query(usersRef, where('email', '==', sanitizedU));
            loginSnapshot = await getDocs(q);
        }

        if (!loginSnapshot.empty) {
            // We found them in the DB!
            const staffDoc = loginSnapshot.docs[0];
            const staffData = staffDoc.data();
            const emailToUse = staffData.email || `${staffData.username}@prophysical.com`;

            // We must log them into Firebase Auth so rules work!
            try {
                await signInWithEmailAndPassword(auth, emailToUse, p);
                return; // Success!
            } catch (err: any) {
                if (err.code === 'auth/operation-not-allowed') {
                    // DEMO BYPASS: Since Firebase Auth is not active, let them in via localStorage
                    localStorage.setItem('demo_admin', 'true');
                    localStorage.setItem('demo_user_id', staffDoc.id);
                    localStorage.setItem('demo_user_role', staffData.role);
                    setUser({ uid: staffDoc.id, email: emailToUse, displayName: staffData.name } as unknown as User);
                    setRole(staffData.role as UserRole['role']);
                    return;
                }
                
                // If they don't exist in Firebase Auth, or password reset happened, create them!
                if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password') {
                    try {
                        const cred = await createUserWithEmailAndPassword(auth, emailToUse, p);
                        
                        // Migrate the document to the new UID so that `isStaff` rules match request.auth.uid!!
                        if (cred.user.uid !== staffDoc.id) {
                            const { password, ...cleanedData } = staffData;
                            await setDoc(doc(db, 'staff_users', cred.user.uid), { ...cleanedData, email: emailToUse });
                            // Clean up local storage mocks just in case
                            localStorage.removeItem('local_staff_id');
                        }
                        return; // Success creating and logging in!
                    } catch (createErr: any) {
                        if (createErr.code === 'auth/email-already-in-use') {
                            // Already in use but wrong password? Fall through to error
                            throw new Error('La contraseña no coincide con la cuenta del sistema.');
                        } else if (createErr.code === 'auth/operation-not-allowed') {
                            // DEMO BYPASS: Let them in via localStorage since they matched DB
                            localStorage.setItem('demo_admin', 'true');
                            localStorage.setItem('demo_user_id', staffDoc.id);
                            localStorage.setItem('demo_user_role', staffData.role);
                            setUser({ uid: staffDoc.id, email: emailToUse, displayName: staffData.name } as unknown as User);
                            setRole(staffData.role as UserRole['role']);
                            return;
                        }
                        throw createErr;
                    }
                } else {
                    throw err; // Other error
                }
            }
        }
    } catch (e: any) {
        console.warn("DB login check failed:", e);
    }

    // 2. Last fallback: Try pure Firebase Auth
    try {
        let finalEmail = sanitizedU;
        if (!sanitizedU.includes('@')) {
            finalEmail = `${sanitizedU}@prophysical.com`;
        }
        await signInWithEmailAndPassword(auth, finalEmail, p);
    } catch (error: any) {
        if (error.code !== 'auth/operation-not-allowed' && error.code !== 'auth/invalid-email' && error.code !== 'auth/invalid-credential') {
             console.error("Login Error:", error);
        }
        
        // If operation is not allowed, it means Firebase Auth is disabled.
        // But since we already failed the DB check above, it means their username/password
        // was simply wrong. Exposing 'operation-not-allowed' confuses the user.
        throw new Error('Credenciales inválidas o usuario no encontrado en el sistema.');
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
    localStorage.removeItem('demo_user_id');
    localStorage.removeItem('demo_user_role');
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
