import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Users, Search, Activity, FileText, ChevronLeft, ChevronRight, MessageCircle, Edit2, Download, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { PatientModal } from "../components/PatientModal";
import { PatientHistoryModal } from "../components/PatientHistoryModal";

export function AdminPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  useEffect(() => {
    const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredPatients = patients.filter(p => {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const id = (p.id || '').toLowerCase();
    const searchLow = searchTerm.toLowerCase();
    return fullName.includes(searchLow) || phone.includes(searchLow) || email.includes(searchLow) || id.includes(searchLow);
  });

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const currentSubset = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleExportCSV = () => {
    const headers = ["ID", "Nombres", "Apellidos", "Teléfono", "Email", "Fecha Registro"];
    const csvContent = [
      headers.join(","),
      ...patients.map(p => 
        [p.id, `"${p.firstName || ''}"`, `"${p.lastName || ''}"`, `"${p.phone || ''}"`, `"${p.email || ''}"`, p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''].join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pacientes_prophysical_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openNewPatient = () => {
    setSelectedPatient(null);
    setIsPatientModalOpen(true);
  };

  const openEditPatient = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    setSelectedPatient(p);
    setIsPatientModalOpen(true);
  };

  const openPatientHistory = (p: any) => {
    setSelectedPatient(p);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-3">
             <Users className="text-brand-light" /> Directorio de Pacientes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona y busca la información de todos los pacientes registrados.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, teléfono o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-brand-light transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              title="Exportar a CSV"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <Download size={18} /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={openNewPatient}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-brand-light hover:bg-brand-dark transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Añadir Paciente</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando pacientes...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Users size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-medium text-slate-700 mb-2">No se encontraron pacientes</p>
            <p className="text-sm mb-6">Prueba buscar con otros términos o registra uno nuevo.</p>
            <button
              onClick={openNewPatient}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white bg-brand-light hover:bg-brand-dark transition-colors shadow-md"
            >
              <Plus size={20} /> Registrar Primer Paciente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha de Registro</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentSubset.map((p, idx) => (
                  <motion.tr 
                    key={p.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => openPatientHistory(p)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 group-hover:text-brand-light transition-colors">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {p.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 font-medium">{p.phone || 'No registrado'}</div>
                      <div className="text-xs text-slate-400">{p.email || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Desconocido'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {p.phone && (
                          <a 
                            href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Enviar WhatsApp"
                            className="p-2 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle size={18} />
                          </a>
                        )}
                        <button 
                          onClick={(e) => openEditPatient(e, p)}
                          title="Editar Paciente"
                          className="p-2 rounded-lg text-brand-dark bg-brand-light/10 hover:bg-brand-light/20 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openPatientHistory(p);
                          }}
                          title="Ver Historias Clínicas"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-semibold border border-slate-200"
                        >
                          <Activity size={14} /> Historias
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/admin/history/new', { state: { patient: p } });
                          }}
                          title="Nueva Historia Clínica"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-brand-dark bg-brand-light/10 hover:bg-brand-light/20 transition-colors text-sm font-semibold border border-brand-light/20"
                        >
                          <FileText size={14} /> Nueva
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm text-slate-500 font-medium">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredPatients.length)} de {filteredPatients.length} pacientes
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-slate-700 px-2">{currentPage} / {totalPages}</span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <PatientModal 
        isOpen={isPatientModalOpen} 
        onClose={() => setIsPatientModalOpen(false)} 
        patient={selectedPatient} 
      />
      <PatientHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        patient={selectedPatient} 
      />
    </div>
  );
}
