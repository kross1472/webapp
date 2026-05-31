// imports...
import { Users, Calendar as CalendarIcon, TrendingUp, Activity, FileText, CheckCircle, Download, UserPlus, List, Grid } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, getDoc, doc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";
import { AdminUsersModal } from "../components/AdminUsersModal";
import { AdminCalendarView } from "../components/AdminCalendarView";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  
  const handleBackup = async () => {
    if (role !== 'admin') {
      toast.error('No tienes permisos suficientes para descargar el backup.');
      return;
    }
    try {
      toast.info('Generando backup, por favor espera...');
      
      const apsSnap = await getDocs(collection(db, 'appointments'));
      const appointmentsData = await Promise.all(apsSnap.docs.map(async d => {
         let detail = {};
         try {
           const dSnap = await getDoc(doc(db, 'appointments', d.id, 'details', 'info'));
           if (dSnap.exists()) detail = dSnap.data();
         } catch(e) {}
         return { id: d.id, ...d.data(), details: detail };
      }));

      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const backup = {
        timestamp: new Date().toISOString(),
        appointments: appointmentsData,
        users: usersData
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_prophysical_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Backup descargado exitosamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el backup');
    }
  };

  useEffect(() => {
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
  }, []);

  const handleConfirm = async (id: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'confirmed' });
      toast.success("Cita confirmada exitosamente");
    } catch (e) {
      toast.error("Error al confirmar la cita");
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas cancelar esta cita?")) return;
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'cancelled' });
      toast.success("Cita cancelada exitosamente");
    } catch (e) {
      toast.error("Error al cancelar la cita");
    }
  };

  const stats = [
    { title: "Citas Hoy", value: appointments.length.toString(), icon: CalendarIcon, change: "Actualizado hoy" },
    { title: "Pacientes Activos", value: "12", icon: Users, change: "En seguimiento" },
    { title: "Historias Clínicas", value: "34", icon: Activity, change: "+2 nuevas" },
    { title: "Rendimiento Mensual", value: "92%", icon: TrendingUp, change: "Últimos 30 días" },
  ];

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
            <h2 className="text-lg font-bold text-slate-800">Agenda</h2>
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
          
          {viewMode === 'calendar' ? (
             <AdminCalendarView appointments={appointments} handleConfirm={handleConfirm} handleCancel={handleCancel} />
          ) : (
            <div className="space-y-4">
              {appointments.length === 0 && <p className="text-sm text-slate-500 italic">No hay citas recientes.</p>}
              {appointments.map((apt, i) => (
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
              <button onClick={() => navigate('/')} className="w-full justify-start text-brand-dark bg-brand-light/10 hover:bg-brand-light/20 font-semibold px-4 py-3 rounded-xl transition-colors border border-brand-light/20 flex gap-3 items-center">
                 <CalendarIcon size={18} /> Nueva Cita
              </button>
              <button onClick={() => navigate('/admin/history/new')} className="w-full justify-start text-slate-700 bg-slate-50 hover:bg-slate-100 font-semibold px-4 py-3 rounded-xl transition-colors border border-slate-200 flex gap-3 items-center">
                 <FileText size={18} /> Crear Historia Clínica
              </button>
              {role === 'admin' && (
                <>
                  <button onClick={() => setIsUsersModalOpen(true)} className="w-full justify-start text-slate-700 bg-slate-50 hover:bg-slate-100 font-semibold px-4 py-3 rounded-xl transition-colors border border-slate-200 flex gap-3 items-center">
                     <UserPlus size={18} /> Gestionar Staff
                  </button>
                  <button onClick={handleBackup} className="w-full justify-start text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold px-4 py-3 rounded-xl transition-colors border border-emerald-200 flex gap-3 items-center">
                     <Download size={18} /> Descargar Backup
                  </button>
                </>
              )}
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
      {isUsersModalOpen && <AdminUsersModal onClose={() => setIsUsersModalOpen(false)} />}
    </div>
  );
}
