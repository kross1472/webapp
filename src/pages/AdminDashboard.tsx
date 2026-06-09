// imports...
import { Users, Calendar as CalendarIcon, TrendingUp, Activity, FileText, CheckCircle, UserPlus, List, Grid, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, getDoc, doc, updateDoc, getDocs, addDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";
import { AdminCalendarView } from "../components/AdminCalendarView";
import { BookingForm } from "../components/BookingForm";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const [physiotherapists, setPhysiotherapists] = useState<any[]>([]);

  useEffect(() => {
    if (!role || role === 'patient') return;
    const fetchPhysios = async () => {
      let users1: any[] = [];
      let users2: any[] = [];
      
      try {
        const qSnap1 = await getDocs(query(collection(db, 'staff_users')));
        users1 = qSnap1.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Error fetching staff_users list in AdminDashboard:", e);
      }

      try {
        const qSnap2 = await getDocs(query(collection(db, 'users')));
        users2 = qSnap2.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Error fetching users list in AdminDashboard (might be expected for non-admin):", e);
      }
      
      const allUsers = [...users1, ...users2];
      const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());
      
      setPhysiotherapists(uniqueUsers.filter((u: any) => u.role === 'physiotherapist' || (u.role === 'admin' && u.isPhysiotherapist === true)));
    };
    fetchPhysios();
  }, [role]);

  const handleAssign = async (id: string, physioId: string) => {
    try {
      if (physioId === '') {
        await updateDoc(doc(db, 'appointments', id), { physiotherapistId: null });
      } else {
        await updateDoc(doc(db, 'appointments', id), { physiotherapistId: physioId });
      }
      toast.success("Fisioterapeuta asignado");
    } catch (e) {
      toast.error("Error al asignar");
    }
  };

  useEffect(() => {
    if (!role || role === 'patient') return;
    const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const aps = await Promise.all(snapshot.docs.slice(0, 100).map(async (d) => {
        const data = d.data();
        let details = {};
        try {
          const detailSnap = await getDoc(doc(db, 'appointments', d.id, 'details', 'info'));
          if (detailSnap.exists()) details = detailSnap.data();
        } catch (e) {
          console.error("Missing permissions or not found for detail", e);
        }
        return {
          id: d.id,
          ...data,
          ...details
        };
      }));
      setAppointments(aps);
    });
    return unsubscribe;
  }, [role]);

  const handleConfirm = async (id: string, physioId?: string) => {
    try {
      const updateData: any = { status: 'confirmed' };
      if (physioId) updateData.physiotherapistId = physioId;
      await updateDoc(doc(db, 'appointments', id), updateData);
      
      const apt = appointments.find(a => a.id === id);
      if (apt && apt.patientEmail) {
        try {
          await addDoc(collection(db, 'mail'), {
            to: apt.patientEmail,
            message: {
              subject: "Confirmación de cita - ProPhysical",
              html: `
                <div style="font-family: sans-serif; color: #333;">
                  <h2>¡Tu cita ha sido confirmada!</h2>
                  <p>Hola <strong>${apt.patientName || 'Paciente'}</strong>,</p>
                  <p>Te confirmamos que tu cita para el día <strong>${apt.date}</strong> a las <strong>${apt.time}</strong> ha sido agendada exitosamente en ProPhysical.</p>
                  <p>Servicio: ${apt.service || 'Fisioterapia'}</p>
                  <p>Por favor, llega 10 minutos antes de tu hora programada.</p>
                  <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                  <p>Atentamente,<br/>El equipo de ProPhysical</p>
                </div>
              `
            }
          });
          toast.success("Cita confirmada y correo de confirmación enviado.");
        } catch (e) {
          toast.error("Cita confirmada, pero hubo un error enviando el correo.");
          console.error(e);
        }
      } else {
        toast.success("Cita confirmada exitosamente (sin email de paciente)");
      }
    } catch (e) {
      toast.error("Error al confirmar la cita");
      console.error(e);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'cancelled' });
      toast.success("Cita cancelada exitosamente");
    } catch (e) {
      toast.error("Error al cancelar la cita");
    }
  };

  const [stats, setStats] = useState([
    { title: "Citas Hoy", value: "0", icon: CalendarIcon, change: "Actualizado hoy" },
    { title: "Pacientes Activos", value: "0", icon: Users, change: "En seguimiento" },
    { title: "Historias Clínicas", value: "0", icon: Activity, change: "Registradas" },
  ]);

  useEffect(() => {
    if (!role || role === 'patient') return;
    const today = new Date().toISOString().split('T')[0];
    
    let retryTimeout: any;
    let attempts = 0;
    const maxAttempts = 3;

    const fetchRealStats = async () => {
      try {
        const patientsSnap = await getDocs(collection(db, 'patients'));
        let historiesCount = 0;
        for (const pt of patientsSnap.docs) {
          const hSnap = await getDocs(collection(db, 'patients', pt.id, 'clinical_histories'));
          historiesCount += hSnap.size;
        }

        setStats(prev => prev.map(s => {
          if (s.title === "Pacientes Activos") return { ...s, value: patientsSnap.size.toString() };
          if (s.title === "Historias Clínicas") return { ...s, value: historiesCount.toString() };
          return s;
        }));
      } catch (e: any) {
        console.warn(`[AdminDashboard] Attempt ${attempts + 1} failed loading stats:`, e);
        if (e.message?.includes("permis") && attempts < maxAttempts) {
          attempts++;
          retryTimeout = setTimeout(() => {
            console.log(`[AdminDashboard] Retrying stats load... (Attempt ${attempts + 1})`);
            fetchRealStats();
          }, 1500);
        } else {
          // Soft fail for UI, but register error properly
          console.error("Critical firestore error fetching stats:", e);
        }
      }
    };
    fetchRealStats();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [role]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = appointments.filter(a => a.date === today).length;
    setStats(prev => prev.map(s => 
      s.title === "Citas Hoy" ? { ...s, value: todayCount.toString() } : s
    ));
  }, [appointments]);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-brand-light/10 text-brand-dark rounded-xl">
                <s.icon size={24} />
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{s.change}</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium mb-1">{s.title}</h3>
            <p className="text-3xl font-display font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointments List */}
        <div className={`lg:col-span-2 ${viewMode === 'list' ? 'bg-white rounded-2xl shadow-sm border border-slate-200 p-6' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">Agenda</h2>
            <div className="flex items-center gap-4">
              {viewMode === 'list' && (
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar paciente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-brand-light outline-none"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                 <button 
                   onClick={() => setViewMode('list')} 
                   className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <List size={18} />
                 </button>
                 <button 
                   onClick={() => setViewMode('calendar')} 
                   className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === 'calendar' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <Grid size={18} />
                 </button>
              </div>
            </div>
          </div>
          
          {viewMode === 'calendar' ? (
             <AdminCalendarView appointments={appointments} handleConfirm={handleConfirm} handleCancel={handleCancel} />
          ) : (
            <div className="space-y-4">
              {appointments.filter(apt => (apt.patientName || '').toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && <p className="text-sm text-slate-500 italic">No hay citas encontradas.</p>}
              {appointments.filter(apt => (apt.patientName || '').toLowerCase().includes(searchQuery.toLowerCase())).map((apt, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-brand-light/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center w-20 px-2 border-r border-slate-200">
                       <span className="block text-sm font-bold text-slate-800 whitespace-nowrap">{apt.time || 'N/A'}</span>
                       <span className="text-xs font-medium text-slate-500">{apt.date}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{apt.patientName || 'Anónimo'}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                         <Activity size={14} className="text-brand-light" /> {apt.service || 'Servicio General'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <select
                       value={apt.physiotherapistId || ''}
                       onChange={(e) => handleAssign(apt.id, e.target.value)}
                       className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-brand-light bg-white mr-2"
                     >
                       <option value="">Sin asignar</option>
                       {physiotherapists.map(p => (
                         <option key={p.id} value={p.id}>Fisio: {p.firstName || p.name} {p.lastName || ''}</option>
                       ))}
                     </select>
                     <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                       apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                       apt.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                       'bg-slate-100 text-slate-700'
                     }`}>
                       {apt.status === 'pending' ? 'Pendiente' : apt.status}
                     </span>
                     {apt.status === 'pending' && (
                       <button onClick={() => handleConfirm(apt.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200" title="Confirmar Cita">
                         <CheckCircle size={18} />
                       </button>
                     )}
                     <button onClick={() => handleCancel(apt.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Cancelar Cita">
                       <X size={18} />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions / Integration Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
           <h2 className="text-lg font-bold text-slate-800 mb-6">Acciones Rápidas</h2>
           <div className="space-y-3 flex-1 mb-8">
              <button onClick={() => setIsBookingModalOpen(true)} className="w-full justify-start text-brand-dark bg-brand-light/10 hover:bg-brand-light/20 font-semibold px-4 py-3 rounded-xl transition-colors border border-brand-light/20 flex gap-3 items-center">
                 <CalendarIcon size={18} /> Nueva Cita
              </button>
              <button onClick={() => navigate('/admin/history/new')} className="w-full justify-start text-slate-700 bg-slate-50 hover:bg-slate-100 font-semibold px-4 py-3 rounded-xl transition-colors border border-slate-200 flex gap-3 items-center">
                 <FileText size={18} /> Crear Historia Clínica
              </button>
           </div>
           
           <div className="pt-6 border-t border-slate-100">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Estado del Sistema</h3>
             <ul className="space-y-2 text-sm">
                <li className="flex justify-between items-center text-slate-600">
                  <span>Base de Datos Segura</span>
                  <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
                </li>
                <li className="flex justify-between items-center text-slate-600">
                  <span>Servicio WhatsApp</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </li>
                <li className="flex justify-between items-center text-slate-600">
                  <span>Backups</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </li>
             </ul>
           </div>
        </div>
      </div>
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
           <div className="relative w-full max-w-4xl my-8">
             <button onClick={() => setIsBookingModalOpen(false)} className="absolute -top-4 -right-4 md:-right-12 md:top-0 bg-white text-slate-600 hover:text-slate-900 rounded-full p-2 shadow-lg transition-colors z-50">
                <X size={24} />
             </button>
             <BookingForm />
           </div>
        </div>
      )}
    </div>
  );
}
