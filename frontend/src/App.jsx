import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import AdminShell from './components/AdminShell';
import AppShell from './components/AppShell';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
import SupplierRoute from './components/SupplierRoute';
import SupplierShell from './components/SupplierShell';
import Loader from './components/ui/loader';
import './App.css';

const BackofficeDashboard = lazy(() => import('./pages/admin/Dashboard/Dashboard'));
const Articles = lazy(() => import('./pages/admin/Articles/Articles'));
const Fournisseurs = lazy(() => import('./pages/admin/Fournisseurs/Fournisseurs'));
const Paramètres = lazy(() => import('./pages/admin/Paramètres/Paramètres'));
const Simulations = lazy(() => import('./pages/admin/Simulations/Simulations'));
const Support = lazy(() => import('./pages/admin/Support/Support'));
const Utilisateurs = lazy(() => import('./pages/admin/Utilisateurs/Utilisateurs'));
const Home = lazy(() => import('./pages/user/Home/Home'));
const Login = lazy(() => import('./pages/user/Login/Login'));
const Register = lazy(() => import('./pages/user/Register/Register'));
const ResetPassword = lazy(() => import('./pages/user/ResetPassword/ResetPassword'));
const Dashboard = lazy(() => import('./pages/user/Dashboard/Dashboard'));
const Catalogue = lazy(() => import('./pages/user/Catalogue/Catalogue'));
const Archives = lazy(() => import('./pages/user/Archives/Archives'));
const Demande = lazy(() => import('./pages/user/Demande/Demande'));
const Logout = lazy(() => import('./pages/user/Logout/Logout'));
const Workspace = lazy(() => import('./pages/user/Workspace/Workspace'));
const EspacePro = lazy(() => import('./pages/user/EspacePro/EspacePro'));
const FicheProduits = lazy(() => import('./pages/user/FicheProduits/ficheProduits'));
const ExportPdf = lazy(() => import('./pages/user/Exportpdf/Exportpdf'));
const UserParametres = lazy(() => import('./pages/user/Parametres/Parametres'));
const UserSupport = lazy(() => import('./pages/user/Support/Support'));
const SupplierDashboard = lazy(() => import('./pages/supplier/Dashboard/Dashboard'));
const SupplierClients = lazy(() => import('./pages/supplier/Clients/Clients'));
const SupplierDemandesup = lazy(() => import('./pages/supplier/Demandesup/Demandesup'));
const SupplierFichiers = lazy(() => import('./pages/supplier/Fichiers/Fichiers'));
const SupplierMaBoutique = lazy(() => import('./pages/supplier/MaBoutique/MaBoutique'));
const SupplierParametres = lazy(() => import('./pages/supplier/Parametres/Parametres'));
const SupplierAjouterProduit = lazy(() => import('./pages/supplier/AjouterProduit/AjouterProduit'));
const SupplierProduits = lazy(() => import('./pages/supplier/Produits/Produits'));
const SupplierSupport = lazy(() => import('./pages/supplier/Support/Support'));

function App() {
  useEffect(() => {
    const applyStoredTheme = () => {
      const isDark = window.localStorage.getItem('archiprice:theme') === 'dark';
      document.body.classList.toggle('theme-dark', isDark);
    };
    applyStoredTheme();
    window.addEventListener('storage', applyStoredTheme);
    return () => window.removeEventListener('storage', applyStoredTheme);
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<Loader label="Chargement de la page..." />}>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/export-pdf/:documentId"
          element={(
            <ProtectedRoute>
              <ExportPdf />
            </ProtectedRoute>
          )}
        />
        <Route
          element={
            <AdminRoute>
              <AdminShell />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<BackofficeDashboard />} />
          <Route path="/admin/catalogue/products" element={<Articles />} />
          <Route path="/admin/catalogue/filters" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/suppliers" element={<Fournisseurs />} />
          <Route path="/admin/suppliers/requests" element={<Navigate to="/admin/suppliers" replace />} />
          <Route path="/admin/users" element={<Utilisateurs />} />
          <Route path="/admin/simulations" element={<Simulations />} />
          <Route path="/admin/support" element={<Support />} />
          <Route path="/admin/support/tickets" element={<Navigate to="/admin/support" replace />} />
          <Route path="/admin/support/feedback" element={<Navigate to="/admin/support" replace />} />
          <Route path="/admin/support/price-reports" element={<Navigate to="/admin/support" replace />} />
          <Route path="/admin/settings" element={<Paramètres />} />
          <Route path="/admin/settings/simulations" element={<Navigate to="/admin/settings" replace />} />
          <Route path="/admin/settings/regional-coefficients" element={<Navigate to="/admin/settings" replace />} />
        </Route>
        <Route
          element={
            <SupplierRoute>
              <SupplierShell />
            </SupplierRoute>
          }
        >
          <Route path="/supplier" element={<Navigate to="/supplier/dashboard" replace />} />
          <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
          <Route path="/supplier/shop" element={<SupplierMaBoutique />} />
          <Route path="/supplier/products" element={<SupplierProduits />} />
          <Route path="/supplier/products/new" element={<SupplierAjouterProduit />} />
          <Route path="/supplier/clients" element={<SupplierClients />} />
          <Route path="/supplier/demande" element={<SupplierDemandesup />} />
          <Route path="/supplier/content/files" element={<SupplierFichiers />} />
          <Route path="/supplier/support" element={<SupplierSupport />} />
          <Route path="/supplier/settings" element={<SupplierParametres />} />
        </Route>
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/fiche-produits/:productId" element={<FicheProduits />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/espacepro" element={<EspacePro />} />
          <Route path="/demande" element={<Demande />} />
          <Route path="/archives" element={<Archives />} />
          <Route path="/factures" element={<Navigate to="/archives" replace />} />
          <Route path="/support" element={<UserSupport />} />
          <Route path="/parametres" element={<UserParametres />} />
          <Route path="/deconnexion" element={<Logout />} />
        </Route>
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
