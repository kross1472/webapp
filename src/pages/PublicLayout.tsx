import { Outlet, Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Activity, Phone, MapPin, Clock, Calendar, Instagram } from "lucide-react";

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
            <Clock size={14} className="text-brand-light" /> Lunes a Sábado: 8:00 AM - 9:00 PM
          </div>
        </div>
        <div className="flex gap-4">
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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-dark">
                <Activity size={24} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-xl tracking-tight leading-none text-brand-dark">
                Pro<span className="text-brand-light">Physical</span>
              </span>
            </Link>

            <nav className="hidden md:flex gap-8 items-center font-medium text-slate-600">
              <Link to="/#servicios" className="hover:text-brand-light transition-colors">Servicios</Link>
              <Link to="/#nosotros" className="hover:text-brand-light transition-colors">Nosotros</Link>
              <Link to="/#especialidades" className="hover:text-brand-light transition-colors">Especialidades</Link>
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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-dark">
                <Activity size={24} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-bold text-xl tracking-tight leading-none text-brand-dark">
                Pro<span className="text-brand-light">Physical</span>
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-4">
              Mejoramos tu salud, movilidad y calidad de vida con atención profesional y personalizada.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-slate-800">Enlaces Rápidos</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link to="/" className="hover:text-brand-light">Inicio</Link></li>
              <li><a href="#servicios" className="hover:text-brand-light">Servicios</a></li>
              <li><a href="#nosotros" className="hover:text-brand-light">Quiénes Somos</a></li>
              <li><Link to="/admin" className="hover:text-brand-light">Portal Administrativo</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-slate-800">Horarios</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>Lunes - Viernes: 8:00 AM - 9:00 PM</li>
              <li>Sábado: 8:00 AM - 2:00 PM</li>
              <li>Domingo: Cerrado</li>
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
                <span>+593 123 456 789</span>
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
    </div>
  );
}
