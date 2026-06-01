import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import AdminShell from './components/AdminShell';
import AppShell from './components/AppShell';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
import SupplierRoute from './components/SupplierRoute';
import SupplierShell from './components/SupplierShell';
import CategoriesFiltres from './pages/admin/CategoriesFiltres';
import BackofficeDashboard from './pages/admin/Dashboard';
import Fournisseurs from './pages/admin/Fournisseurs';
import NouvellesDemandes from './pages/admin/NouvellesDemandes';
import Paramètres from './pages/admin/Paramètres';
import Articles from './pages/admin/Articles';
import Simulations from './pages/admin/Simulations';
import Support from './pages/admin/Support';
import Utilisateurs from './pages/admin/Utilisateurs';
import Home from './pages/user/Home';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import Dashboard from './pages/user/Dashboard';
import Catalogue from './pages/user/Catalogue';
import Invoices from './pages/user/Invoices';
import Logout from './pages/user/Logout';
import Workspace from './pages/user/Workspace';
import SupplierAnalysedon from './pages/supplier/Analysedon';
import SupplierCatalogue from './pages/supplier/Catalogue';
import SupplierClients from './pages/supplier/Clients';
import SupplierFichiers from './pages/supplier/Fichiers';
import SupplierMaBoutique from './pages/supplier/MaBoutique';
import SupplierParametres from './pages/supplier/Parametres';
import SupplierPending from './pages/supplier/Pending';
import SupplierAjouterProduit from './pages/supplier/AjouterProduit';
import SupplierProduits from './pages/supplier/Produits';
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
        <Route path="/supplier/pending" element={<SupplierPending />} />
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
          <Route path="/admin/catalogue/filters" element={<CategoriesFiltres />} />
          <Route path="/admin/suppliers" element={<Fournisseurs />} />
          <Route path="/admin/suppliers/requests" element={<NouvellesDemandes />} />
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
          <Route path="/supplier/dashboard" element={<SupplierAnalysedon />} />
          <Route path="/supplier/shop" element={<SupplierMaBoutique />} />
          <Route path="/supplier/products" element={<SupplierProduits />} />
          <Route path="/supplier/products/new" element={<SupplierAjouterProduit />} />
          <Route path="/supplier/catalogue" element={<SupplierCatalogue />} />
          <Route path="/supplier/clients" element={<SupplierClients />} />
          <Route path="/supplier/content/files" element={<SupplierFichiers />} />
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
          <Route path="/factures" element={<Invoices />} />
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
