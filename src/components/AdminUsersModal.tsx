import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import { X, UserX, Edit2 } from 'lucide-react';

export function AdminUsersModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'physiotherapist' | 'receptionist'>('receptionist');

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
       toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // Simple logic: we use email as document ID or a hash. For demo we can just use the email mapped to basic string as an ID since actual Auth UID isn't generated here without creating a real auth user first.
    // In a real app we'd create the auth user, then write to /users/{uid}.
    // For this prompt's requirement (CRUD on /users), we'll simulate it by writing a doc with an ID derived from email
    const id = editingId || email.replace(/[^a-zA-Z0-9]/g, '');
    try {
       await setDoc(doc(db, 'users', id), { email, role });
       toast.success(editingId ? "Usuario actualizado" : "Usuario creado");
       setEditingId(null);
       setEmail('');
       setRole('receptionist');
       fetchUsers();
    } catch(e) {
       toast.error("Error al guardar usuario");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro de que deseas eliminar este usuario?')) return;
    try {
       await deleteDoc(doc(db, 'users', id));
       toast.success("Usuario eliminado");
       fetchUsers();
    } catch (e) {
       toast.error("Error al eliminar");
    }
  };

  const handleEdit = (u: any) => {
    setEditingId(u.id);
    setEmail(u.email);
    setRole(u.role);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white max-w-2xl w-full rounded-3xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-display font-bold text-slate-800">Gestionar Staff</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4">{editingId ? 'Editar Staff' : 'Nuevo Staff'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!!editingId}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand-light outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Rol</label>
                <select value={role} onChange={e => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand-light outline-none bg-white">
                  <option value="receptionist">Recepción</option>
                  <option value="physiotherapist">Fisioterapeuta</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {editingId && <Button type="button" variant="outline" onClick={() => {setEditingId(null); setEmail(''); setRole('receptionist');}}>Cancelar</Button>}
              <Button type="submit">{editingId ? 'Actualizar' : 'Añadir Staff'}</Button>
            </div>
          </form>

          <h3 className="font-bold text-slate-700 mb-4">Personal Registrado</h3>
          {loading ? (
             <p className="text-sm text-slate-500">Cargando...</p>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div>
                    <p className="font-bold text-slate-800">{u.email}</p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-light/10 text-brand-dark uppercase">
                      {u.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(u)} className="p-2 text-slate-400 hover:text-brand-light hover:bg-brand-light/10 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <UserX size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
