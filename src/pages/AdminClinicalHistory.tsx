import React, { useState, useEffect } from 'react';
import { Button } from "../components/ui/Button";
import { db } from "../lib/firebase";
import { collection, addDoc, doc, setDoc, getDocs } from "firebase/firestore";
import { FileText, Save, ArrowLeft, Download } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "motion/react";

export function AdminClinicalHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form State
  const [patientId, setPatientId] = useState('temp-patient-' + Math.floor(Math.random() * 1000));
  const [patientName, setPatientName] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);

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
      setTreatment(h.treatmentPlan || '');
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
    const fetchPatients = async () => {
      try {
        const snap = await getDocs(collection(db, 'patients'));
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Could not load patients", e);
      }
    };
    fetchPatients();
  }, []);

  // Form State
  const [reason, setReason] = useState('');
  const [illness, setIllness] = useState('');
  const [painScale, setPainScale] = useState(0);
  const [medicalHist, setMedicalHist] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [evolution, setEvolution] = useState('');
  const [observations, setObservations] = useState('');
  const [treatmentStartDate, setTreatmentStartDate] = useState('');
  const [recommendedSessions, setRecommendedSessions] = useState<number | ''>('');
  const [attendedSessionsCount, setAttendedSessionsCount] = useState<number | ''>('');
  const [attendedDates, setAttendedDates] = useState('');
  
  // Demographics (PDF)
  const [idCard, setIdCard] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("El nombre del paciente es requerido");
      return;
    }
    
    if (treatmentStartDate) {
      const selectedDate = new Date(treatmentStartDate);
      const today = new Date();
      // Reset hours to compare only dates
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0); // We only get YYYY-MM-DD from input, so it's already local midnight-ish

      if (selectedDate > today) {
        toast.error("La fecha de inicio de tratamiento no puede ser futura");
        return;
      }
    }

    if (recommendedSessions !== '' && Number(recommendedSessions) < 0) {
      toast.error("Las sesiones recomendadas no pueden ser negativas");
      return;
    }

    if (attendedSessionsCount !== '' && Number(attendedSessionsCount) < 0) {
      toast.error("Las sesiones asistidas no pueden ser negativas");
      return;
    }
    
    setLoading(true);
    try {
      // Create patient if it doesn't really exist (mocking the flow for now)
      const patientRef = doc(db, 'patients', patientId);
      await setDoc(patientRef, {
        firstName: patientName.split(' ')[0] || '',
        lastName: patientName.split(' ').slice(1).join(' ') || '',
        createdAt: Date.now()
      }, { merge: true });

      // Add Clinical History subcollection
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
        treatmentPlan: treatment,
        evolution: evolution,
        observations: observations,
        treatmentStartDate,
        recommendedSessions,
        attendedSessionsCount,
        attendedDates,
      };

      if (historyId) {
        // Update existing history
        const hRef = doc(db, 'patients', patientId, 'clinical_histories', historyId);
        await setDoc(hRef, { ...historyData, updatedAt: Date.now() }, { merge: true });
        toast.success("Historia Clínica actualizada con éxito");
      } else {
        // Create new history
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
                 rows={3} required value={illness} onChange={e => setIllness(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-none" 
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
                 rows={2} value={medicalHist} onChange={e => setMedicalHist(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-none" 
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
                 rows={3} value={physicalExam} onChange={e => setPhysicalExam(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-none" 
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Diagnóstico Fisioterapéutico</label>
               <textarea 
                 rows={2} required value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                 className="w-full bg-white border border-brand-light/30 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-none bg-brand-light/5" 
               />
             </div>
           </div>
        </motion.div>

        {/* Tratamiento y Observaciones */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-6 md:p-8 space-y-6">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Plan y Evolución</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Inicio Tratamiento</label>
               <input 
                 type="date" 
                 max={new Date().toISOString().split('T')[0]}
                 value={treatmentStartDate} onChange={e => setTreatmentStartDate(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all shadow-sm text-slate-700" 
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Sesiones Recomendadas</label>
               <input 
                 type="number" min="0" value={recommendedSessions} onChange={e => setRecommendedSessions(e.target.value === '' ? '' : Number(e.target.value))}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all shadow-sm text-slate-700" 
                 placeholder="Ej. 10"
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Sesiones Asistidas</label>
               <input 
                 type="number" min="0" value={attendedSessionsCount} onChange={e => setAttendedSessionsCount(e.target.value === '' ? '' : Number(e.target.value))}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all shadow-sm text-slate-700" 
                 placeholder="Ej. 3"
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Días Asistidos</label>
               <input 
                 type="text" value={attendedDates} onChange={e => setAttendedDates(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all shadow-sm text-slate-700" 
                 placeholder="Ej. 12/05, 14/05"
               />
             </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">Plan de Tratamiento / Objetivos</label>
               <textarea 
                 rows={4} required value={treatment} onChange={e => setTreatment(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-none" 
               />
             </div>
             <div className="flex flex-col gap-6">
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Evolución de la Sesión</label>
                 <textarea 
                   rows={2} value={evolution} onChange={e => setEvolution(e.target.value)}
                   className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-none" 
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Observaciones / Recomendaciones al Paciente</label>
                 <textarea 
                   rows={2} value={observations} onChange={e => setObservations(e.target.value)}
                   className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-light transition-all resize-none" 
                 />
               </div>
             </div>
           </div>
           
           <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-4">
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
          <h3 className="text-lg font-bold border-b border-slate-200 pb-2 mb-4">Plan y Tratamiento</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 mb-4">
              {treatmentStartDate && (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Inicio de Tratamiento</p>
                  <p className="text-sm font-semibold">{treatmentStartDate}</p>
                </div>
              )}
              {recommendedSessions !== '' && (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Sesiones Recomendadas</p>
                  <p className="text-sm font-semibold">{recommendedSessions}</p>
                </div>
              )}
              {attendedSessionsCount !== '' && (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Sesiones Asistidas</p>
                  <p className="text-sm font-semibold">{attendedSessionsCount}</p>
                </div>
              )}
              {attendedDates && (
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">Días Asistidos</p>
                  <p className="text-sm font-semibold">{attendedDates}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Plan de Tratamiento / Objetivos</p>
              <p className="text-sm leading-relaxed">{treatment || 'Sin registro'}</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Evolución</p>
                <p className="text-sm leading-relaxed">{evolution || 'Sin registro'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Observaciones / Recomendaciones</p>
                <p className="text-sm leading-relaxed">{observations || 'Sin registro'}</p>
              </div>
            </div>
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
