import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import AdminShell from './components/AdminShell';
import AppShell from './components/AppShell';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
import CategoriesFiltres from './pages/admin/CategoriesFiltres';
import BackofficeDashboard from './pages/admin/Dashboard';
import Fournisseurs from './pages/admin/Fournisseurs';
import Paramètres from './pages/admin/Paramètres';
import Produits from './pages/admin/Produits';
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
        <Route
          element={
            <AdminRoute>
              <AdminShell />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<BackofficeDashboard />} />
          <Route path="/admin/catalogue/products" element={<Produits />} />
          <Route path="/admin/catalogue/filters" element={<CategoriesFiltres />} />
          <Route path="/admin/suppliers" element={<Fournisseurs />} />
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
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
