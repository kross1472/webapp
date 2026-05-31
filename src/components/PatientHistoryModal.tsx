import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { X, FileText, Calendar, Activity } from 'lucide-react';

export function PatientHistoryModal({ isOpen, onClose, patient }: { isOpen: boolean, onClose: () => void, patient: any }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Historial Clínico: {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-sm text-slate-500">{patient.phone} {patient.email ? `• ${patient.email}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white transition-colors">
            <X size={24} />
          </button>
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
                    {h.painScale !== undefined && (
                      <span className="text-sm font-semibold text-brand-light px-3 py-1 bg-brand-light/10 rounded-full">
                         EVA: {h.painScale}/10
                      </span>
                    )}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
