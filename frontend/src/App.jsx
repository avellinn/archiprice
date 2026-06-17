import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import AdminShell from './components/AdminShell';
import AppShell from './components/AppShell';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
import SupplierRoute from './components/SupplierRoute';
import SupplierShell from './components/SupplierShell';
import BackofficeDashboard from './pages/admin/Dashboard/Dashboard';
import Articles from './pages/admin/Articles/Articles';
import Fournisseurs from './pages/admin/Fournisseurs/Fournisseurs';
import Paramètres from './pages/admin/Paramètres/Paramètres';
import Simulations from './pages/admin/Simulations/Simulations';
import Support from './pages/admin/Support/Support';
import Utilisateurs from './pages/admin/Utilisateurs/Utilisateurs';
import Home from './pages/user/Home/Home';
import Login from './pages/user/Login/Login';
import Register from './pages/user/Register/Register';
import ResetPassword from './pages/user/ResetPassword/ResetPassword';
import Dashboard from './pages/user/Dashboard/Dashboard';
import Catalogue from './pages/user/Catalogue/Catalogue';
import Archives from './pages/user/Archives/Archives';
import Demande from './pages/user/Demande/Demande';
import Logout from './pages/user/Logout/Logout';
import Workspace from './pages/user/Workspace/Workspace';
import UserParametres from './pages/user/Parametres/Parametres';
import UserSupport from './pages/user/Support/Support';
import SupplierDashboard from './pages/supplier/Dashboard/Dashboard';
import SupplierClients from './pages/supplier/Clients/Clients';
import SupplierDemandesup from './pages/supplier/Demandesup/Demandesup';
import SupplierFichiers from './pages/supplier/Fichiers/Fichiers';
import SupplierMaBoutique from './pages/supplier/MaBoutique/MaBoutique';
import SupplierParametres from './pages/supplier/Parametres/Parametres';
import SupplierAjouterProduit from './pages/supplier/AjouterProduit/AjouterProduit';
import SupplierProduits from './pages/supplier/Produits/Produits';
import SupplierSupport from './pages/supplier/Support/Support';
import './App.css';

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/workspace" element={<Workspace />} />
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
    </BrowserRouter>
  );
}

export default App;
