import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { Image as ImageIcon, Trash2, Loader2, Upload } from 'lucide-react';

export function AdminContent() {
  const { role } = useAuth();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [galleryCentro, setGalleryCentro] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  if (role !== 'admin' && role !== 'receptionist') {
    return <div className="p-8"><p className="text-red-500 font-bold">Acceso denegado. No tienes permisos para ver esta sección.</p></div>;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const promosSnap = await getDocs(query(collection(db, 'promotions'), orderBy('createdAt', 'desc')));
      setPromotions(promosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const gallerySnap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
      setGallery(gallerySnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const galleryCentroSnap = await getDocs(query(collection(db, 'gallery_centro'), orderBy('createdAt', 'desc')));
      setGalleryCentro(galleryCentroSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resizeImageAndGetBase64 = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No ctx');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'promotions' | 'gallery' | 'gallery_centro') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      const base64 = await resizeImageAndGetBase64(file, 1024, 1024);
      await addDoc(collection(db, type), {
        data: base64,
        createdAt: Date.now()
      });
      toast.success('Imagen subida exitosamente');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al procesar y subir la imagen');
    } finally {
      setUploading(false);
      e.target.value = ''; // reset
    }
  };

  const handleDelete = async (id: string, type: 'promotions' | 'gallery' | 'gallery_centro') => {
    try {
      await deleteDoc(doc(db, type, id));
      toast.success('Eliminado correctamente');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar');
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-light" size={32} /></div>;
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ImageIcon className="text-brand-light" size={24}/> Promociones</h2>
            <p className="text-sm text-slate-500 mt-1">Sube banners promocionales para mostrar en la pestaña superior a todos los usuarios.</p>
          </div>
          <label className={`cursor-pointer bg-brand-light text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-brand-dark transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
             {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
             Subir Banner
             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'promotions')} />
          </label>
        </div>
        
        {promotions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">No hay promociones activas</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map(promo => (
              <div key={promo.id} className="relative group bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-video">
                <img src={promo.data} alt="Promo" className="w-full h-full object-cover" />
                <button 
                  onClick={() => handleDelete(promo.id, 'promotions')}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ImageIcon className="text-teal-500" size={24}/> Galería ("Quiénes Somos")</h2>
            <p className="text-sm text-slate-500 mt-1">Fotografías reales para mostrar en la sección Nosotros de la página pública.</p>
          </div>
          <label className={`cursor-pointer bg-teal-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-teal-600 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
             {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
             Subir Foto
             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'gallery')} />
          </label>
        </div>
        
        {gallery.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">No hay fotos en la galería</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map(img => (
              <div key={img.id} className="relative group bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-square">
                <img src={img.data} alt="Gallery" className="w-full h-full object-cover" />
                <button 
                  onClick={() => handleDelete(img.id, 'gallery')}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ImageIcon className="text-blue-500" size={24}/> Galería del Centro</h2>
            <p className="text-sm text-slate-500 mt-1">Sube fotografías de las instalaciones y equipos de rehabilitación para la Galería del Centro.</p>
          </div>
          <label className={`cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-600 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
             {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
             Subir Foto
             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'gallery_centro')} />
          </label>
        </div>
        
        {galleryCentro.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">No hay fotos en la Galería del Centro</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryCentro.map(img => (
              <div key={img.id} className="relative group bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-video">
                <img src={img.data} alt="Gallery Centro" className="w-full h-full object-cover" />
                <button 
                  onClick={() => handleDelete(img.id, 'gallery_centro')}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
         )}
      </div>
    </div>
  );
}
