import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, writeBatch, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';

export function BookingForm() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [service, setService] = useState('Fisioterapia');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState('');
  const [unavailableHours, setUnavailableHours] = useState<string[]>([]);

  const availableHours = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  React.useEffect(() => {
    async function checkAvailability() {
      if (!date) {
        setUnavailableHours([]);
        return;
      }
      try {
        const q = query(collection(db, 'appointments'), where('date', '==', date));
        const snap = await getDocs(q);
        const counts: Record<string, number> = {};
        snap.docs.forEach(doc => {
          if (doc.data().status !== 'cancelled') {
            const t = doc.data().time;
            counts[t] = (counts[t] || 0) + 1;
          }
        });
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
  }, [date, time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(collection(db, 'appointments'), where('date', '==', date));
      const snap = await getDocs(q);
      
      const timeCount = snap.docs.filter(d => d.data().time === time && d.data().status !== 'cancelled').length;
      
      if (timeCount >= 3) {
        toast.error('Lo sentimos, este horario ya está lleno. Por favor, selecciona otra hora o día.');
        setLoading(false);
        return;
      }

      // Because we use split documents for PII, we need to generate an ID
      const newDocRef = doc(collection(db, 'appointments'));
      
      const batch = writeBatch(db);
      
      batch.set(newDocRef, {
        date,
        time,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
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
    const calendarParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Cita: ${service}`,
      dates: `${date.replace(/-/g, '')}T${time.replace(':', '')}00Z/${date.replace(/-/g, '')}T${Number(time.split(':')[0])+1}0000Z`,
      details: 'Cita en ProPhysical',
      location: 'ProPhysical Fisioterapia y Rehabilitación'
    });
    
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-sm">
         <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
           <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
           </svg>
         </div>
         <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Cita Solicitada con Éxito!</h3>
         <p className="text-slate-600 mb-8 font-medium">Nos contactaremos contigo por WhatsApp para la confirmación final.</p>
         
         <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a 
              href={`https://calendar.google.com/calendar/render?${calendarParams.toString()}`}
              target="_blank" rel="noopener noreferrer"
              className="bg-white border-2 border-brand-light text-brand-dark px-6 py-3 rounded-xl font-bold hover:bg-brand-light/10 transition-colors shadow-sm"
            >
              Agregar a Google Calendar
            </a>
            <a 
              href={`https://wa.me/1234567890?text=Hola, acabo de agendar una cita para el ${date} a las ${time} para ${service}. Mi código es ${successId.slice(0,6)}`}
              target="_blank" rel="noopener noreferrer"
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Avisar por WhatsApp
            </a>
         </div>
         <div className="mt-8">
           <Button variant="ghost" onClick={() => {
             setSuccessId('');
             setDate(''); setTime(''); setName(''); setPhone('');
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
               <option>Fisioterapia General</option>
               <option>Rehabilitación Deportiva</option>
               <option>Descarga Muscular</option>
               <option>Terapia Geriátrica</option>
             </select>
           </div>
           
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Preferida</label>
             <input 
               type="date" required min={new Date().toISOString().split('T')[0]}
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
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono / WhatsApp</label>
             <input 
               type="tel" required placeholder="099 999 9999"
               value={phone} onChange={(e) => setPhone(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/20 transition-all font-medium text-slate-700" 
             />
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
