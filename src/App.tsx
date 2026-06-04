/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicLayout } from "./pages/PublicLayout";
import { Home } from "./pages/Home";
import { AdminLayout } from "./pages/AdminLayout";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminClinicalHistory } from "./pages/AdminClinicalHistory";
import { AdminPatients } from "./pages/AdminPatients";
import { AdminContent } from "./pages/AdminContent";
import { AdminStaff } from "./pages/AdminStaff";
import { Toaster } from 'sonner';

import { AuthProvider } from './lib/AuthContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
          </Route>
          
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="patients" element={<AdminPatients />} />
            <Route path="history/new" element={<AdminClinicalHistory />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="staff" element={<AdminStaff />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
