import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { Trash2, Loader2, Upload, Users, UserPlus, Pencil, X } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

export function AdminStaff() {
  const { role } = useAuth();
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Staff form state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'physiotherapist' | 'receptionist' | 'admin'>('physiotherapist');
  const [newStaffIsPhysio, setNewStaffIsPhysio] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  if (role !== 'admin') {
    return <div className="p-8"><p className="text-red-500 font-bold">Acceso denegado. Solo administradores pueden ver esta página.</p></div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const staffSnap = await getDocs(query(collection(db, 'staff_users')));
      setStaffUsers(staffSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      console.warn("Firestore Error in AdminStaff fetchData:", e);
      if (e.code === 'permission-denied' || e.message?.includes('Missing or insufficient permissions') || e.message?.includes('permis')) {
          setError('No tienes permisos suficientes para ver los datos del personal. Por favor contacta al administrador principal.');
      } else {
          setError('Error de conexión al cargar los datos. ' + (e.message || ''));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string, type: 'staff_users') => {
    try {
      await deleteDoc(doc(db, type, id));
      toast.success('Eliminado correctamente');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar');
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingStaffId;

    if (!newStaffName || !newStaffUsername) {
       toast.error("Por favor completa los campos obligatorios (Nombre y Usuario)");
       return;
    }

    if (!isEdit && !newStaffPassword) {
       toast.error("La contraseña es obligatoria para nuevos usuarios");
       return;
    }
    
    if (newStaffPassword && newStaffPassword.length < 6) {
       toast.error("La contraseña debe tener al menos 6 caracteres");
       return;
    }
    
    try {
       setCreatingStaff(true);
       
       let uidOrDocId = editingStaffId || newStaffUsername.toLowerCase();
       const firebaseEmail = newStaffEmail ? newStaffEmail.toLowerCase() : `${newStaffUsername.toLowerCase()}@prophysical.com`;
       
       if (!isEdit) {
          // Crear la cuenta en Firebase Auth
          // Use the built-in REST API to avoid secondaryApp state issues or use secondary app correctly
          try {
              const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
              const secondaryAuth = getAuth(secondaryApp);
              const cred = await createUserWithEmailAndPassword(secondaryAuth, firebaseEmail, newStaffPassword);
              await secondaryAuth.signOut();
              uidOrDocId = cred.user.uid;
          } catch (authError: any) {
              if (authError.code === 'auth/operation-not-allowed') {
                  // Bypass because auth isn't enabled. Just use username as ID!
                  uidOrDocId = newStaffUsername.toLowerCase();
                  toast.warning("Modo local: El usuario se guardó solo en DB (Auth deshabilitado en consola).");
              } else {
                  console.error("Error creating in Firebase Auth:", authError);
                  throw new Error("No se pudo registrar el usuario en el sistema de autenticación. Error: " + authError.message);
              }
          }
       }
       
       await setDoc(doc(db, 'staff_users', uidOrDocId), {
          name: newStaffName,
          username: newStaffUsername.toLowerCase(),
          email: newStaffEmail.toLowerCase(),
          role: newStaffRole,
          isPhysiotherapist: newStaffRole === 'admin' ? newStaffIsPhysio : false,
          ...(editingStaffId ? { updatedAt: Date.now() } : { createdAt: Date.now() })
       }, { merge: true });
       
       toast.success(editingStaffId ? "Usuario actualizado exitosamente" : "Usuario de personal creado exitosamente");
       cancelEditStaff();
       fetchData();
    } catch (err: any) {
       console.error("Error saving staff", err);
       toast.error(err.message || "Error al guardar usuario de personal");
    } finally {
       setCreatingStaff(false);
    }
  };

  const startEditStaff = (user: any) => {
    setEditingStaffId(user.id);
    setNewStaffName(user.name || '');
    setNewStaffUsername(user.username || '');
    setNewStaffEmail(user.email || '');
    setNewStaffPassword('');
    setNewStaffRole(user.role || 'physiotherapist');
    setNewStaffIsPhysio(user.isPhysiotherapist || false);
    
    const staffSectionProps = document.getElementById('staff-section');
    if (staffSectionProps) {
       staffSectionProps.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelEditStaff = () => {
    setEditingStaffId(null);
    setNewStaffName('');
    setNewStaffUsername('');
    setNewStaffEmail('');
    setNewStaffPassword('');
    setNewStaffRole('physiotherapist');
    setNewStaffIsPhysio(false);
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-light" size={32} /></div>;
  }

  return (
    <div className="max-w-5xl">
      <div id="staff-section" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-purple-500" size={24}/> Personal (Fisioterapeutas / Recepcionistas)</h2>
            <p className="text-sm text-slate-500 mt-1">Crea y administra usuarios para que puedan iniciar sesión en el panel administrativo.</p>
          </div>
        </div>
        
        <form onSubmit={handleSaveStaff} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 grid md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
           <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Nombre Completo</label>
              <input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 focus:ring-brand-light focus:border-brand-light" placeholder="Ej. Juan Pérez" />
           </div>
           <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Usuario (Alias)</label>
              <input type="text" value={newStaffUsername} onChange={e => setNewStaffUsername(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 focus:ring-brand-light focus:border-brand-light" placeholder="juan.perez" readOnly={!!editingStaffId} title={editingStaffId ? "No se puede cambiar el usuario editando" : ""} />
           </div>
           <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Email</label>
              <input type="email" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 focus:ring-brand-light focus:border-brand-light" placeholder="juan@prophysical.com" />
           </div>
           <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Contraseña</label>
              <input type="password" value={newStaffPassword} onChange={e => setNewStaffPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 focus:ring-brand-light focus:border-brand-light" placeholder="••••••••" />
           </div>
           <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Rol</label>
              <select value={newStaffRole} onChange={e => {
                 const r = e.target.value as any;
                 setNewStaffRole(r);
                 if (r !== 'admin') setNewStaffIsPhysio(false);
              }} className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-brand-light focus:border-brand-light text-slate-700">
                 <option value="physiotherapist">Fisioterapeuta</option>
                 <option value="receptionist">Recepcionista</option>
                 <option value="admin">Admin</option>
              </select>
              {newStaffRole === 'admin' && (
                 <div className="mt-2 flex items-center gap-1.5 bg-purple-50 p-1.5 rounded border border-purple-100">
                    <input type="checkbox" id="also-physio" checked={newStaffIsPhysio} onChange={e => setNewStaffIsPhysio(e.target.checked)} className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer" />
                    <label htmlFor="also-physio" className="text-[10px] font-bold text-purple-700 cursor-pointer select-none uppercase">¿También Fisioterapeuta?</label>
                 </div>
              )}
           </div>
           <div className="lg:col-span-1 flex gap-2 w-full h-[42px]">
              <button disabled={creatingStaff} className="w-full bg-purple-600 text-white rounded-lg px-2 font-medium hover:bg-purple-700 transition flex justify-center items-center gap-1 disabled:opacity-50">
                {creatingStaff ? <Loader2 size={16} className="animate-spin" /> : (editingStaffId ? <Upload size={16} /> : <UserPlus size={16} />)}
              </button>
              {editingStaffId && (
                 <button type="button" onClick={cancelEditStaff} className="w-full bg-slate-200 text-slate-700 rounded-lg px-2 font-medium hover:bg-slate-300 transition flex justify-center items-center">
                    <X size={16} />
                 </button>
              )}
           </div>
        </form>

        {error ? (
          <div className="text-center py-12 text-red-500 border-2 border-dashed border-red-200 rounded-xl bg-red-50 font-medium px-4">
             {error}
          </div>
        ) : staffUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">No hay personal registrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-slate-200">
                     <th className="py-3 font-semibold text-slate-600 text-sm">Nombre</th>
                     <th className="py-3 font-semibold text-slate-600 text-sm">Usuario (Alias)</th>
                     <th className="py-3 font-semibold text-slate-600 text-sm">Email</th>

                     <th className="py-3 font-semibold text-slate-600 text-sm">Rol</th>
                     <th className="py-3 text-right font-semibold text-slate-600 text-sm">Acciones</th>
                  </tr>
               </thead>
               <tbody>
                  {staffUsers.map(user => (
                     <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="py-3 whitespace-nowrap text-slate-800 font-medium">{user.name}</td>
                        <td className="py-3 whitespace-nowrap text-slate-600 font-semibold">{user.username}</td>
                        <td className="py-3 whitespace-nowrap text-slate-500">{user.email || '-'}</td>

                        <td className="py-3 whitespace-nowrap">
                           <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'physiotherapist' ? 'bg-cyan-100 text-cyan-800' : 'bg-orange-100 text-orange-800'}`}>
                                {user.role}
                              </span>
                              {user.role === 'admin' && user.isPhysiotherapist && (
                                 <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-100 text-cyan-800 border border-cyan-200 uppercase">
                                   + Fisioterapeuta
                                 </span>
                              )}
                           </div>
                        </td>
                        <td className="py-3 text-right">
                           <div className="flex justify-end gap-2">
                             <button onClick={() => startEditStaff(user)} className="text-slate-500 hover:text-white hover:bg-purple-500 p-2 rounded-lg transition-colors">
                                <Pencil size={18} />
                             </button>
                             <button onClick={() => handleDelete(user.id, 'staff_users')} className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-colors">
                                <Trash2 size={18} />
                             </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
