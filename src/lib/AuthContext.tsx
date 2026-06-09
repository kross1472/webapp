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
    // 0. Superusuario por Email directamente en cliente
    if (firebaseUser.email) {
      const emailLower = firebaseUser.email.toLowerCase().trim();
      if (
        emailLower === 'cristhian.a.carrera@gmail.com' ||
        emailLower === 'admin@prophysical.com'
      ) {
        // Asegurar de manera asíncrona no bloqueante que el superusuario tenga su registro de staff en Firestore
        (async () => {
          try {
            const staffRef = doc(db, 'staff_users', firebaseUser.uid);
            const staffSnap = await getDoc(staffRef);
            if (!staffSnap.exists()) {
              await setDoc(staffRef, {
                name: firebaseUser.displayName || 'Super Admin',
                username: emailLower.split('@')[0],
                email: emailLower,
                role: 'admin',
                isPhysiotherapist: true,
                createdAt: new Date().toISOString()
              });
              console.log('[AuthContext] Superusuario registrado en staff_users exitosamente');
            }
          } catch (writeErr) {
            console.warn('[AuthContext] Error silencioso al asegurar registro de staff:', writeErr);
          }
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                email: emailLower,
                role: 'admin',
                displayName: firebaseUser.displayName || 'Super Admin',
                createdAt: Date.now(),
                updatedAt: Date.now()
              });
              console.log('[AuthContext] Superusuario registrado en users exitosamente');
            }
          } catch (writeErr) {
            console.warn('[AuthContext] Error silencioso al asegurar registro en users:', writeErr);
          }
        })();
        return 'admin';
      }
    }

    // Helper para reintentar lectura en caso de retardo en propagación de token de autenticación
    const getDocWithRetry = async (ref: any, retries = 3, delay = 150): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          return await getDoc(ref);
        } catch (error: any) {
          const isPermissionErr = error?.message?.toLowerCase().includes('permission') || 
                                  error?.code === 'permission-denied';
          if (isPermissionErr && i < retries - 1) {
            console.warn(`[AuthContext] Retraso en sincronización de token. Reintentando lectura en ${delay}ms... (intento ${i + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          } else {
            throw error;
          }
        }
      }
    };

    const getDocsWithRetry = async (colQuery: any, retries = 3, delay = 150): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          return await getDocs(colQuery);
        } catch (error: any) {
          const isPermissionErr = error?.message?.toLowerCase().includes('permission') || 
                                  error?.code === 'permission-denied';
          if (isPermissionErr && i < retries - 1) {
            console.warn(`[AuthContext] Retraso en sincronización de token de consulta. Reintentando en ${delay}ms... (intento ${i + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          } else {
            throw error;
          }
        }
      }
    };

    // 1. Buscar en staff_users por UID (estructura correcta)
    try {
      const staffRef = doc(db, 'staff_users', firebaseUser.uid);
      const staffSnap = await getDocWithRetry(staffRef);
      if (staffSnap.exists()) {
        return staffSnap.data().role as UserRole['role'];
      }
    } catch (e) {
      console.warn('[AuthContext] Error no crítico al buscar staff por UID:', e);
    }

    // 2. Buscar en staff_users por email (migración de documentos viejos)
    if (firebaseUser.email) {
      try {
        const emailLower = firebaseUser.email.toLowerCase();
        const qs = await getDocsWithRetry(
          query(collection(db, 'staff_users'), where('email', '==', emailLower))
        );
        if (!qs.empty) {
          const matchedDoc = qs.docs[0];
          const matchedData = matchedDoc.data();

          // Migrar el documento al UID correcto de forma silenciosa de manera independiente
          const usernameToUse = matchedData.username || matchedDoc.id;
          const updatedData = {
            ...matchedData,
            username: usernameToUse,
            email: emailLower,
            isPhysiotherapist: matchedData.role === 'physiotherapist' || matchedData.isPhysiotherapist || false,
          };

          // 1. Guardar en staff_users
          try {
            await setDoc(doc(db, 'staff_users', firebaseUser.uid), updatedData);
            console.log('[AuthContext] Migración a staff_users exitosa para', emailLower);
          } catch (writeErr) {
            console.warn('[AuthContext] Error silencioso al migrar documento de staff a staff_users:', writeErr);
          }

          // 2. Guardar en users (doble capa de seguridad para isStaff)
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              email: emailLower,
              role: matchedData.role,
              displayName: firebaseUser.displayName || matchedData.name || 'Personal',
              createdAt: matchedData.createdAt || Date.now(),
              updatedAt: Date.now()
            });
            console.log('[AuthContext] Sincronización a users exitosa para', emailLower);
          } catch (writeErr) {
            console.warn('[AuthContext] Error silencioso al sincronizar documento de staff a users:', writeErr);
          }

          return matchedData.role as UserRole['role'];
        }
      } catch (e) {
        console.warn('[AuthContext] Error no crítico al buscar staff por correo:', e);
      }
    }

    // 3. Buscar en users por UID (pacientes/clientes)
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDocWithRetry(userRef);
      if (userSnap.exists()) {
        return userSnap.data().role as UserRole['role'];
      }
    } catch (e) {
      console.warn('[AuthContext] Error no crítico al buscar usuario por UID:', e);
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
