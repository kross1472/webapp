import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';

// =============================================================================
// TIPOS
// =============================================================================

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

// =============================================================================
// CONTEXTO
// =============================================================================

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithCredentials: async () => {},
  resetPassword: async () => {},
  logOut: async () => {},
});

// =============================================================================
// PROVIDER
// =============================================================================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole['role'] | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Obtener rol desde Firestore
  // Orden: staff_users por UID → staff_users por email (migración) → users por UID → patient
  // ---------------------------------------------------------------------------
  const fetchUserRole = async (firebaseUser: User): Promise<UserRole['role']> => {
    // 1. Buscar en staff_users por UID (estructura correcta)
    const staffRef = doc(db, 'staff_users', firebaseUser.uid);
    const staffSnap = await getDoc(staffRef);
    if (staffSnap.exists()) {
      return staffSnap.data().role as UserRole['role'];
    }

    // 2. Buscar en staff_users por email (migración de documentos viejos)
    if (firebaseUser.email) {
      const emailLower = firebaseUser.email.toLowerCase();
      const qs = await getDocs(
        query(collection(db, 'staff_users'), where('email', '==', emailLower))
      );
      if (!qs.empty) {
        const matchedDoc = qs.docs[0];
        const matchedData = matchedDoc.data();

        // Migrar el documento al UID correcto
        await setDoc(doc(db, 'staff_users', firebaseUser.uid), {
          ...matchedData,
          email: emailLower,
        });

        return matchedData.role as UserRole['role'];
      }
    }

    // 3. Buscar en users por UID (pacientes/clientes)
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().role as UserRole['role'];
    }

    // 4. Por defecto: paciente
    return 'patient';
  };

  // ---------------------------------------------------------------------------
  // Observer de autenticación
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          setUser(firebaseUser);
          const userRole = await fetchUserRole(firebaseUser);
          setRole(userRole);
        } catch (e) {
          console.error('Error fetching user role:', e);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ---------------------------------------------------------------------------
  // Login con Google
  // ---------------------------------------------------------------------------
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      if (
        e.code === 'auth/cancelled-popup-request' ||
        e.code === 'auth/popup-closed-by-user'
      ) {
        throw new Error('La ventana de Google fue cerrada. Intenta nuevamente.');
      }
      if (e.code === 'auth/operation-not-allowed') {
        throw new Error('El inicio de sesión con Google no está habilitado en Firebase.');
      }
      throw new Error(e.message || 'Error al iniciar sesión con Google.');
    }
  };

  // ---------------------------------------------------------------------------
  // Login con username o email + password
  // Flujo:
  //   1. Si es username → busca el email en staff_users
  //   2. Autentica con Firebase Auth usando email + password
  //   NUNCA crea usuarios automáticamente
  //   NUNCA compara password contra Firestore
  // ---------------------------------------------------------------------------
  const signInWithCredentials = async (u: string, p: string) => {
    const sanitized = u.trim().toLowerCase();
    let emailToUse: string;

    if (sanitized.includes('@')) {
      // Ingresó un email directamente
      emailToUse = sanitized;
    } else {
      // Buscar el email asociado al username en staff_users
      const q = query(
        collection(db, 'staff_users'),
        where('username', '==', sanitized)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('Usuario no encontrado en el sistema.');
      }

      const staffData = snapshot.docs[0].data();
      if (!staffData.email) {
        throw new Error(
          'Este usuario no tiene un correo asociado. Contacta al administrador.'
        );
      }

      emailToUse = staffData.email.toLowerCase();
    }

    // Autenticar con Firebase Auth — el password se valida aquí, nunca en Firestore
    try {
      await signInWithEmailAndPassword(auth, emailToUse, p);
    } catch (e: any) {
      if (
        e.code === 'auth/wrong-password' ||
        e.code === 'auth/invalid-credential' ||
        e.code === 'auth/invalid-login-credentials'
      ) {
        throw new Error('Contraseña incorrecta.');
      }
      if (e.code === 'auth/user-not-found') {
        throw new Error(
          'Usuario no registrado en el sistema de autenticación. Contacta al administrador.'
        );
      }
      if (e.code === 'auth/too-many-requests') {
        throw new Error(
          'Demasiados intentos fallidos. Espera unos minutos e intenta nuevamente.'
        );
      }
      if (e.code === 'auth/user-disabled') {
        throw new Error(
          'Esta cuenta ha sido deshabilitada. Contacta al administrador.'
        );
      }
      throw new Error('Credenciales inválidas o usuario no encontrado en el sistema.');
    }
  };

  // ---------------------------------------------------------------------------
  // Recuperar contraseña
  // ---------------------------------------------------------------------------
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        throw new Error(
          'No existe ningún usuario registrado con ese correo electrónico.'
        );
      }
      throw new Error(
        'Error al enviar el correo de recuperación. Intenta nuevamente.'
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Cerrar sesión
  // ---------------------------------------------------------------------------
  const logOut = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  // ---------------------------------------------------------------------------
  // Protección de rutas /admin
  // ---------------------------------------------------------------------------
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && location.pathname.startsWith('/admin')) {
      if (
        user &&
        role !== 'admin' &&
        role !== 'physiotherapist' &&
        role !== 'receptionist'
      ) {
        navigate('/', { replace: true });
      }
    }
  }, [loading, location.pathname, role, user, navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        signInWithGoogle,
        signInWithCredentials,
        resetPassword,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
