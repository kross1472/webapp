import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar as any);

const CustomToolbar = (toolbar: any) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToCurrent = () => toolbar.onNavigate('TODAY');

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center bg-white mb-6 gap-4">
      <div className="flex items-center gap-2">
        <button onClick={goToBack} className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
          <ChevronLeft size={18} />
        </button>
        <button onClick={goToCurrent} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
          Hoy
        </button>
        <button onClick={goToNext} className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
          <ChevronRight size={18} />
        </button>
      </div>
      
      <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
        <CalendarIcon className="text-brand-light" size={20} />
        {toolbar.label}
      </h2>
      
      <div className="flex bg-slate-100 p-1 rounded-lg">
         <button onClick={() => toolbar.onView('month')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${toolbar.view === 'month' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mes</button>
         <button onClick={() => toolbar.onView('week')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${toolbar.view === 'week' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
         <button onClick={() => toolbar.onView('day')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${toolbar.view === 'day' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Día</button>
      </div>
    </div>
  );
};

export function AdminCalendarView({ appointments, handleConfirm, handleCancel }: { appointments: any[], handleConfirm: (id: string, physioId?: string) => void, handleCancel: (id: string) => void }) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [isAvailabilityMode, setIsAvailabilityMode] = useState(false);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterPhysio, setFilterPhysio] = useState<string>('all');
  const [physiotherapists, setPhysiotherapists] = useState<any[]>([]);

  const [confirmPhysioId, setConfirmPhysioId] = useState<string>('');

  useEffect(() => {
    const fetchPhysios = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'physiotherapist'));
        const snap = await getDocs(q);
        setPhysiotherapists(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching physiotherapists", error);
      }
    };
    fetchPhysios();

    const availQ = query(collection(db, 'availability'));
    const unsubscribe = onSnapshot(availQ, (snap) => {
      setAvailabilities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const services = useMemo(() => {
    const s = new Set(appointments.map(a => a.service).filter(Boolean));
    return Array.from(s) as string[];
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      if (filterStatus !== 'all' && apt.status !== filterStatus) return false;
      if (filterService !== 'all' && apt.service !== filterService) return false;
      if (filterPhysio !== 'all' && apt.physiotherapistId !== filterPhysio) return false;
      return true;
    });
  }, [appointments, filterStatus, filterService, filterPhysio]);

  const daySummary = useMemo(() => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const dayApts = appointments.filter(apt => apt.date === formattedDate);
    return {
      pending: dayApts.filter(a => a.status === 'pending').length,
      confirmed: dayApts.filter(a => a.status === 'confirmed').length,
      completed: dayApts.filter(a => a.status === 'completed').length,
    };
  }, [appointments, date]);

  // Transform appointments for react-big-calendar
  const aptEvents = useMemo(() => {
    return filteredAppointments.map(apt => {
       let startDate = new Date();
       let endDate = new Date();
       
       if (apt.date) {
         try {
             let timePart = apt.time || '12:00';
             let isPM = timePart.toLowerCase().includes('pm');
             let isAM = timePart.toLowerCase().includes('am');
             
             let [hourStr, minStr] = timePart.replace(/[^\d:]/g, '').split(':');
             let hour = parseInt(hourStr || '12', 10);
             let min = parseInt(minStr || '0', 10);
             
             if (isPM && hour < 12) hour += 12;
             if (isAM && hour === 12) hour = 0;
             
             const [year, month, day] = apt.date.split('-').map(Number);
             startDate = new Date(year, month - 1, day, hour, min);
             endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
         } catch(e) {
             startDate = new Date(apt.date);
             endDate = new Date(apt.date);
         }
       }
       return {
         id: apt.id,
         title: `${apt.patientName || 'Anónimo'} - ${apt.service || 'Cita'}`,
         start: startDate,
         end: endDate,
         resource: { ...apt, type: 'appointment' }
       };
    });
  }, [filteredAppointments]);

  const availEvents = useMemo(() => {
    return availabilities
      .filter(a => filterPhysio === 'all' || a.physiotherapistId === filterPhysio)
      .map(a => ({
        id: a.id,
        title: `Disp: ${a.physiotherapistName || 'Genérica'}`,
        start: new Date(a.start),
        end: new Date(a.end),
        resource: { ...a, type: 'availability' }
      }));
  }, [availabilities, filterPhysio]);

  const displayedEvents = isAvailabilityMode ? [...aptEvents, ...availEvents] : aptEvents;
  const displayedBgEvents = isAvailabilityMode ? [] : availEvents;

  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const eventStyleGetter = (event: any) => {
    let style: React.CSSProperties = {
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      color: '#334155',
      border: '1px solid #e2e8f0',
      display: 'block',
      fontSize: '0.8rem',
      fontWeight: 600,
      padding: '2px 6px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    };

    if (event.resource.type === 'availability') {
      style.backgroundColor = '#fef3c7'; // amber-100
      style.color = '#92400e'; // amber-800
      style.border = '1px dashed #f59e0b';
      return { style };
    }

    if (event.resource.status === 'confirmed') {
      style.backgroundColor = '#ecfdf5';
      style.color = '#047857';
      style.border = '1px solid #a7f3d0';
    } else if (event.resource.status === 'pending') {
      style.backgroundColor = '#eff6ff';
      style.color = '#1d4ed8';
      style.border = '1px solid #bfdbfe';
    } else if (event.resource.status === 'completed') {
      style.backgroundColor = '#ecfea4'; // distinct color
      style.color = '#3f6212';
      style.border = '1px solid #d9f99d';
    } else if (event.resource.status === 'cancelled') {
      style.backgroundColor = '#fef2f2';
      style.color = '#b91c1c';
      style.border = '1px solid #fecaca';
      style.opacity = 0.6;
    }

    return { style };
  };

  const handleSelectSlot = async ({ start, end }: any) => {
    if (!isAvailabilityMode) {
       // if we are not in availability mode, we could let them create a new appointment manually maybe?
       return;
    }
    
    if (!filterPhysio || filterPhysio === 'all') {
       toast.error("Selecciona un fisioterapeuta específico en el filtro para definir su disponibilidad.");
       return;
    }
    
    const physio = physiotherapists.find(p => p.id === filterPhysio);
    
    try {
      await addDoc(collection(db, 'availability'), {
         physiotherapistId: filterPhysio,
         physiotherapistName: (physio?.name || physio?.firstName || physio?.email)?.split('@')[0],
         start: start.toISOString(),
         end: end.toISOString(),
         createdAt: Date.now()
      });
      toast.success("Bloque de disponibilidad creado");
    } catch (e: any) {
      toast.error("Error al crear bloque: " + e.message);
    }
  };

  const moveEvent = async ({ event, start, end }: any) => {
    if (event.resource.type === 'availability') {
       try {
           await updateDoc(doc(db, 'availability', event.id), {
               start: start.toISOString(),
               end: end.toISOString()
           });
           toast.success('Disponibilidad movida');
       } catch (e) {
           toast.error('Error al mover');
       }
       return;
    }
    
    // For appointments:
    if (event.resource.status === 'cancelled' || event.resource.status === 'completed') {
      toast.error('No se puede re-agendar una cita completada o cancelada');
      return;
    }
    try {
      const dateStr = format(start, 'yyyy-MM-dd');
      const timeStr = format(start, 'HH:mm');
      await updateDoc(doc(db, 'appointments', event.id), {
        date: dateStr,
        time: timeStr
      });
      toast.success('Cita re-agendada exitosamente');
    } catch (e) {
      console.error(e);
      toast.error('Error al re-agendar cita');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[700px] flex flex-col">
      <div className="mb-6 flex flex-col xl:flex-row gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100 xl:items-center justify-between">
        <div className="w-full flex-1 min-w-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-800">Filtros y Modos</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAvailabilityMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!isAvailabilityMode ? 'bg-brand-light text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
              >
                Ver Citas
              </button>
              <button 
                onClick={() => setIsAvailabilityMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isAvailabilityMode ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
              >
                Modo Disponibilidad
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              disabled={isAvailabilityMode}
              className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-light/50 font-medium text-slate-700 disabled:opacity-50"
            >
              <option value="all">Ver Todos (Estado)</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmadas</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <select 
              value={filterService} 
              onChange={e => setFilterService(e.target.value)}
              disabled={isAvailabilityMode}
              className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-light/50 font-medium text-slate-700 truncate disabled:opacity-50"
            >
              <option value="all">Todos los Servicios</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={filterPhysio} 
              onChange={e => setFilterPhysio(e.target.value)}
              className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-light/50 font-medium text-slate-700 truncate border-brand-light"
            >
              <option value="all">Todos los Fisioterapeutas</option>
              {physiotherapists.map(p => <option key={p.id} value={p.id}>{p.firstName || p.name || p.email} {p.lastName || ''}</option>)}
            </select>
          </div>
        </div>
        
        <div className="xl:border-l border-slate-200 xl:pl-6 h-full flex flex-col justify-center shrink-0">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Resumen del Día ({format(date, 'dd/MM')})</h3>
          <div className="flex gap-4 sm:gap-6">
             <div className="text-center bg-white px-4 py-2 rounded-lg border border-slate-100 flex-1">
                <p className="text-2xl font-bold text-amber-600 leading-none">{daySummary.pending}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Pendts.</p>
             </div>
             <div className="text-center bg-white px-4 py-2 rounded-lg border border-slate-100 flex-1">
                <p className="text-2xl font-bold text-emerald-600 leading-none">{daySummary.confirmed}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Confirms.</p>
             </div>
             <div className="text-center bg-white px-4 py-2 rounded-lg border border-slate-100 flex-1">
                <p className="text-2xl font-bold text-blue-600 leading-none">{daySummary.completed}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Complets.</p>
             </div>
          </div>
        </div>
      </div>

      <DnDCalendar
        localizer={localizer}
        events={displayedEvents}
        backgroundEvents={displayedBgEvents}
        selectable={isAvailabilityMode}
        onSelectSlot={handleSelectSlot}
        onEventDrop={moveEvent}
        resizable={false}
        startAccessor="start"
        endAccessor="end"
        style={{ flex: 1 }}
        culture="es"
        min={new Date(1970, 0, 1, 8, 0, 0)}
        max={new Date(1970, 0, 1, 21, 0, 0)}
        messages={{
          next: 'Siguiente',
          previous: 'Anterior',
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          agenda: 'Agenda',
          date: 'Fecha',
          time: 'Hora',
          event: 'Evento',
          noEventsInRange: 'No hay citas en este periodo.',
        }}
        components={{
          toolbar: CustomToolbar
        }}
        view={view}
        onView={(v: View) => setView(v)}
        date={date}
        onNavigate={(d: Date) => setDate(d)}
        eventPropGetter={eventStyleGetter as any}
        onSelectEvent={(e: any) => setSelectedEvent(e.resource)}
        onDrillDown={(d: Date) => {
          setDate(d);
          setView(Views.DAY);
        }}
      />

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:static print:bg-white print:p-0 print:block">
           <div id="print-modal" className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-8 print:shadow-none print:w-full print:max-w-none print:m-0 print:p-16 print:border-transparent print:min-h-screen leading-relaxed text-slate-900">
              {/* Marca de agua sutil solo en impresión */}
              <div className="absolute inset-0 pointer-events-none hidden print:flex items-center justify-center z-0 overflow-hidden opacity-30">
                 <h1 className="text-[120px] font-display font-black -rotate-12 whitespace-nowrap text-slate-900/[0.02]">
                   PRO PHYSICAL
                 </h1>
              </div>

              <div className="relative z-10 flex justify-between items-start mb-6 print:mb-8 print:border-b print:border-slate-100 print:pb-4">
                 <div className="flex items-center gap-3">
                    <img src="/logo.jpeg" alt="Logo" className="h-8 w-auto hidden print:block" />
                    <h3 className="text-lg print:text-2xl font-bold text-slate-900">
                       {selectedEvent.type === 'availability' ? 'Bloque de Disponibilidad' : 'Detalles de la Cita'}
                    </h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors print:hidden">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                       Imprimir
                    </button>
                    <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600 print:hidden">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                 </div>
              </div>
              
              <div className="relative z-10">
              {selectedEvent.type === 'availability' ? (
                <div className="space-y-4">
                   <table className="w-full border-collapse mb-4 print:table">
                      <tbody>
                         <tr>
                            <td className="border border-slate-200 p-3 bg-slate-50 w-1/3"><p className="text-xs font-bold text-slate-500 uppercase">Fisioterapeuta</p></td>
                            <td className="border border-slate-200 p-3"><p className="font-medium text-slate-900">{selectedEvent.physiotherapistName || 'Genérico'}</p></td>
                         </tr>
                         <tr>
                            <td className="border border-slate-200 p-3 bg-slate-50"><p className="text-xs font-bold text-slate-500 uppercase">Desde</p></td>
                            <td className="border border-slate-200 p-3"><p className="font-medium text-slate-900">{format(new Date(selectedEvent.start), 'dd/MM/yyyy HH:mm')}</p></td>
                         </tr>
                         <tr>
                            <td className="border border-slate-200 p-3 bg-slate-50"><p className="text-xs font-bold text-slate-500 uppercase">Hasta</p></td>
                            <td className="border border-slate-200 p-3"><p className="font-medium text-slate-900">{format(new Date(selectedEvent.end), 'dd/MM/yyyy HH:mm')}</p></td>
                         </tr>
                      </tbody>
                   </table>
                   <button 
                     onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'availability', selectedEvent.id));
                          toast.success('Disponibilidad eliminada');
                        } catch (e) {
                          toast.error('Error al eliminar');
                        }
                        setSelectedEvent(null);
                     }}
                     className="mt-6 mb-2 w-full py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors print:hidden"
                   >
                      Eliminar Bloque
                   </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 print:items-start">
                     <table className="w-full border-collapse mb-4 print:table">
                        <tbody>
                           <tr>
                              <td className="border border-slate-200 p-3 bg-slate-50 w-1/3"><p className="text-xs font-bold text-slate-500 uppercase">Paciente</p></td>
                              <td className="border border-slate-200 p-3"><p className="font-medium text-slate-900">{selectedEvent.patientName || 'Anónimo'}</p></td>
                           </tr>
                           <tr>
                              <td className="border border-slate-200 p-3 bg-slate-50"><p className="text-xs font-bold text-slate-500 uppercase">Servicio</p></td>
                              <td className="border border-slate-200 p-3"><p className="font-medium text-slate-900">{selectedEvent.service || 'General'}</p></td>
                           </tr>
                           {(selectedEvent.status === 'confirmed' || selectedEvent.status === 'completed') && selectedEvent.physiotherapistId && (
                           <tr>
                              <td className="border border-slate-200 p-3 bg-slate-50"><p className="text-xs font-bold text-slate-500 uppercase">Fisioterapeuta Asignado</p></td>
                              <td className="border border-slate-200 p-3"><p className="font-medium text-slate-900">
                                 {physiotherapists.find(p => p.id === selectedEvent.physiotherapistId)?.firstName || 
                                  physiotherapists.find(p => p.id === selectedEvent.physiotherapistId)?.name || 'Desconocido'}
                              </p></td>
                           </tr>
                           )}
                           <tr>
                              <td className="border border-slate-200 p-3 bg-slate-50"><p className="text-xs font-bold text-slate-500 uppercase">Fecha y Hora</p></td>
                              <td className="border border-slate-200 p-3"><p className="font-medium text-slate-900">{selectedEvent.date} {selectedEvent.time}</p></td>
                           </tr>
                           <tr>
                              <td className="border border-slate-200 p-3 bg-slate-50"><p className="text-xs font-bold text-slate-500 uppercase">Estado</p></td>
                              <td className="border border-slate-200 p-3">
                                 <span className={`inline-block mt-1 text-xs px-2.5 py-1.5 rounded-lg font-bold ${
                                    selectedEvent.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                    selectedEvent.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-700'
                                 }`}>
                                   {selectedEvent.status === 'pending' ? 'Pendiente' : 
                                    selectedEvent.status === 'confirmed' ? 'Confirmada' : selectedEvent.status}
                                 </span>
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
                  {selectedEvent.status === 'pending' && (
                     <div className="mt-6 border-t border-slate-100 pt-4 print:hidden">
                       <label className="block text-sm font-bold text-slate-700 mb-2">Asignar Fisioterapeuta</label>
                       <select 
                         value={confirmPhysioId} 
                         onChange={(e) => setConfirmPhysioId(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-light transition-all font-medium text-slate-700 mb-4"
                       >
                         <option value="">Sin asignar (Opcional)</option>
                         {physiotherapists.map(p => (
                           <option key={p.id} value={p.id}>{p.firstName || p.name || p.email} {p.lastName || ''}</option>
                         ))}
                       </select>
                       <button 
                         onClick={() => {
                            handleConfirm(selectedEvent.id, confirmPhysioId);
                            setConfirmPhysioId('');
                            setSelectedEvent(null);
                         }}
                         className="mb-2 w-full py-2.5 bg-brand-light text-white font-bold rounded-xl hover:bg-brand-dark transition-colors"
                       >
                          Confirmar Cita
                       </button>
                     </div>
                  )}
                  {selectedEvent.status !== 'cancelled' && selectedEvent.status !== 'completed' && (
                     <button 
                       onClick={() => {
                          handleCancel(selectedEvent.id);
                          setSelectedEvent(null);
                       }}
                       className={`${selectedEvent.status !== 'pending' ? 'mt-6 mb-2' : 'mb-2'} w-full py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors print:hidden`}
                     >
                        Cancelar Cita
                     </button>
                  )}
                </>
              )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
