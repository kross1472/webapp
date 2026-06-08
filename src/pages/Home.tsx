import { Button } from "../components/ui/Button";
import { ArrowRight, CheckCircle2, Phone, Calendar as CalendarIcon, MessageCircle, Activity, X } from "lucide-react";
import { BookingForm } from "../components/BookingForm";
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

import { motion } from "motion/react";

export function Home() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryCentroImages, setGalleryCentroImages] = useState<string[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const promosSnap = await getDocs(query(collection(db, 'promotions'), orderBy('createdAt', 'desc')));
        setPromotions(promosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const gallerySnap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
        const imagesNosotros = gallerySnap.docs.map(d => (d.data() as any).data);
        setGalleryImages(imagesNosotros); // we handle fallback during render or here
        
        const galleryCentroSnap = await getDocs(query(collection(db, 'gallery_centro'), orderBy('createdAt', 'desc')));
        const imagesCentro = galleryCentroSnap.docs.map(d => (d.data() as any).data);
        if (imagesCentro.length > 0) {
          setGalleryCentroImages(imagesCentro);
        } else {
          setGalleryCentroImages([
            "/galeria/1.jpg.jpeg",
            "/galeria/2.jpg.jpeg",
            "/galeria/3.jpg.jpeg",
            "/galeria/4.jpg.jpeg",
          ]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const specialties = [
    { title: "Geriátrica", desc: "Recuperación de movilidad en adultos mayores" },
    { title: "Pediátrica", desc: "Desarrollo y atención motriz infantil" },
    { title: "Ortopédica", desc: "Tratamiento post-operatorio y lesiones" },
    { title: "Neurológica", desc: "Rehabilitación de sistema nervioso" },
    { title: "Traumatológica", desc: "Lesiones, fracturas y esguinces" },
    { title: "Deportiva", desc: "Recuperación y rendimiento para atletas" },
  ];

  const packages = [
    { name: "1 Sesión", price: 15, desc: "Evaluación inicial y tratamiento" },
    { name: "5 Sesiones", price: 65, desc: "Paquete básico de recuperación", isPopular: true },
    { name: "10 Sesiones", price: 120, desc: "Tratamiento intermedio recomendado" },
    { name: "20 Sesiones", price: 225, desc: "Rehabilitación integral completa" },
  ];

  return (
    <div className="flex flex-col gap-24 pb-24 overflow-y-auto">
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl text-slate-800">
            <span className="inline-block px-3 py-1 bg-teal-50 text-brand-light text-xs font-bold uppercase tracking-widest rounded-full mb-4">
              Atención Fisioterapéutica de excelencia
            </span>
            <h1 className="text-5xl md:text-6xl font-display font-extrabold leading-[1.1] mb-6 tracking-tight">
              Recupera tu <span className="text-brand-light">movilidad</span>, bienestar y calidad de vida.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 font-medium max-w-xl leading-relaxed">
              Especialistas en fisioterapia y rehabilitación integral para niños, jóvenes, adultos y adultos mayores con tecnología terapéutica de vanguardia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="gap-2 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:brightness-110 border-0" onClick={() => document.getElementById('agendar-cita')?.scrollIntoView({ behavior: 'smooth' })}>
                <CalendarIcon size={20} /> AGENDAR CITA
              </Button>
              <a href="https://wa.me/593983558404?text=Hola,%20quisiera%20más%20información%20sobre%20sus%20servicios%20de%20fisioterapia." target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl h-[60px] px-8 text-lg font-bold transition-all border-2 border-slate-200 text-slate-700 bg-white hover:bg-slate-100 gap-2">
                <MessageCircle size={24} className="text-green-500" /> WHATSAPP
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Promociones */}
      {promotions.length > 0 && (
        <section id="promociones" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-[-3rem] relative z-20 scroll-mt-24">
          <div className="bg-white rounded-3xl p-4 md:p-6 shadow-xl border border-brand-light/20 flex flex-col items-center">
            <h2 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2">
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-md uppercase tracking-wider font-bold animate-pulse">Nuevo</span>
              Nuestras Promociones
            </h2>
            <div className="overflow-x-auto w-full pb-4 snap-x">
              <div className="flex gap-6 w-max mx-auto px-2">
                {promotions.map((promo, i) => (
                  <div key={promo.id || i} onClick={() => setSelectedPromo(promo.data)} className="snap-center sm:w-[400px] w-[300px] aspect-[16/6] sm:aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-200 flex-shrink-0 cursor-pointer">
                    <img src={promo.data} alt="Promoción" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quiénes Somos */}
      <section id="nosotros" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-12 items-center">
          <div className="md:w-1/2">
            <h2 className="text-3xl font-display font-bold text-slate-800 mb-6">Quiénes Somos</h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Somos un centro especializado en fisioterapia y rehabilitación enfocado en mejorar la salud, movilidad y calidad de vida de nuestros pacientes mediante tratamientos personalizados, tecnología terapéutica y atención profesional de excelencia.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Contamos con personal capacitado y experiencia en múltiples áreas de rehabilitación, brindando atención humana, segura y efectiva.
            </p>
          </div>
          <div className="md:w-1/2 grid grid-cols-2 gap-4">
            <img src={galleryImages[0] || "/quienes-somos/1.jpg.jpeg"} alt="Terapia manual" className="rounded-2xl w-full h-48 object-cover shadow-sm bg-slate-100" />
            <img src={galleryImages[1] || "/quienes-somos/2.jpg.jpeg"} alt="Clínica" className="rounded-2xl w-full h-48 object-cover mt-8 shadow-sm bg-slate-100" />
          </div>
        </div>
      </section>

      {/* Áreas y Patologías */}
      <section id="especialidades" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-display font-bold text-slate-800 mb-4">Áreas y Patologías</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Tratamientos especializados y adaptados a las necesidades específicas de cada paciente.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialties.map((spec, i) => (
            <div key={i} className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-brand-light/30">
              <div className="w-12 h-12 bg-teal-50 text-brand-light rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-light group-hover:text-white transition-colors">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{spec.title}</h3>
              <p className="text-slate-600 text-sm">{spec.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Galería del Centro */}
      <section id="galeria" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-display font-bold text-slate-800 mb-4">Galería del Centro</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Instalaciones de primer nivel y equipos de rehabilitación modernos para tu comodidad.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {galleryCentroImages.map((src, idx) => (
             <motion.div
               key={idx}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               whileHover={{ scale: 1.03 }}
               transition={{ type: "spring", stiffness: 300, damping: 20, delay: idx * 0.1 }}
               className="overflow-hidden rounded-2xl shadow-sm bg-slate-100"
             >
               <img src={src} alt="Galería instalaciones" className="w-full h-64 object-cover" />
             </motion.div>
          ))}
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="bg-brand-dark text-white py-24 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold mb-4">Nuestros Servicios</h2>
            <p className="text-white/80 max-w-2xl mx-auto">Tratamientos especializados para garantizar su completa recuperación y bienestar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 max-w-6xl mx-auto">
            {["Fisioterapia y Rehabilitacion", "Descarga Muscular", "Masaje Terapeutico (relajante-descontracturante)", "Crioterapia"].map((service, i) => (
              <div key={i} className="bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-sm flex flex-col items-center text-center hover:bg-white/15 transition-colors">
                <Activity className="text-brand-light mb-4" size={32}/>
                <h3 className="text-lg font-bold mb-4 leading-tight">{service}</h3>
                <Button 
                  variant="outline" 
                  className="mt-auto w-full text-white border-white/30 hover:bg-white hover:text-brand-dark"
                  onClick={() => document.getElementById('agendar-cita')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Agendar
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agendamiento Section */}
      <section id="agendar-cita" className="max-w-4xl mx-auto px-4 w-full scroll-mt-24">
        <div className="text-center">
          <CalendarIcon size={48} className="text-brand-light mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-display font-bold text-slate-800 mb-4">Agendar Cita</h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            El sistema inteligente de reservas te permitirá solicitar la disponibilidad y asegurar tu espacio rápidamente.
          </p>
          <BookingForm />
        </div>
      </section>

      {/* Image Modal for Promotions */}
      {selectedPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPromo(null)}>
          <div className="relative max-w-5xl w-full flex justify-center items-center">
            <button onClick={() => setSelectedPromo(null)} className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors">
              <X size={32} />
            </button>
            <img src={selectedPromo} alt="Promoción expandida" className="rounded-xl object-contain max-h-[85vh] w-auto shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}

// utility function added for layout merging in Home
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
