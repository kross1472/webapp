import { Outlet, Link, useNavigate } from "react-router-dom";
import { Users, Calendar as CalendarIcon, FileText, Settings, LogOut, Activity, Lock, UserCheck } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { Button } from "../components/ui/Button";
import React, { useState } from "react";

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, role, loading, signInWithGoogle, signInWithCredentials, logOut } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const { resetPassword } = useAuth();

  const handleLogout = async () => {
    await logOut();
    navigate("/");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus("");
    if (!resetEmail) {
       setResetStatus("El correo electrónico es requerido.");
       return;
    }
    
    try {
       await resetPassword(resetEmail);
       setResetStatus("Se ha enviado un correo para restablecer la contraseña (revisa tu bandeja de spam si no lo ves).");
    } catch (e: any) {
       setResetStatus(e.message || "Error al solicitar restablecimiento.");
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        setLoginError("La ventana de Google fue bloqueada o cancelada. Si estás en la vista previa, necesitas abrir la app en una nueva pestaña (icono arriba a la derecha).");
        return;
      }
      if (e.code === 'auth/operation-not-allowed') {
        setLoginError("El inicio de sesión con Google NO está habilitado. Por favor actívalo en la consola de Firebase > Authentication > Sign-in method.");
        return;
      }
      setLoginError(e.message || "Error al iniciar sesión con Google.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      await signInWithCredentials(username, password);
    } catch (e: any) {
      if (e.message.includes('NOT está habilitada') || e.message.includes('NO está habilitada') || e.message.includes('operation-not-allowed') || e.message.includes('Error:')) {
         setLoginError(e.message.replace('Error: ', ''));
      } else {
         setLoginError(e.message || "Credenciales inválidas o error de autenticación.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Activity className="animate-spin text-brand-light" size={32} /></div>;
  }

  if (!user || (role !== 'admin' && role !== 'physiotherapist' && role !== 'receptionist')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 text-center">
          <div className="bg-brand-light/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-brand-dark">
             <Lock size={32} />
          </div>
          
          {isResetMode ? (
             <>
               <h1 className="text-2xl font-display font-bold text-slate-800 mb-2">Recuperar Acceso</h1>
               <p className="text-slate-500 mb-6 text-sm">Ingresa tu correo para restablecer la contraseña.</p>
               
               <form onSubmit={handleResetPassword} className="space-y-4 mb-6 text-left">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                   <input 
                     type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                     placeholder="ejemplo@prophysical.com"
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-brand-light transition-all" 
                   />
                 </div>
                 {resetStatus && <p className={`text-xs font-medium ${resetStatus.includes('enviado') ? 'text-green-600' : 'text-red-500'}`}>{resetStatus}</p>}
                 <Button type="submit" className="w-full gap-2 text-md h-12 shadow-md">
                   Enviar Enlace
                 </Button>
               </form>
               <button type="button" onClick={() => setIsResetMode(false)} className="text-brand-light hover:underline font-medium text-sm">
                 Volver al inicio de sesión
               </button>
             </>
          ) : (
             <>
               <h1 className="text-2xl font-display font-bold text-slate-800 mb-2">Acceso Restringido</h1>
               <p className="text-slate-500 mb-6 text-sm">Ingrese sus credenciales de staff para acceder al panel.</p>
               
               <form onSubmit={handleLogin} className="space-y-4 mb-6 text-left">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Usuario o Correo</label>
                   <input 
                     type="text" required value={username} onChange={e => setUsername(e.target.value)}
                     placeholder="Ej. admin o juan@prophysical.com"
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-brand-light transition-all" 
                   />
                 </div>
                 <div>
                   <div className="flex justify-between items-center mb-1">
                     <label className="block text-sm font-bold text-slate-700">Contraseña</label>
                     <button type="button" onClick={() => setIsResetMode(true)} className="text-xs text-brand-light hover:underline font-medium">¿Olvidaste tu contraseña?</button>
                   </div>
                   <input 
                     type="password" required value={password} onChange={e => setPassword(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-brand-light transition-all" 
                   />
                 </div>
                 {loginError && <p className="text-red-500 text-xs font-medium">{loginError}</p>}
                 <Button type="submit" disabled={isLoggingIn} className="w-full gap-2 text-md h-12 shadow-md">
                   {isLoggingIn ? "Ingresando..." : "Iniciar Sesión"}
                 </Button>
               </form>

               <div className="relative mb-6">
                 <div className="absolute inset-0 flex items-center">
                   <div className="w-full border-t border-slate-200"></div>
                 </div>
                 <div className="relative flex justify-center text-sm">
                   <span className="px-2 bg-white text-slate-400 font-medium">O alternativamente</span>
                 </div>
               </div>

               <Button type="button" variant="ghost" onClick={handleGoogleLogin} className="w-full gap-2 text-md h-12 shadow-sm border border-slate-200">
                 <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-1 opacity-70" />
                 Ingresar con Google
               </Button>
             </>
          )}

          <p className="mt-8 text-sm text-slate-400">
            ¿Es paciente? <Link to="/" className="text-brand-light hover:underline font-medium">Volver al inicio</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-dark fixed inset-y-0 left-0 flex flex-col text-white shadow-xl z-20">
        <div className="p-4 flex items-center justify-center border-b border-white/10 bg-white/10 mt-2 mb-2 mx-4 rounded-xl shadow-inner">
          <img src="/logo.jpeg" alt="ProPhysical Logo" className="h-16 w-auto object-contain bg-white rounded-lg p-2" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
           <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 text-white font-medium">
             <CalendarIcon size={18} className="text-brand-light" /> Inicio / Agenda
           </Link>
           <Link to="/admin/patients" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors">
             <Users size={18} /> Pacientes
           </Link>
           <Link to="/admin/history/new" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors">
             <FileText size={18} /> Historias Clínicas
           </Link>
           {(role === 'admin' || role === 'receptionist') && (
             <>
               <Link to="/admin/content" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                 <Settings size={18} /> Sitio Web
               </Link>
               <Link to="/admin/staff" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                 <UserCheck size={18} /> Personal
               </Link>
             </>
           )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 hover:text-red-300 rounded-lg text-sm font-medium transition-colors">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
              <h1 className="text-2xl font-display font-bold text-slate-800">Panel Administrativo</h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                {role === 'admin' ? 'Personal Administrativo' : role === 'physiotherapist' ? 'Fisioterapeuta' : role === 'receptionist' ? 'Recepcionista' : role}
              </span>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
               <p className="text-sm font-bold text-slate-800">{user.displayName}</p>
               <p className="text-xs text-slate-500">{user.email}</p>
             </div>
             {user.photoURL ? (
               <img src={user.photoURL} alt="Avatar" className="h-10 w-10 rounded-full shadow-sm border-2 border-white" />
             ) : (
               <div className="h-10 w-10 bg-brand-light/20 text-brand-dark rounded-full flex items-center justify-center font-bold">
                 {user.email?.charAt(0).toUpperCase()}
               </div>
             )}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
