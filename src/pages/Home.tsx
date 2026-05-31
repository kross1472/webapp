import { Button } from "../components/ui/Button";
import { ArrowRight, CheckCircle2, Phone, Calendar as CalendarIcon, MessageCircle, Activity } from "lucide-react";
import { BookingForm } from "../components/BookingForm";

import { motion } from "motion/react";

export function Home() {
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

  const galleryImages = [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80", // equipment
    "https://images.unsplash.com/photo-1527613426496-22877f6b92a4?auto=format&fit=crop&w=600&q=80", // therapy room
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80", // exercises
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80", // clinic interior
  ];

  return (
    <div className="flex flex-col gap-24 pb-24 overflow-y-auto">
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl text-slate-800">
            <span className="inline-block px-3 py-1 bg-teal-50 text-brand-light text-xs font-bold uppercase tracking-widest rounded-full mb-4">
              Atención Médica de Excelencia
            </span>
            <h1 className="text-5xl md:text-6xl font-display font-extrabold leading-[1.1] mb-6 tracking-tight">
              Recupera tu <span className="text-brand-light">movilidad</span>, bienestar y calidad de vida.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 font-medium max-w-xl leading-relaxed">
              Especialistas en fisioterapia y rehabilitación integral para niños, adultos y adultos mayores con tecnología terapéutica de vanguardia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="gap-2 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:brightness-110 border-0" onClick={() => document.getElementById('agendar-cita')?.scrollIntoView({ behavior: 'smooth' })}>
                <CalendarIcon size={20} /> AGENDAR CITA
              </Button>
              <a href="https://wa.me/1234567890?text=Hola,%20quisiera%20más%20información%20sobre%20sus%20servicios%20de%20fisioterapia." target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-xl h-[60px] px-8 text-lg font-bold transition-all border-2 border-slate-200 text-slate-700 bg-white hover:bg-slate-100 gap-2">
                <MessageCircle size={24} className="text-green-500" /> WHATSAPP
              </a>
            </div>
          </div>
        </div>
      </section>

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
            <img src="https://images.unsplash.com/photo-1588286840104-8957b019727f?auto=format&fit=crop&w=400&q=80" alt="Terapia manual" className="rounded-2xl w-full h-48 object-cover shadow-sm bg-slate-100" />
            <img src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=400&q=80" alt="Clínica" className="rounded-2xl w-full h-48 object-cover mt-8 shadow-sm bg-slate-100" />
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
          {galleryImages.map((src, idx) => (
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

      {/* Servicios y Precios */}
      <section id="servicios" className="bg-brand-dark text-white py-24 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold mb-4">Servicios y Tarifas</h2>
            <p className="text-white/80 max-w-2xl mx-auto">Planes accesibles diseñados para garantizar su completa recuperación.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-16">
            {packages.map((pkg, i) => (
              <div key={i} className={cn("relative rounded-2xl p-6", pkg.isPopular ? "bg-white text-slate-800 shadow-xl scale-105 z-10" : "bg-white/10 text-white border border-white/20")}>
                {pkg.isPopular && <div className="absolute top-0 right-6 -translate-y-1/2 bg-brand-light text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Más Popular</div>}
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1">{pkg.name}</h3>
                  <p className={cn("text-sm", pkg.isPopular ? "text-slate-500" : "text-white/70")}>{pkg.desc}</p>
                </div>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold">${pkg.price}</span>
                </div>
                <Button variant={pkg.isPopular ? "primary" : "outline"} className={cn("w-full", !pkg.isPopular && "text-white border-white/30 hover:bg-white hover:text-brand-dark")}>Seleccionar</Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity className="text-brand-light" size={20}/> Descargas y Masajes</h3>
              <ul className="space-y-4">
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span>Cuerpo completo</span>
                  <span className="font-bold text-brand-light">$20</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Medio cuerpo</span>
                  <span className="font-bold text-brand-light">$15</span>
                </li>
              </ul>
            </div>
            <div className="bg-white/10 p-6 rounded-2xl border border-white/20 backdrop-blur-sm">
               <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="text-brand-light" size={20}/> Crioterapia</h3>
               <ul className="space-y-4">
                <li className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div>
                    <span className="block">Sesión Grupal</span>
                    <span className="text-xs text-white/50">Grupos de 3 a 4 personas</span>
                  </div>
                  <span className="font-bold text-brand-light">$10 / pax</span>
                </li>
              </ul>
            </div>
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
    </div>
  );
}

// utility function added for layout merging in Home
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
