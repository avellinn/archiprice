import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import AdminShell from './components/AdminShell';
import AppShell from './components/AppShell';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPlaceholder from './pages/AdminPlaceholder';
import AdminUsers from './pages/AdminUsers';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Catalogue from './pages/Catalogue';
import Invoices from './pages/Invoices';
import Logout from './pages/Logout';
import Workspace from './pages/Workspace';
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
          <Route
            path="/admin/dashboard"
            element={<AdminPlaceholder title="Tableau de bord" description="Vue globale des opérations administratives." />}
          />
          <Route
            path="/admin/catalogue/products"
            element={<AdminPlaceholder title="Produits" description="Liste et gestion des produits du catalogue local." />}
          />
          <Route
            path="/admin/catalogue/filters"
            element={<AdminPlaceholder title="Catégories & filtres" description="Gestion des catégories, pièces, gammes et filtres catalogue." />}
          />
          <Route
            path="/admin/suppliers"
            element={<AdminPlaceholder title="Fournisseurs" description="Liste des fournisseurs et boutiques partenaires." />}
          />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route
            path="/admin/simulations"
            element={<AdminPlaceholder title="Simulations" description="Suivi des simulations et estimations générées." />}
          />
          <Route
            path="/admin/support/tickets"
            element={<AdminPlaceholder title="Tickets" description="Gestion des demandes de support utilisateur." />}
          />
          <Route
            path="/admin/support/feedback"
            element={<AdminPlaceholder title="Feedback" description="Retours utilisateurs et suggestions produit." />}
          />
          <Route
            path="/admin/support/price-reports"
            element={<AdminPlaceholder title="Signalements prix" description="Contrôle des signalements liés aux prix catalogue." />}
          />
          <Route
            path="/admin/settings/simulations"
            element={<AdminPlaceholder title="Configuration simulations" description="Paramètres globaux utilisés pour les simulations." />}
          />
          <Route
            path="/admin/settings/regional-coefficients"
            element={<AdminPlaceholder title="Coefficients régionaux" description="Gestion des coefficients applicables par zone." />}
          />
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
