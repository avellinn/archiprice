import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
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
