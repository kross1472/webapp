import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, writeBatch, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

export function BookingForm() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [service, setService] = useState('Fisioterapia y Rehabilitacion');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const { role } = useAuth();
  const [physiotherapists, setPhysiotherapists] = useState<any[]>([]);
  const [selectedPhysioId, setSelectedPhysioId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState('');
  const [unavailableHours, setUnavailableHours] = useState<string[]>([]);

  const availableHours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

  React.useEffect(() => {
    if (role === 'admin' || role === 'receptionist' || role === 'physiotherapist') {
      const fetchPhysios = async () => {
        let users1: any[] = [];
        let users2: any[] = [];
        
        try {
          const qSnap1 = await getDocs(query(collection(db, 'staff_users')));
          users1 = qSnap1.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn("Error fetching staff_users list in BookingForm:", e);
        }

        try {
          const qSnap2 = await getDocs(query(collection(db, 'users')));
          users2 = qSnap2.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn("Error fetching users list in BookingForm:", e);
        }
        
        const allUsers = [...users1, ...users2];
        const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());
        
        setPhysiotherapists(uniqueUsers.filter((u: any) => u.role === 'physiotherapist' || (u.role === 'admin' && u.isPhysiotherapist === true)));
      };
      fetchPhysios();
    }
  }, [role]);

  React.useEffect(() => {
    async function checkAvailability() {
      if (!date) {
        setUnavailableHours([]);
        return;
      }
      try {
        const q = query(collection(db, 'appointments'), where('date', '==', date));
        const snap = await getDocs(q);
        
        // We need to check service in subcollection if not in main doc, or just fetch all appointments for the date and check service if it exists.
        // Actually, let's just query by date, then filter by service if available in main doc.
        const counts: Record<string, number> = {};
        for (const docSnapshot of snap.docs) {
          const data = docSnapshot.data();
          if (data.status === 'confirmed') {
            // Support older appointments that don't have service in main doc by checking if it matches or if it's missing (assume it could be the same)
            // But if we start saving service in main doc, we can just check data.service
            // For backward compatibility, we'll fetch details if service is missing? That's too many reads.
            // Let's assume we match where data.service === service or if data.service is missing, we still count it or ignore? Let's ignore it unless it matches.
            let docService = data.service;
            if (docService === service || docService === undefined) { 
              const t = data.time;
              counts[t] = (counts[t] || 0) + 1;
            }
          }
        }
        const full = Object.keys(counts).filter(t => counts[t] >= 3);
        setUnavailableHours(full);
        if (full.includes(time)) {
          setTime('');
        }
      } catch(e) {
        console.error(e);
      }
    }
    checkAvailability();
  }, [date, time, service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(collection(db, 'appointments'), where('date', '==', date));
      const snap = await getDocs(q);
      
      const timeCount = snap.docs.filter(d => {
        const data = d.data();
        return data.time === time && data.status === 'confirmed' && (data.service === service || data.service === undefined);
      }).length;
      
      if (timeCount >= 3) {
        toast.error('Lo sentimos, este horario ya está lleno para ese servicio. Por favor, selecciona otra hora o día.');
        setLoading(false);
        return;
      }

      // Because we use split documents for PII, we need to generate an ID
      const newDocRef = doc(collection(db, 'appointments'));
      
      const batch = writeBatch(db);
      
      const appointmentData: any = {
        date,
        time,
        service, // Added here to make it easier to query
        status: (role === 'admin' || role === 'receptionist' || role === 'physiotherapist') ? 'confirmed' : 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if ((role === 'admin' || role === 'receptionist' || role === 'physiotherapist') && selectedPhysioId) {
        appointmentData.physiotherapistId = selectedPhysioId;
      }

      batch.set(newDocRef, appointmentData);
      
      const detailsRef = doc(db, 'appointments', newDocRef.id, 'details', 'info');
      batch.set(detailsRef, {
        patientName: name,
        patientPhone: phone,
        service: service
      });

      await batch.commit();

      setSuccessId(newDocRef.id);
    } catch (error: any) {
      console.error(error);
      toast.error('Error agendando cita: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (successId) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm">
         <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
           <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
           </svg>
         </div>
         <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Cita Solicitada con Éxito!</h3>
         <p className="text-slate-600 mb-8 font-medium">Nos contactaremos contigo por WhatsApp para la confirmación final.</p>
         
         <div className="flex flex-col flex-wrap sm:flex-row justify-center gap-4">
            <a 
              href={`https://wa.me/593983558404?text=Hola, acabo de agendar una cita para el ${date} a las ${time} para ${service}. Mi código es ${successId.slice(0,6)}`}
              target="_blank" rel="noopener noreferrer"
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Confirmar por WhatsApp
            </a>
         </div>
         <div className="mt-8">
           <Button variant="ghost" onClick={() => {
             setSuccessId('');
             setDate(''); setTime(''); setName(''); setPhone(''); setSelectedPhysioId('');
           }}>Agendar otra cita</Button>
         </div>
      </div>
    );
  }

  return (
    <form id="booking-form-core" onSubmit={handleSubmit} className="bg-white/50 backdrop-blur-sm shadow-xl border border-slate-200 p-8 rounded-3xl max-w-3xl mx-auto mt-8 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Servicio</label>
             <select 
               required
               value={service} onChange={(e) => setService(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/20 transition-all font-medium text-slate-700"
             >
               <option>Fisioterapia y Rehabilitacion</option>
               <option>Descarga Muscular</option>
               <option>Masaje Terapeutico (relajante-descontracturante)</option>
               <option>Crioterapia</option>
             </select>
           </div>
           
           {(role === 'admin' || role === 'receptionist' || role === 'physiotherapist') && (
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Fisioterapeuta Asignado (Opcional)</label>
               <select 
                 value={selectedPhysioId} onChange={(e) => setSelectedPhysioId(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/20 transition-all font-medium text-slate-700"
               >
                 <option value="">Sin asignar (Cualquiera)</option>
                 {physiotherapists.map(p => (
                   <option key={p.id} value={p.id}>{p.firstName || p.name} {p.lastName || ''}</option>
                 ))}
               </select>
             </div>
           )}
           
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Preferida</label>
             <input 
               type="date" required min={(role === 'admin' || role === 'receptionist' || role === 'physiotherapist') ? undefined : new Date().toISOString().split('T')[0]}
               value={date} onChange={(e) => setDate(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/20 transition-all font-medium text-slate-700" 
             />
           </div>

           <div>
             <label className="block text-sm font-bold text-slate-700 mb-3">Hora Preferida</label>
             <div className="grid grid-cols-3 gap-2">
               {availableHours.map(h => (
                 <button 
                   type="button" key={h}
                   onClick={() => setTime(h)}
                   disabled={unavailableHours.includes(h)}
                   className={`px-2 py-2 rounded-lg text-sm font-bold transition-colors border ${
                     unavailableHours.includes(h)
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                      : time === h 
                      ? 'bg-brand-light text-white border-brand-light cursor-pointer' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-brand-light/50 cursor-pointer'
                   }`}
                 >
                   {h}
                 </button>
               ))}
             </div>
           </div>
        </div>

        <div className="space-y-6">
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo</label>
             <input 
               type="text" required placeholder="Ej. Juan Pérez"
               value={name} onChange={(e) => setName(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/20 transition-all font-medium text-slate-700" 
             />
           </div>
           <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono / WhatsApp</label>
               <input 
                 type="tel" required placeholder="099 999 9999"
                 value={phone} onChange={(e) => setPhone(e.target.value)}
                 className={`w-full bg-white border ${phone && !(/^\+?[0-9\s-]{9,15}$/.test(phone) && phone.replace(/[\s-]/g, '').length >= 9) ? 'border-red-400 focus:border-red-500 focus:ring-red-400/20 text-red-700' : 'border-slate-200 focus:border-brand-light focus:ring-brand-light/20 text-slate-700'} rounded-xl px-4 py-3 outline-none focus:ring-2 transition-all font-medium`} 
               />
               {phone && !(/^\+?[0-9\s-]{9,15}$/.test(phone) && phone.replace(/[\s-]/g, '').length >= 9) && (
                 <p className="mt-1.5 text-xs text-red-500 font-medium">Formato inválido. Ingrese un número válido.</p>
               )}
             </div>
           </div>

           <div className="pt-4 border-t border-slate-100">
             <Button type="submit" size="lg" className="w-full shadow-lg h-14 text-lg" disabled={!time || !date || loading}>
               {loading ? 'Procesando...' : 'Confirmar Solicitud'}
             </Button>
             <p className="text-center text-xs text-slate-400 mt-4 font-medium uppercase tracking-wider">Tus datos están protegidos y encriptados</p>
           </div>
        </div>
      </div>
    </form>
  )
}
