import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { X, FileText, Calendar, Activity, Printer, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PatientHistoryModal({ isOpen, onClose, patient }: { isOpen: boolean, onClose: () => void, patient: any }) {
  const navigate = useNavigate();
  const [histories, setHistories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!patient || !patient.id) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'patients', patient.id, 'clinical_histories'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setHistories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching histories", error);
      } finally {
        setLoading(false);
      }
    };
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  return (
    <>
    <style type="text/css">
      {`
        @media print {
          body * {
            visibility: hidden;
          }
          .custom-print-section, .custom-print-section * {
            visibility: visible;
          }
          .custom-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}
    </style>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Historial Clínico: {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-sm text-slate-500">{patient.phone} {patient.email ? `• ${patient.email}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-xl transition-colors">
              <Printer size={18} />
              Exportar a PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Cargando registros...</div>
          ) : histories.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
               <FileText size={48} className="mx-auto mb-4 text-slate-300" />
               <p className="font-medium text-slate-700">No hay historias clínicas</p>
               <p className="text-sm">Aún no se han registrado atenciones para este paciente.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {histories.map(h => (
                <div key={h.id} className="bg-white border text-left border-slate-200 rounded-2xl p-6 shadow-sm relative">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-brand-dark font-bold">
                       <Calendar size={18} /> {new Date(h.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      {h.painScale !== undefined && (
                        <span className="text-sm font-semibold text-brand-light px-3 py-1 bg-brand-light/10 rounded-full">
                           EVA: {h.painScale}/10
                        </span>
                      )}
                      <button 
                        onClick={() => navigate('/admin/history/new', { state: { patient, history: h } })}
                        className="p-1.5 text-brand-dark bg-brand-light/10 hover:bg-brand-light/20 rounded-lg transition-colors print:hidden"
                        title="Modificar historia"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400 mb-1">Motivo de Consulta</p>
                      <p className="text-sm text-slate-800">{h.reasonForConsultation || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400 mb-1">Enfermedad Actual</p>
                      <p className="text-sm text-slate-800">{h.currentIllness || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400 mb-1">Diagnóstico Fisioterapéutico</p>
                      <p className="text-sm font-medium text-brand-dark bg-brand-light/5 p-3 rounded-lg border border-brand-light/10">
                        {h.physiotherapyDiagnosis || 'Sin diagnóstico'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400 mb-1">Plan de Tratamiento</p>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{h.treatmentPlan || 'No especificado'}</p>
                    </div>
                  </div>
                  
                  {h.treatmentPlans && h.treatmentPlans.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                      <p className="text-xs font-bold uppercase text-slate-400">Historial de Planes & Evolución</p>
                      {h.treatmentPlans.map((plan: any, pIdx: number) => (
                        <div key={plan.id || pIdx} className="bg-slate-50/70 p-4 border border-slate-200/60 rounded-xl space-y-3">
                          <div className="flex justify-between items-center bg-slate-100/50 p-2 rounded-lg -mx-4 -mt-4 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-700">Plan de Tratamiento #{pIdx + 1}</span>
                            {plan.treatmentStartDate && (
                              <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                                Inicio: {plan.treatmentStartDate}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Plan de Tratamiento / Objetivos</p>
                              <p className="text-slate-800 whitespace-pre-wrap">{plan.treatmentPlan || 'Sin descripción'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Observaciones / Recomendaciones</p>
                              <p className="text-slate-800 whitespace-pre-wrap">{plan.observations || 'Ninguna'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 border-t border-dashed border-slate-200 pt-2 text-[11px] text-slate-500">
                            <div>
                              <strong>Sesiones rec.:</strong> {plan.recommendedSessions || '-'}
                            </div>
                            <div>
                              <strong>Sesiones asist.:</strong> {plan.attendedSessionsCount || '0'}
                            </div>
                            <div className="truncate" title={plan.attendedDates}>
                              <strong>Fechas:</strong> {plan.attendedDates || '-'}
                            </div>
                          </div>

                          {plan.sessions && plan.sessions.length > 0 && (
                            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white mt-1">
                              <table className="w-full text-left border-collapse text-[11px] min-w-[500px]">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                                    <th className="px-3 py-2 w-16 text-center">Sesión</th>
                                    <th className="px-3 py-2 w-28">Fecha</th>
                                    <th className="px-3 py-2 w-20 text-center">EVA</th>
                                    <th className="px-3 py-2">Procedimiento realizado</th>
                                    <th className="px-3 py-2">Evolución clínica</th>
                                    <th className="px-3 py-2 w-32">Fisioterapeuta</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {plan.sessions.map((session: any, sIdx: number) => (
                                    <tr key={session.sessionNumber || sIdx} className="hover:bg-slate-50/50">
                                      <td className="px-3 py-1.5 text-center font-bold text-slate-800">#{session.sessionNumber}</td>
                                      <td className="px-3 py-1.5">{session.date}</td>
                                      <td className="px-3 py-1.5 text-center font-semibold text-brand-dark">{session.painLevel}/10</td>
                                      <td className="px-3 py-1.5 text-slate-700">{session.procedure || '-'}</td>
                                      <td className="px-3 py-1.5 text-slate-700">{session.evolution || '-'}</td>
                                      <td className="px-3 py-1.5 font-medium text-slate-700">{session.physiotherapist || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    (h.treatmentStartDate || h.recommendedSessions || h.attendedSessionsCount || h.attendedDates) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {h.treatmentStartDate && (
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-400 mb-1">Inicio de Tratamiento</p>
                            <p className="text-sm text-slate-800">{h.treatmentStartDate}</p>
                          </div>
                        )}
                        {h.recommendedSessions && (
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-400 mb-1">Recomendadas</p>
                            <p className="text-sm text-slate-800">{h.recommendedSessions}</p>
                          </div>
                        )}
                        {h.attendedSessionsCount && (
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-400 mb-1">Asistidas</p>
                            <p className="text-sm text-slate-800">{h.attendedSessionsCount}</p>
                          </div>
                        )}
                        {h.attendedDates && (
                          <div>
                            <p className="text-xs font-bold uppercase text-slate-400 mb-1">Días Asistidos</p>
                            <p className="text-sm text-slate-800 truncate" title={h.attendedDates}>{h.attendedDates}</p>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    
    <div className="hidden print:block custom-print-section w-full text-black font-sans bg-white p-8 text-left">
      <div className="border-b-2 border-slate-800 pb-6 mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/logo.jpeg" alt="ProPhysical Logo" className="h-16 w-auto object-contain mr-4" />
          <div>
            <p className="text-sm text-slate-500 mt-1">Av. Central 456, Edificio Salud - Local 102</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">HISTORIAL DE PACIENTE</p>
          <p className="text-sm text-slate-500">Generado: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-8 p-4 border border-slate-300 rounded-lg bg-slate-50">
        <h2 className="text-lg font-bold mb-2 uppercase text-slate-700">Datos Personales</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p><strong>Nombres:</strong> {patient.firstName} {patient.lastName}</p>
          <p><strong>Teléfono:</strong> {patient.phone}</p>
          {patient.email && <p><strong>Email:</strong> {patient.email}</p>}
        </div>
      </div>

      <h2 className="text-lg font-bold mb-4 uppercase text-slate-800 border-b pb-2">Sesiones Registradas</h2>
      
      {loading ? (
        <p>Cargando registros...</p>
      ) : histories.length === 0 ? (
        <p className="py-4 italic text-slate-500">No hay atenciones registradas para este paciente.</p>
      ) : (
        <div className="space-y-8">
          {histories.map((h, i) => (
             <div key={h.id} className="border border-slate-300 rounded-lg p-5 break-inside-avoid">
               <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                  <h3 className="font-bold text-lg">Sesión {histories.length - i}</h3>
                  <span className="text-sm">{new Date(h.createdAt).toLocaleDateString()}</span>
               </div>
               <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                 <div>
                   <p className="text-xs font-bold uppercase text-slate-500">Motivo</p>
                   <p className="text-sm">{h.reasonForConsultation || '-'}</p>
                 </div>
                 <div>
                   <p className="text-xs font-bold uppercase text-slate-500">EVA</p>
                   <p className="text-sm">{h.painScale !== undefined ? `${h.painScale}/10` : '-'}</p>
                 </div>
                 <div className="col-span-2">
                   <p className="text-xs font-bold uppercase text-slate-500">Dx Fisioterapéutico</p>
                   <p className="text-sm">{h.physiotherapyDiagnosis || '-'}</p>
                 </div>
                 
                 {h.treatmentPlans && h.treatmentPlans.length > 0 ? (
                   <div className="col-span-2 border-t border-slate-300 pt-3 mt-1 space-y-4">
                     <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Planes de Tratamiento & Evolución</p>
                     {h.treatmentPlans.map((plan: any, pIdx: number) => (
                       <div key={plan.id || pIdx} className="p-3 border border-slate-300 rounded-lg bg-slate-55 break-inside-avoid text-left">
                         <p className="text-xs font-bold text-slate-700 uppercase mb-2">Plan #{pIdx + 1}</p>
                         <div className="grid grid-cols-4 gap-4 text-xs mb-3">
                           {plan.treatmentStartDate && (
                             <div>
                               <p className="text-[10px] font-bold text-slate-500">Inicio</p>
                               <p>{plan.treatmentStartDate}</p>
                             </div>
                           )}
                           {plan.recommendedSessions !== '' && (
                             <div>
                               <p className="text-[10px] font-bold text-slate-500">Recomendadas</p>
                               <p>{plan.recommendedSessions}</p>
                             </div>
                           )}
                           {plan.attendedSessionsCount !== '' && (
                             <div>
                               <p className="text-[10px] font-bold text-slate-500">Asistidas</p>
                               <p>{plan.attendedSessionsCount}</p>
                             </div>
                           )}
                           {plan.attendedDates && (
                             <div>
                               <p className="text-[10px] font-bold text-slate-500">Fechas</p>
                               <p className="truncate" title={plan.attendedDates}>{plan.attendedDates}</p>
                             </div>
                           )}
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                           <div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase">Tratamiento / Objetivos</p>
                             <p className="whitespace-pre-wrap">{plan.treatmentPlan || '-'}</p>
                           </div>
                           <div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase">Observaciones / Recomendaciones</p>
                             <p className="whitespace-pre-wrap">{plan.observations || '-'}</p>
                           </div>
                         </div>

                         {plan.sessions && plan.sessions.length > 0 && (
                           <div className="mt-2 text-xs">
                             <table className="w-full text-left border-collapse border border-slate-300">
                               <thead>
                                 <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[9px]">
                                   <th className="px-2 py-1 border-r border-slate-300 text-center w-12">Sesión</th>
                                   <th className="px-2 py-1 border-r border-slate-300 w-24">Fecha</th>
                                   <th className="px-2 py-1 border-r border-slate-300 text-center w-12">EVA</th>
                                   <th className="px-2 py-1 border-r border-slate-300">Procedimiento</th>
                                   <th className="px-2 py-1 border-r border-slate-300">Evolución</th>
                                   <th className="px-2 py-1">Fisioterapeuta</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {plan.sessions.map((session: any, sIdx: number) => (
                                   <tr key={session.sessionNumber || sIdx}>
                                     <td className="px-2 py-1 border-r border-slate-200 text-center font-bold">#{session.sessionNumber}</td>
                                     <td className="px-2 py-1 border-r border-slate-200">{session.date}</td>
                                     <td className="px-2 py-1 border-r border-slate-200 text-center">{session.painLevel}/10</td>
                                     <td className="px-2 py-1 border-r border-slate-200">{session.procedure || '-'}</td>
                                     <td className="px-2 py-1 border-r border-slate-200">{session.evolution || '-'}</td>
                                     <td className="px-2 py-1 font-medium">{session.physiotherapist || '-'}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 ) : (
                   <>
                   <div className="col-span-2">
                     <p className="text-xs font-bold uppercase text-slate-500">Tratamiento e Indicaciones</p>
                     <p className="text-sm whitespace-pre-wrap">{h.treatmentPlan || '-'}</p>
                   </div>
                   {(h.treatmentStartDate || h.recommendedSessions || h.attendedSessionsCount || h.attendedDates) && (
                     <div className="col-span-2 grid grid-cols-4 gap-4 mt-2">
                       {h.treatmentStartDate && <div><p className="text-xs font-bold uppercase text-slate-500">Inicio</p><p className="text-sm">{h.treatmentStartDate}</p></div>}
                       {h.recommendedSessions && <div><p className="text-xs font-bold uppercase text-slate-500">Recomendadas</p><p className="text-sm">{h.recommendedSessions}</p></div>}
                       {h.attendedSessionsCount && <div><p className="text-xs font-bold uppercase text-slate-500">Asistidas</p><p className="text-sm">{h.attendedSessionsCount}</p></div>}
                       {h.attendedDates && <div><p className="text-xs font-bold uppercase text-slate-500">Días Asistidos</p><p className="text-sm">{h.attendedDates}</p></div>}
                     </div>
                   )}
                   </>
                 )}
               </div>
             </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
