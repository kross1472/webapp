import { Outlet, Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Activity, Phone, MapPin, Clock, Calendar, Instagram, Facebook, MessageCircle } from "lucide-react";

export function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 text-slate-500 py-2 px-4 md:px-8 text-xs font-medium hidden md:flex justify-between items-center shadow-sm">
        <div className="flex gap-6">
          <a href="https://www.google.com/maps/place/Pro+Physical+Fisioterapia+y+Rehabilitaci%C3%B3n/@-1.4893256,-78.0113622,755m" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-light transition-colors">
            <MapPin size={14} className="text-brand-light" /> Pro Physical, Puyo
          </a>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-brand-light" /> Lunes a Viernes: 8:00 AM - 9:00 PM | Sáb - Dom: Con Cita Previa
          </div>
        </div>
        <div className="flex gap-4">
          <a href="https://www.facebook.com/prophysicalpuyo/?locale=es_LA" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-light transition-colors">
            <Facebook size={14} className="text-brand-light" /> ProPhysical
          </a>
          <a href="https://www.instagram.com/prophysical_puyo/?hl=es" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-light transition-colors">
            <Instagram size={14} className="text-brand-light" /> @prophysical_puyo
          </a>
        </div>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 h-20 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.jpeg" alt="ProPhysical Logo" className="h-14 w-auto object-contain" />
            </Link>

            <nav className="hidden md:flex gap-4 items-center">
              <button onClick={() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })} className="px-5 py-2 rounded-full text-white font-semibold shadow-md transition-all bg-brand-dark hover:brightness-110">Servicios</button>
              <button onClick={() => document.getElementById('nosotros')?.scrollIntoView({ behavior: 'smooth' })} className="px-5 py-2 rounded-full text-white font-semibold shadow-md transition-all bg-brand-dark hover:brightness-110">Nosotros</button>
              <button onClick={() => document.getElementById('especialidades')?.scrollIntoView({ behavior: 'smooth' })} className="px-5 py-2 rounded-full text-white font-semibold shadow-md transition-all bg-brand-dark hover:brightness-110">Especialidades</button>
              <Link to="/admin" className="px-5 py-2 rounded-full text-white font-semibold shadow-md transition-all bg-brand-dark hover:brightness-110">Portal Staff</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow overflow-hidden flex flex-col">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
             <div className="flex items-center gap-3 mb-4">
              <img src="/logo.jpeg" alt="ProPhysical Logo" className="h-20 w-auto object-contain" />
            </div>
            <p className="text-slate-500 text-sm mt-4">
              Mejoramos tu salud, movilidad y calidad de vida con atención profesional y personalizada.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-slate-800">Enlaces Rápidos</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link to="/" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-brand-light">Inicio</Link></li>
              <li><button onClick={() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-brand-light">Servicios</button></li>
              <li><button onClick={() => document.getElementById('nosotros')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-brand-light">Quiénes Somos</button></li>
              <li><Link to="/admin" className="hover:text-brand-light">Portal Administrativo</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-800">Horarios</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>Lunes - Viernes: 8:00 AM - 9:00 PM</li>
              <li>Sábado: Con Cita Previa</li>
              <li>Domingo: Con Cita Previa</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-800">Contacto</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li className="flex gap-3 items-start group">
                <MapPin size={18} className="mt-0.5 text-brand-light flex-shrink-0" /> 
                <a href="https://www.google.com/maps/place/Pro+Physical+Fisioterapia+y+Rehabilitaci%C3%B3n/@-1.4893256,-78.0113622,755m/data=!3m1!1e3!4m14!1m7!3m6!1s0x91d3df4c5823f635:0x6831f05c2eecbf39!2sPro+Physical+Fisioterapia+y+Rehabilitaci%C3%B3n!8m2!3d-1.489331!4d-78.0087873!16s%2Fg%2F11ygtxz73b!3m5!1s0x91d3df4c5823f635:0x6831f05c2eecbf39!8m2!3d-1.489331!4d-78.0087873!16s%2Fg%2F11ygtxz73b?entry=ttu" target="_blank" rel="noopener noreferrer" className="hover:text-brand-light transition-colors">
                  Pro Physical Fisioterapia y Rehabilitación, Puyo
                </a>
              </li>
              <li className="flex gap-3 items-center group">
                <Phone size={18} className="text-brand-light flex-shrink-0" /> 
                <span>098 355 8404</span>
              </li>
              <li className="flex gap-3 items-center group">
                <Facebook size={18} className="text-brand-light flex-shrink-0" /> 
                <a href="https://www.facebook.com/prophysicalpuyo/?locale=es_LA" target="_blank" rel="noopener noreferrer" className="hover:text-brand-light transition-colors">
                  ProPhysical Puyo
                </a>
              </li>
              <li className="flex gap-3 items-center group">
                <Instagram size={18} className="text-brand-light flex-shrink-0" /> 
                <a href="https://www.instagram.com/prophysical_puyo/?hl=es" target="_blank" rel="noopener noreferrer" className="hover:text-brand-light transition-colors">
                  @prophysical_puyo
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Sistema Seguro
            </span>
          </div>
          <div className="text-center md:text-right">
            &copy; {new Date().getFullYear()} ProPhysical Fisioterapia y Rehabilitación. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/593983558404?text=Hola,%20quisiera%20agendar%20una%20cita%20o%20conocer%20más%20acerca%20de%20ProPhysical."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center focus:outline-none ring-4 ring-green-500/20 group"
      >
        <MessageCircle fill="white" size={32} />
        <span className="absolute right-20 bg-white text-slate-800 text-sm font-bold py-2 px-4 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none after:content-[''] after:absolute after:top-1/2 after:-right-2 after:-translate-y-1/2 after:border-8 after:border-transparent after:border-l-white">
          ¡Chatea con nosotros!
        </span>
      </a>
    </div>
  );
}
