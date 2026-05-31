import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { X, Save } from 'lucide-react';
import { Button } from './ui/Button';
import { toast } from 'sonner';

export function PatientModal({ isOpen, onClose, patient }: { isOpen: boolean, onClose: () => void, patient?: any }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient) {
      setFirstName(patient.firstName || '');
      setLastName(patient.lastName || '');
      setPhone(patient.phone || '');
      setEmail(patient.email || '');
    } else {
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
    }
  }, [patient, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (patient && patient.id) {
        await setDoc(doc(db, 'patients', patient.id), {
          firstName,
          lastName,
          phone,
          email,
          updatedAt: Date.now()
        }, { merge: true });
        toast.success("Paciente actualizado exitosamente");
      } else {
        await addDoc(collection(db, 'patients'), {
          firstName,
          lastName,
          phone,
          email,
          createdAt: Date.now()
        });
        toast.success("Paciente registrado exitosamente");
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar paciente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {patient ? 'Editar Paciente' : 'Nuevo Paciente'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nombre(s)</label>
              <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-brand-light outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Apellidos</label>
              <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-brand-light outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 123 456 7890"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-brand-light outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email (Opcional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-brand-light outline-none transition-colors" />
            </div>
          </div>
          <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
             <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
             <Button type="submit" disabled={loading} className="gap-2">
               <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Paciente'}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
