import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';

// 1. CONFIGURACIÓN DEL PROYECTO VIEJO (elegant-coral-3v7sv / ai-studio-4f8b9def-d8ac-403e-a6eb-b5a1ae32aaea)
const oldFirebaseConfig = {
  apiKey: "AIzaSyB_gDg-VGvSR_bTeDnq6Nt5P4FXQcykN_U", // Reemplazar si el proyecto viejo era otro
  projectId: "elegant-coral-3v7sv",
  appId: "1:812241769524:web:fc34ec233b266eca12a661",
  authDomain: "elegant-coral-3v7sv.firebaseapp.com",
};
const oldDatabaseId = "ai-studio-4f8b9def-d8ac-403e-a6eb-b5a1ae32aaea";

// 2. CONFIGURACIÓN DEL PROYECTO NUEVO (prophysical-6381f / (default))
const newFirebaseConfig = {
  apiKey: "AIzaSyABmo8bEnkpr-zmL2cfTEDO2QTptK3FxRo",
  projectId: "prophysical-6381f",
  appId: "1:287253617903:web:284a34d8f031b199330f1a",
  authDomain: "prophysical-6381f.firebaseapp.com",
};
const newDatabaseId = "(default)";

const appOld = initializeApp(oldFirebaseConfig, "OldApp");
const appNew = initializeApp(newFirebaseConfig, "NewApp");

const dbOld = getFirestore(appOld, oldDatabaseId);
const dbNew = getFirestore(appNew, newDatabaseId);

async function migrate() {
    try {
        const collections = ['users', 'appointments', 'mail', 'patients', 'promotions', 'gallery', 'gallery_centro', 'availability', 'staff_users'];
        let totalCount = 0;
        
        for (const col of collections) {
            console.log(`Migrating ${col}...`);
            const oldDocs = await getDocs(collection(dbOld, col));
            console.log(`Found ${oldDocs.docs.length} docs in ${col} from old DB`);
            
            for (const d of oldDocs.docs) {
                // Saltar si es staff_users para no sobreescribir la migración actual
                if (col === 'staff_users') continue;

                await setDoc(doc(dbNew, col, d.id), d.data(), { merge: true });
                totalCount++;
                
                // Si es paciente, copiar la subcolección de historial clínico
                if (col === 'patients') {
                     const subCols = await getDocs(collection(dbOld, `patients/${d.id}/clinical_histories`));
                     for (const subD of subCols.docs) {
                         await setDoc(doc(dbNew, `patients/${d.id}/clinical_histories`, subD.id), subD.data(), { merge: true });
                     }
                }
            }
        }
        
        console.log(`Migration complete! Migrated ${totalCount} top-level docs.`);
        process.exit(0);
    } catch(err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

migrate();
