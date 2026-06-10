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
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  // Obtener rol desde Firestore — SOLO LECTURA, nunca escribe
  // Orden:
  //   1. staff_users por UID
  //   2. staff_users por email (compatibilidad documentos viejos)
  //   3. users por UID
  //   4. patient por defecto
  // ---------------------------------------------------------------------------
  const fetchUserRole = async (firebaseUser: User): Promise<UserRole['role']> => {
    // 1. Buscar en staff_users por UID (estructura correcta)
    try {
      const staffSnap = await getDoc(doc(db, 'staff_users', firebaseUser.uid));
      if (staffSnap.exists()) {
        return staffSnap.data().role as UserRole['role'];
      }
    } catch (e) {
      console.warn('[AuthContext] Error al buscar staff por UID:', e);
    }

    // 2. Buscar en staff_users por email (compatibilidad con documentos viejos)
    if (firebaseUser.email) {
      try {
        const emailLower = firebaseUser.email.toLowerCase();
        const qs = await getDocs(
          query(collection(db, 'staff_users'), where('email', '==', emailLower))
        );
        if (!qs.empty) {
          return qs.docs[0].data().role as UserRole['role'];
        }
      } catch (e) {
        console.warn('[AuthContext] Error al buscar staff por email:', e);
      }
    }

    // 3. Buscar en users por UID (pacientes)
    try {
      const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userSnap.exists()) {
        return userSnap.data().role as UserRole['role'];
      }
    } catch (e) {
      console.warn('[AuthContext] Error al buscar usuario por UID:', e);
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
          console.error('[AuthContext] Error al obtener rol:', e);
          setRole('patient');
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
  //   1. Si contiene @ → usa como email directamente
  //   2. Si no → busca el email en staff_users por username
  //   3. Autentica con Firebase Auth
  //   NUNCA escribe en Firestore
  //   NUNCA compara password contra Firestore
  // ---------------------------------------------------------------------------
  const signInWithCredentials = async (u: string, p: string) => {
    const sanitized = u.trim().toLowerCase();
    let emailToUse: string;

    if (sanitized.includes('@')) {
      emailToUse = sanitized;
    } else {
      // Buscar email por username en staff_users
      try {
        const snapshot = await getDocs(
          query(collection(db, 'staff_users'), where('username', '==', sanitized))
        );

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
      } catch (e: any) {
        if (e.message) throw e;
        throw new Error('Error al buscar el usuario. Intenta nuevamente.');
      }
    }

    // Autenticar con Firebase Auth
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
