import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

export function AdminCalendarView({ appointments, handleConfirm, handleCancel }: { appointments: any[], handleConfirm: (id: string) => void, handleCancel: (id: string) => void }) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterPhysio, setFilterPhysio] = useState<string>('all');
  const [physiotherapists, setPhysiotherapists] = useState<any[]>([]);

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
  const events = useMemo(() => {
    return filteredAppointments.map(apt => {
       let startDate = new Date();
       let endDate = new Date();
       
       if (apt.date) {
         // Create dates based on apt.date (YYYY-MM-DD) and apt.time (HH:MM or similar)
         // Handling possible lack of time
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
             endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // add 1 hour roughly
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
         resource: apt
       };
    });
  }, [appointments]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const eventStyleGetter = (event: any) => {
    let style: React.CSSProperties = {
      backgroundColor: '#f8fafc', // slate-50
      borderRadius: '8px',
      color: '#334155', // slate-700
      border: '1px solid #e2e8f0', // slate-200
      display: 'block',
      fontSize: '0.8rem',
      fontWeight: 600,
      padding: '2px 6px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    };

    if (event.resource.status === 'confirmed') {
      style.backgroundColor = '#ecfdf5'; // emerald-50
      style.color = '#047857'; // emerald-700
      style.border = '1px solid #a7f3d0';
    } else if (event.resource.status === 'pending') {
      style.backgroundColor = '#fffbeb'; // amber-50
      style.color = '#b45309'; // amber-700
      style.border = '1px solid #fde68a';
    } else if (event.resource.status === 'completed') {
      style.backgroundColor = '#eff6ff'; // blue-50
      style.color = '#1d4ed8'; // blue-700
      style.border = '1px solid #bfdbfe';
    } else if (event.resource.status === 'cancelled') {
      style.backgroundColor = '#fef2f2'; // red-50
      style.color = '#b91c1c'; // red-700
      style.border = '1px solid #fecaca';
      style.opacity = 0.6;
    }

    return { style };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[700px] flex flex-col">
      <div className="mb-6 flex flex-col xl:flex-row gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100 xl:items-center justify-between">
        <div className="w-full flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-800 mb-2">Filtros</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-light/50 font-medium text-slate-700"
            >
              <option value="all">Ver Todos</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmadas</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <select 
              value={filterService} 
              onChange={e => setFilterService(e.target.value)}
              className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-light/50 font-medium text-slate-700 truncate"
            >
              <option value="all">Todos los Servicios</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={filterPhysio} 
              onChange={e => setFilterPhysio(e.target.value)}
              className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-light/50 font-medium text-slate-700 truncate"
            >
              <option value="all">Todos los Fisioterapeutas</option>
              {physiotherapists.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
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

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ flex: 1 }}
        culture="es"
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
        onView={(v) => setView(v)}
        date={date}
        onNavigate={(d) => setDate(d)}
        eventPropGetter={eventStyleGetter as any}
        onSelectEvent={(e) => setSelectedEvent(e.resource)}
        onDrillDown={(d) => {
          setDate(d);
          setView(Views.DAY);
        }}
      />

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:bg-white print:p-0 print:block">
           <div id="print-modal" className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 print:shadow-none print:w-full print:max-w-none">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="text-lg font-bold text-slate-800">Detalles de la Cita</h3>
                 <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
              </div>
              <div className="space-y-3">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Paciente</p>
                    <p className="font-medium text-slate-800">{selectedEvent.patientName || 'Anónimo'}</p>
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Servicio</p>
                    <p className="font-medium text-slate-800">{selectedEvent.service || 'General'}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Fecha</p>
                      <p className="font-medium text-slate-800">{selectedEvent.date}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Hora</p>
                      <p className="font-medium text-slate-800">{selectedEvent.time}</p>
                    </div>
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Estado</p>
                    <span className={`inline-block mt-1 text-xs px-2.5 py-1.5 rounded-lg font-bold ${
                       selectedEvent.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                       selectedEvent.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                       'bg-slate-100 text-slate-700'
                    }`}>
                      {selectedEvent.status === 'pending' ? 'Pendiente' : 
                       selectedEvent.status === 'confirmed' ? 'Confirmada' : selectedEvent.status}
                    </span>
                 </div>
              </div>
              {selectedEvent.status === 'pending' && (
                 <button 
                   onClick={() => {
                      handleConfirm(selectedEvent.id);
                      setSelectedEvent(null);
                   }}
                   className="mt-6 mb-2 w-full py-2.5 bg-brand-light text-white font-bold rounded-xl hover:bg-brand-dark transition-colors"
                 >
                    Confirmar Cita
                 </button>
              )}
              {selectedEvent.status !== 'cancelled' && selectedEvent.status !== 'completed' && (
                 <button 
                   onClick={() => {
                      handleCancel(selectedEvent.id);
                      setSelectedEvent(null);
                   }}
                   className={`${selectedEvent.status !== 'pending' ? 'mt-6 mb-2' : 'mb-2'} w-full py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors`}
                 >
                    Cancelar Cita
                 </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
