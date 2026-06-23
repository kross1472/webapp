import React, { useState, useEffect } from 'react';
import { Button } from "../components/ui/Button";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, doc, setDoc, getDocs, query } from "firebase/firestore";
import { FileText, Save, ArrowLeft, Download, Plus, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";

export interface EvolutionSession {
  sessionNumber: number;
  date: string;
  painLevel: number;
  procedure: string;
  evolution: string;
  physiotherapist: string;
}

export interface TreatmentPlan {
  id: string;
  treatmentStartDate: string;
  recommendedSessions: number | '';
  attendedSessionsCount: number | '';
  attendedDates: string;
  treatmentPlan: string;
  observations: string;
  sessions: EvolutionSession[];
}

export function AdminClinicalHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [physiotherapists, setPhysiotherapists] = useState<any[]>([]);

  // Form State
  const [patientId, setPatientId] = useState('temp-patient-' + Math.floor(Math.random() * 1000));
  const [patientName, setPatientName] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);

  // Anamnesis / Background State
  const [reason, setReason] = useState('');
  const [illness, setIllness] = useState('');
  const [painScale, setPainScale] = useState(0);
  const [medicalHist, setMedicalHist] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  // Legacy single plan compatibility states
  const [treatment, setTreatment] = useState('');
  const [evolution, setEvolution] = useState('');
  const [observations, setObservations] = useState('');
  const [treatmentStartDate, setTreatmentStartDate] = useState('');
  const [recommendedSessions, setRecommendedSessions] = useState<number | ''>('');
  const [attendedSessionsCount, setAttendedSessionsCount] = useState<number | ''>('');
  const [attendedDates, setAttendedDates] = useState('');

  // Dynamic Treatment Plans list state
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([
    {
      id: 'plan-initial',
      treatmentStartDate: new Date().toISOString().split('T')[0],
      recommendedSessions: '',
      attendedSessionsCount: '',
      attendedDates: '',
      treatmentPlan: '',
      observations: '',
      sessions: []
    }
  ]);
  
  // Demographics (PDF)
  const [idCard, setIdCard] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (location.state?.patient) {
      const p = location.state.patient;
      setPatientId(p.id);
      setPatientName(`${p.firstName || ''} ${p.lastName || ''}`.trim());
    }
    if (location.state?.history) {
      const h = location.state.history;
      setHistoryId(h.id);
      setReason(h.reasonForConsultation || '');
      setIllness(h.currentIllness || '');
      setPainScale(h.painScale || 0);
      setMedicalHist(h.medicalHistory || '');
      setPhysicalExam(h.physicalExamination || '');
      setDiagnosis(h.physiotherapyDiagnosis || '');
      
      // Load modern dynamic plans if present, otherwise map legacy fields to the list
      if (h.treatmentPlans && Array.isArray(h.treatmentPlans) && h.treatmentPlans.length > 0) {
        setTreatmentPlans(h.treatmentPlans);
      } else {
        setTreatmentPlans([
          {
            id: 'legacy-plan-' + Math.floor(Math.random() * 1000),
            treatmentStartDate: h.treatmentStartDate || '',
            recommendedSessions: h.recommendedSessions || '',
            attendedSessionsCount: h.attendedSessionsCount || '',
            attendedDates: h.attendedDates || '',
            treatmentPlan: h.treatmentPlan || h.treatment || '',
            observations: h.observations || '',
            sessions: h.sessions || (h.evolution ? [
              {
                sessionNumber: 1,
                date: h.treatmentStartDate || new Date().toISOString().split('T')[0],
                painLevel: h.painScale || 0,
                procedure: 'Evaluación y terapia inicial',
                evolution: h.evolution,
                physiotherapist: ''
              }
            ] : [])
          }
        ]);
      }

      setTreatment(h.treatmentPlan || h.treatment || '');
      setEvolution(h.evolution || '');
      setObservations(h.observations || '');
      setTreatmentStartDate(h.treatmentStartDate || '');
      setRecommendedSessions(h.recommendedSessions || '');
      setAttendedSessionsCount(h.attendedSessionsCount || '');
      setAttendedDates(h.attendedDates || '');
      setIdCard(h.idCard || '');
      setAge(h.age || '');
      setGender(h.gender || '');
      setPhone(h.phone || '');
      setOccupation(h.occupation || '');
      setAddress(h.address || '');
      setEmail(h.email || '');
    }
  }, [location.state]);

  useEffect(() => {
    if (!role || role === 'patient') return;
    
    let retryTimeout: any;
    let attempts = 0;
    const maxAttempts = 3;

    const fetchPatients = async () => {
      try {
        const snap = await getDocs(collection(db, 'patients'));
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e: any) {
        console.warn(`[AdminClinicalHistory] Attempt ${attempts + 1} failed fetching patients:`, e);
        if (e.message?.includes("permis") && attempts < maxAttempts) {
          attempts++;
          retryTimeout = setTimeout(() => {
            console.log(`[AdminClinicalHistory] Retrying patients fetch... (Attempt ${attempts + 1})`);
            fetchPatients();
          }, 1500);
        } else {
          handleFirestoreError(e, OperationType.GET, "patients");
        }
      }
    };
    fetchPatients();

    // Resiliently fetch staff and physiotherapists to use in the therapist dynamic select list
    const fetchPhysiotherapists = async () => {
      let users1: any[] = [];
      let users2: any[] = [];
      try {
        const qSnap1 = await getDocs(collection(db, 'staff_users'));
        users1 = qSnap1.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Could not load staff_users", e);
      }
      try {
        const qSnap2 = await getDocs(collection(db, 'users'));
        users2 = qSnap2.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Could not load users collection", e);
      }
      const combined = [...users1, ...users2];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())
        .filter((u: any) => u.role === 'physiotherapist' || (u.role === 'admin' && u.isPhysiotherapist === true));
      setPhysiotherapists(unique);
    };
    fetchPhysiotherapists();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [role]);

  // Helper functions for treatment plan/sessions management
  const addTreatmentPlan = () => {
    setTreatmentPlans([
      ...treatmentPlans,
      {
        id: 'plan-' + Date.now(),
        treatmentStartDate: new Date().toISOString().split('T')[0],
        recommendedSessions: '',
        attendedSessionsCount: '',
        attendedDates: '',
        treatmentPlan: '',
        observations: '',
        sessions: []
      }
    ]);
    toast.success("Nuevo Plan de Tratamiento agregado.");
  };

  const removeTreatmentPlan = (index: number) => {
    if (treatmentPlans.length <= 1) return;
    const updated = treatmentPlans.filter((_, i) => i !== index);
    setTreatmentPlans(updated);
    toast.info("Plan de Tratamiento removido.");
  };

  const updateTreatmentPlan = (index: number, fields: Partial<TreatmentPlan>) => {
    const updated = [...treatmentPlans];
    updated[index] = { ...updated[index], ...fields };
    setTreatmentPlans(updated);
  };

  const addSession = (planIndex: number) => {
    const updated = [...treatmentPlans];
    const plan = updated[planIndex];
    const nextNum = plan.sessions.length > 0 ? Math.max(...plan.sessions.map(s => s.sessionNumber)) + 1 : 1;
    plan.sessions = [
      ...plan.sessions,
      {
        sessionNumber: nextNum,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        painLevel: 5,
        procedure: '',
        evolution: '',
        physiotherapist: ''
      }
    ];
    
    // Auto increment assisted sessions
    plan.attendedSessionsCount = plan.sessions.length;
    // Auto update attended sessions dates
    const dates = plan.sessions.map(s => {
      if (!s.date) return '';
      const parts = s.date.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`; // DD/MM reference
      return s.date;
    }).filter(d => d).join(', ');
    plan.attendedDates = dates;

    setTreatmentPlans(updated);
    toast.success(`Sesión ${nextNum} agregada.`);
  };

  const removeSession = (planIndex: number, sessionNum: number) => {
    const updated = [...treatmentPlans];
    const plan = updated[planIndex];
    plan.sessions = plan.sessions.filter(s => s.sessionNumber !== sessionNum);
    
    // Auto update assisted sessions
    plan.attendedSessionsCount = plan.sessions.length;
    // Auto update dates
    const dates = plan.sessions.map(s => {
      if (!s.date) return '';
      const parts = s.date.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return s.date;
    }).filter(d => d).join(', ');
    plan.attendedDates = dates;

    setTreatmentPlans(updated);
    toast.info(`Sesión ${sessionNum} removida.`);
  };

  const updateSession = (planIndex: number, sessionIndex: number, fields: Partial<EvolutionSession>) => {
    const updated = [...treatmentPlans];
    const plan = updated[planIndex];
    const session = plan.sessions[sessionIndex];
    plan.sessions[sessionIndex] = { ...session, ...fields };
    
    // Auto recalculate dates list if session date changed
    if (fields.hasOwnProperty('date')) {
      const dates = plan.sessions.map(s => {
        if (!s.date) return '';
        const parts = s.date.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
        return s.date;
      }).filter(d => d).join(', ');
      plan.attendedDates = dates;
    }

    setTreatmentPlans(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("El nombre del paciente es requerido");
      return;
    }
    
    // Validations on all plans
    for (let i = 0; i < treatmentPlans.length; i++) {
      const plan = treatmentPlans[i];
      if (!plan.treatmentPlan.trim()) {
        toast.error(`El Plan de Tratamiento del bloque #${i + 1} es requerido.`);
        return;
      }
      if (plan.recommendedSessions !== '' && Number(plan.recommendedSessions) < 0) {
        toast.error(`Las sesiones recomendadas en el bloque #${i + 1} no pueden ser negativas.`);
        return;
      }
      if (plan.attendedSessionsCount !== '' && Number(plan.attendedSessionsCount) < 0) {
        toast.error(`Las sesiones asistidas en el bloque #${i + 1} no pueden ser negativas.`);
        return;
      }
    }
    
    setLoading(true);
    try {
      const patientRef = doc(db, 'patients', patientId);
      await setDoc(patientRef, {
        firstName: patientName.split(' ')[0] || '',
        lastName: patientName.split(' ').slice(1).join(' ') || '',
        phone: phone || '',
        email: email || '',
        createdAt: Date.now()
      }, { merge: true });

      // Save plan-0 to legacy single fields for robust backward-compatibility
      const firstPlan = treatmentPlans[0] || {
        treatmentStartDate: '',
        recommendedSessions: '',
        attendedSessionsCount: '',
        attendedDates: '',
        treatmentPlan: '',
        observations: '',
        sessions: []
      };

      const historyData = {
        date: new Date().toISOString().split('T')[0],
        idCard,
        age,
        gender,
        phone,
        occupation,
        address,
        email,
        reasonForConsultation: reason,
        currentIllness: illness,
        painScale: Number(painScale),
        medicalHistory: medicalHist,
        physicalExamination: physicalExam,
        physiotherapyDiagnosis: diagnosis,
        // Legacy single-plan fields for backward-compatibility with reports/views
        treatmentPlan: firstPlan.treatmentPlan,
        observations: firstPlan.observations,
        treatmentStartDate: firstPlan.treatmentStartDate,
        recommendedSessions: firstPlan.recommendedSessions,
        attendedSessionsCount: firstPlan.attendedSessionsCount,
        attendedDates: firstPlan.attendedDates,
        evolution: firstPlan.sessions.map(s => `Sesión ${s.sessionNumber}: ${s.evolution || ''}`).join(' | ') || evolution,
        // Modern dynamic array structures
        treatmentPlans: treatmentPlans,
      };

      if (historyId) {
        const hRef = doc(db, 'patients', patientId, 'clinical_histories', historyId);
        await setDoc(hRef, { ...historyData, updatedAt: Date.now() }, { merge: true });
        toast.success("Historia Clínica registrada con éxito");
      } else {
        const historyRef = collection(db, 'patients', patientId, 'clinical_histories');
        await addDoc(historyRef, { ...historyData, createdAt: Date.now() });
        toast.success("Historia Clínica guardada con éxito");
      }
      
      setSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error('Error guardando la historia clínica. Verifica tus permisos de Firebase.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredPatients = patients.filter(p => 
    `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(patientName.toLowerCase())
  );

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex items-center justify-center p-4 print:hidden"
      >
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Save size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Historia Guardada</h2>
          <p className="text-slate-500 mb-8">La historia clínica se ha registrado con éxito en la base de datos.</p>
          <div className="flex flex-col gap-3">
             <Button onClick={() => window.print()} className="w-full gap-2 text-brand-dark bg-brand-light/10 hover:bg-brand-light/20 border-brand-light/20">
               <Download size={20} /> Descargar como PDF
             </Button>
             <Button onClick={() => navigate('/admin')} className="w-full shadow-md">
               Volver al Panel
             </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-6 print:hidden">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-3">
             <FileText className="text-brand-light" /> {historyId ? 'Editar Historia Clínica' : 'Nueva Historia Clínica'}
          </h1>
          <p className="text-slate-500 text-sm">Registro detallado de evaluación y plan de tratamiento fisioterapéutico</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Paciente y Motivo */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 md:p-8 space-y-6 border-b border-slate-100 bg-slate-50/50 relative">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="relative">
               <label className="block text-sm font-bold text-slate-700 mb-2">Paciente (Buscar o Nuevo)</label>
               <input 
                 type="text" required value={patientName} 
                 onChange={e => { setPatientName(e.target.value); setShowDropdown(true); }}
                 onFocus={() => setShowDropdown(true)}
                 onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                 placeholder="Ej. Juan Pérez"
                 disabled={!!historyId}
                 className={`w-full border rounded-xl px-4 py-3 outline-none transition-all shadow-sm ${historyId ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-brand-light'}`} 
               />
               {showDropdown && patientName.length > 0 && filteredPatients.length > 0 && (
                 <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                   {filteredPatients.map(p => (
                     <div 
                       key={p.id} 
                       className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                       onMouseDown={() => {
                         setPatientId(p.id);
                         setPatientName(`${p.firstName || ''} ${p.lastName || ''}`.trim());
                         setShowDropdown(false);
                         document.getElementById('anamnesis-section')?.scrollIntoView({ behavior: 'smooth' });
                       }}
                     >
                       <p className="font-bold text-slate-800">{p.firstName} {p.lastName}</p>
                     </div>
                   ))}
                 </div>
               )}
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Motivo de Consulta</label>
               <input 
                 id="motivo-input"
                 type="text" required value={reason} onChange={e => setReason(e.target.value)}
                 placeholder="Ej. Dolor lumbar agudo"
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all shadow-sm" 
               />
             </div>
           </div>

           {/* Demographics row 1 */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">C.I.</label>
                <input 
                  type="text" value={idCard} onChange={e => setIdCard(e.target.value)}
                  placeholder="Cédula de Identidad"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-brand-light transition-all shadow-sm" 
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Edad</label>
                <input 
                  type="text" value={age} onChange={e => setAge(e.target.value)}
                  placeholder="Ej. 34 años"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-brand-light transition-all shadow-sm" 
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sexo</label>
                <select 
                  value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-brand-light transition-all shadow-sm" 
                >
                  <option value="">Seleccionar</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
             </div>
           </div>

           {/* Demographics row 2 */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label>
                <input 
                  type="text" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Ej. 0987654321"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-brand-light transition-all shadow-sm" 
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ocupación</label>
                <input 
                  type="text" value={occupation} onChange={e => setOccupation(e.target.value)}
                  placeholder="Profesión/Oficio"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-brand-light transition-all shadow-sm" 
                />
             </div>
             <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Correo (Gmail)</label>
                <input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@gmail.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-brand-light transition-all shadow-sm" 
                />
             </div>
           </div>
           
           <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">Dirección</label>
             <input 
               type="text" value={address} onChange={e => setAddress(e.target.value)}
               placeholder="Dirección domiciliaria"
               className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-brand-light transition-all shadow-sm" 
             />
           </div>
        </motion.div>

        {/* Anamnesis y Antecedentes */}
        <motion.div id="anamnesis-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 md:p-8 space-y-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Anamnesis y Antecedentes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="md:col-span-2">
               <label className="block text-sm font-bold text-slate-700 mb-2">Enfermedad Actual / Descripción</label>
               <textarea 
                 rows={8} required value={illness} onChange={e => setIllness(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-y min-h-[160px]" 
                 placeholder="Inicio, evolución, características..."
               />
             </div>
             <div>
               <label className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                 <span>Escala de Dolor (EVA)</span>
                 <span className="text-brand-light">{painScale} / 10</span>
               </label>
               <input 
                 type="range" min="0" max="10" required value={painScale} onChange={e => setPainScale(Number(e.target.value))}
                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-light" 
               />
             </div>
             <div className="md:col-span-2">
               <label className="block text-sm font-bold text-slate-700 mb-2">Antecedentes Patológicos, Quirúrgicos y Alergias</label>
               <textarea 
                 rows={6} value={medicalHist} onChange={e => setMedicalHist(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-y min-h-[120px]" 
               />
             </div>
          </div>
        </motion.div>

        {/* Exploración Física y Diagnóstico */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 md:p-8 space-y-6 border-b border-slate-100">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Exploración y Diagnóstico</h3>
           <div className="grid grid-cols-1 gap-6">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Exploración Física (Postura, ROM, Fuerza, Neurológico)</label>
               <textarea 
                 rows={8} value={physicalExam} onChange={e => setPhysicalExam(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-y min-h-[160px]" 
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Diagnóstico Fisioterapéutico</label>
               <textarea 
                 rows={6} required value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                 className="w-full bg-white border border-brand-light/30 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-y min-h-[120px] bg-brand-light/5" 
               />
             </div>
           </div>
        </motion.div>

         {/* Tratamiento y Observaciones */}
         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-6 md:p-8 space-y-8">
           <div className="border-b border-slate-150 pb-4">
             <h3 className="text-xl font-bold text-slate-800">Planes de Tratamiento & Tablas de Evolución</h3>
             <p className="text-xs text-slate-500">Crea múltiples planes de tratamiento y registra de forma dinámica la evolución y procedimiento de cada sesión de fisioterapia a lo largo del tiempo.</p>
           </div>

           <div className="space-y-10">
             {treatmentPlans.map((plan, idx) => (
               <div key={plan.id || idx} className="p-6 border border-slate-200 rounded-2xl relative bg-slate-50/20 space-y-6">
                 {/* Block Header */}
                 <div className="flex justify-between items-center bg-slate-100/60 p-4 rounded-xl -mx-6 -mt-6 border-b border-slate-200">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                     <FileText size={16} className="text-brand-light" /> Plan de Tratamiento & Evolución #{idx + 1}
                   </h4>
                   {treatmentPlans.length > 1 && (
                     <button 
                       type="button" 
                       onClick={() => removeTreatmentPlan(idx)} 
                       className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 px-3 py-1.5 rounded-lg border border-red-100 flex items-center text-xs font-semibold bg-white transition-all shadow-sm"
                     >
                       <Trash2 size={14} /> Eliminar Plan
                     </button>
                   )}
                 </div>

                 {/* Basic Plan Information Card */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha Inicio Tratamiento</label>
                     <input 
                       type="date" 
                       max={new Date().toISOString().split('T')[0]}
                       value={plan.treatmentStartDate || ''} 
                       onChange={e => updateTreatmentPlan(idx, { treatmentStartDate: e.target.value })}
                       className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-light transition-all text-xs text-slate-700" 
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1.5">Sesiones Recomendadas</label>
                     <input 
                       type="number" 
                       min="0" 
                       value={plan.recommendedSessions || ''} 
                       onChange={e => updateTreatmentPlan(idx, { recommendedSessions: e.target.value === '' ? '' : Number(e.target.value) })}
                       className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-light transition-all text-xs text-slate-700" 
                       placeholder="Ej. 10"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1.5">Sesiones Asistidas (Calculado)</label>
                     <input 
                       type="number" 
                       min="0" 
                       readOnly
                       disabled
                       value={plan.attendedSessionsCount || '0'} 
                       className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2.5 outline-none text-xs text-slate-500 cursor-not-allowed font-medium" 
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1.5">Días Asistidos (Auto)</label>
                     <input 
                       type="text" 
                       readOnly
                       disabled
                       value={plan.attendedDates || ''} 
                       className="w-full bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2.5 outline-none text-xs text-slate-500 cursor-not-allowed truncate" 
                       placeholder="Se autocompleta con las sesiones"
                     />
                   </div>
                 </div>

                 {/* Treatment Goals & Observations */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                   <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1.5">Plan de Tratamiento / Objetivos (Requerido)</label>
                     <textarea 
                       rows={6} 
                       required 
                       value={plan.treatmentPlan || ''} 
                       onChange={e => updateTreatmentPlan(idx, { treatmentPlan: e.target.value })}
                       className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-light transition-all text-xs resize-y min-h-[120px]" 
                       placeholder="Describir los objetivos terapéuticos..."
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-600 mb-1.5">Recomendaciones para el Hogar / Observaciones</label>
                     <textarea 
                       rows={6} 
                       value={plan.observations || ''} 
                       onChange={e => updateTreatmentPlan(idx, { observations: e.target.value })}
                       className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-light transition-all text-xs resize-y min-h-[120px]" 
                       placeholder="Indicaciones para el paciente..."
                     />
                   </div>
                 </div>

                 {/* Dynamic Evolution Table */}
                 <div className="pt-4 border-t border-slate-100 space-y-3">
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                     <div>
                       <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Tabla dinámica de evolución</span>
                     </div>
                     <button 
                       type="button" 
                       onClick={() => addSession(idx)}
                       className="bg-brand-dark hover:bg-brand-dark/95 text-white gap-1 px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm flex items-center justify-center border border-brand-dark transition-all self-start"
                     >
                       <Plus size={14} /> Agregar sesión
                     </button>
                   </div>

                   {plan.sessions && plan.sessions.length > 0 ? (
                     <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white">
                       <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                         <thead>
                           <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                             <th className="px-3 py-2.5 text-center w-16">Sesión</th>
                             <th className="px-3 py-2.5 w-36">Fecha</th>
                             <th className="px-3 py-2.5 w-28 text-center">Dolor (EVA)</th>
                             <th className="px-3 py-2.5 w-[30%]">Procedimiento realizado</th>
                             <th className="px-3 py-2.5 w-[30%]">Evolución clínica</th>
                             <th className="px-3 py-2.5 w-40">Fisioterapeuta</th>
                             <th className="px-3 py-2.5 text-center w-12">Acción</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {plan.sessions.map((session, sIdx) => (
                             <tr key={session.sessionNumber || sIdx} className="hover:bg-slate-50/50 transition-colors">
                               <td className="px-3 py-2 text-center font-bold text-slate-800">
                                 #{session.sessionNumber}
                               </td>
                               <td className="px-3 py-2">
                                 <input 
                                   type="date" 
                                   value={session.date || ''} 
                                   onChange={e => updateSession(idx, sIdx, { date: e.target.value })}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-brand-light text-slate-700 text-xs"
                                 />
                               </td>
                               <td className="px-3 py-2">
                                 <select 
                                   value={session.painLevel} 
                                   onChange={e => updateSession(idx, sIdx, { painLevel: Number(e.target.value) })}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-brand-light text-xs font-semibold"
                                 >
                                   {[...Array(11).keys()].map(val => (
                                     <option key={val} value={val}>
                                       EVA {val}
                                     </option>
                                   ))}
                                 </select>
                               </td>
                               <td className="px-3 py-2">
                                 <input 
                                   type="text" 
                                   placeholder="Ej. TENS + ULTRASONIDO"
                                   value={session.procedure || ''} 
                                   onChange={e => updateSession(idx, sIdx, { procedure: e.target.value })}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-brand-light text-xs text-slate-700 font-medium"
                                 />
                               </td>
                               <td className="px-3 py-2">
                                 <input 
                                   type="text" 
                                   placeholder="Ej. Dolor disminuye, marcha estable"
                                   value={session.evolution || ''} 
                                   onChange={e => updateSession(idx, sIdx, { evolution: e.target.value })}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-brand-light text-xs text-slate-700"
                                 />
                               </td>
                               <td className="px-3 py-2">
                                 <select 
                                   value={session.physiotherapist || ''} 
                                   onChange={e => updateSession(idx, sIdx, { physiotherapist: e.target.value })}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-brand-light text-xs text-slate-700 font-semibold"
                                 >
                                   <option value="">Ninguno</option>
                                   {physiotherapists.map(p => {
                                     const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.displayName || p.username || p.email?.split('@')[0] || 'Fisioterapeuta';
                                     return (
                                       <option key={p.id} value={name}>
                                         {name}
                                       </option>
                                     );
                                   })}
                                 </select>
                               </td>
                               <td className="px-3 py-2 text-center">
                                 <button 
                                   type="button" 
                                   onClick={() => removeSession(idx, session.sessionNumber)}
                                   className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                   title="Eliminar sesión de la tabla"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   ) : (
                     <div className="text-center py-5 border border-dashed border-slate-250 rounded-xl bg-slate-50/50">
                       <p className="text-xs text-slate-400 font-medium">No hay atenciones o sesiones añadidas a este plan de evolución.</p>
                       <button 
                         type="button" 
                         onClick={() => addSession(idx)}
                         className="text-brand-dark hover:underline text-xs font-bold mt-1 inline-flex items-center gap-1"
                       >
                         ➕ Agregar primera sesión
                       </button>
                     </div>
                   )}
                 </div>
               </div>
             ))}
           </div>

           {/* Button to add another treatment plan */}
           <div className="flex justify-center pt-2">
             <button 
               type="button" 
               onClick={addTreatmentPlan}
               className="border-dashed border-2 border-slate-350 hover:bg-slate-55 bg-white text-slate-600 gap-2 px-6 py-3.5 rounded-xl flex items-center justify-center font-bold text-xs hover:border-brand shadow-sm transition-all hover:scale-[1.01]"
             >
               <Plus size={16} /> Crear otro Plan de Tratamiento
             </button>
           </div>

           {/* Action Buttons */}
           <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
             <Button type="button" variant="ghost" onClick={() => navigate('/admin')}>Cancelar</Button>
             <Button type="submit" size="lg" className="gap-2 shadow-lg" disabled={loading}>
               <Save size={20} /> {loading ? 'Guardando...' : (historyId ? 'Actualizar Historia Clínica' : 'Guardar Historia Clínica')}
             </Button>
           </div>
         </motion.div>
      </form>
    </div>

    {/* Printable View - only visible when printing */}
    <div className="hidden print:block max-w-4xl mx-auto p-8 bg-white text-black font-sans">
      <div className="border-b-2 border-slate-800 pb-6 mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/logo.jpeg" alt="ProPhysical Logo" className="h-16 w-auto object-contain mr-4" />
          <div>
            <p className="text-sm text-slate-500">Av. Central 456, Edificio Salud - Local 102</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-700">HISTORIA CLÍNICA</h2>
          <p className="text-sm text-slate-500 mt-1">Fecha: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Paciente</p>
              <p className="font-medium text-lg">{patientName || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Motivo de Consulta</p>
              <p className="font-medium text-lg">{reason || 'Ninguno'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">C.I.</p>
              <p className="font-medium text-base">{idCard || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Edad</p>
              <p className="font-medium text-base">{age || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Sexo</p>
              <p className="font-medium text-base">{gender || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Teléfono</p>
              <p className="font-medium text-base">{phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Ocupación</p>
              <p className="font-medium text-base">{occupation || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Correo Electrónico (Gmail)</p>
              <p className="font-medium text-base">{email || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Dirección</p>
              <p className="font-medium text-base">{address || '-'}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4">Anamnesis y Antecedentes</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Enfermedad Actual</p>
              <p className="text-sm leading-relaxed">{illness || 'Sin registro'}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-xs font-bold uppercase text-slate-400">Escala de Dolor (EVA):</p>
              <p className="font-bold text-lg text-teal-600">{painScale} / 10</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Antecedentes Médicos</p>
              <p className="text-sm leading-relaxed">{medicalHist || 'Sin registro'}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4">Exploración y Diagnóstico</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Exploración Física</p>
              <p className="text-sm leading-relaxed">{physicalExam || 'Sin registro'}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Diagnóstico Fisioterapéutico</p>
              <p className="text-sm leading-relaxed font-medium bg-teal-50 p-4 rounded-lg border border-teal-100">{diagnosis || 'Sin registro'}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4">Planes de Tratamiento & Evoluciones</h3>
          <div className="space-y-6">
            {treatmentPlans.map((plan, idx) => (
              <div key={plan.id || idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50/40 break-inside-avoid">
                <h4 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wide">
                  Plan de Tratamiento #{idx + 1}
                </h4>

                <div className="grid grid-cols-4 gap-4 mb-4 text-xs">
                  {plan.treatmentStartDate && (
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Inicio del Plan</p>
                      <p className="font-semibold text-slate-800">{plan.treatmentStartDate}</p>
                    </div>
                  )}
                  {plan.recommendedSessions !== '' && (
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Sesiones Recomendadas</p>
                      <p className="font-semibold text-slate-800">{plan.recommendedSessions}</p>
                    </div>
                  )}
                  {plan.attendedSessionsCount !== '' && (
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Sesiones Asistidas</p>
                      <p className="font-semibold text-slate-800">{plan.attendedSessionsCount}</p>
                    </div>
                  )}
                  {plan.attendedDates && (
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Días de Asistencia</p>
                      <p className="font-semibold text-slate-800 truncate">{plan.attendedDates}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Plan de Tratamiento / Objetivos</p>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{plan.treatmentPlan || 'Sin registro'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Observaciones & Recomendaciones</p>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{plan.observations || 'Sin registro'}</p>
                  </div>
                </div>

                {plan.sessions && plan.sessions.length > 0 && (
                  <div className="mt-2 text-[11px]">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Historial de evolución del plan</p>
                    <table className="w-full text-left border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[9px] text-slate-600">
                          <th className="px-2 py-1.5 border-r border-slate-300 text-center w-12">Sesión</th>
                          <th className="px-2 py-1.5 border-r border-slate-300 w-24">Fecha</th>
                          <th className="px-2 py-1.5 border-r border-slate-300 text-center w-16">Dolor (EVA)</th>
                          <th className="px-2 py-1.5 border-r border-slate-300">Procedimiento realizado</th>
                          <th className="px-2 py-1.5 border-r border-slate-300">Evolución clínica</th>
                          <th className="px-2 py-1.5 w-32">Fisioterapeuta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {plan.sessions.map((session, sIdx) => (
                          <tr key={session.sessionNumber || sIdx} className="text-slate-700">
                            <td className="px-2 py-1 border-r border-slate-200 text-center font-bold">#{session.sessionNumber}</td>
                            <td className="px-2 py-1 border-r border-slate-200">{session.date}</td>
                            <td className="px-2 py-1 border-r border-slate-200 text-center font-semibold">{session.painLevel}/10</td>
                            <td className="px-2 py-1 border-r border-slate-200">{session.procedure || '-'}</td>
                            <td className="px-2 py-1 border-r border-slate-200">{session.evolution || '-'}</td>
                            <td className="px-2 py-1 font-medium text-slate-800">{session.physiotherapist || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-16 pt-16 border-t border-slate-200 grid grid-cols-2 text-center text-slate-500">
           <div>
             <div className="w-48 border-b border-slate-400 mx-auto mb-2"></div>
             <p className="text-sm">Firma del Profesional</p>
           </div>
           <div>
             <div className="w-48 border-b border-slate-400 mx-auto mb-2"></div>
             <p className="text-sm">Firma del Paciente</p>
           </div>
        </div>
      </div>
    </div>
    </>
  );
}
