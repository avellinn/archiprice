import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <Header />
      <main className="page">
        <h1>Dashboard</h1>
        <p>
          Bienvenue, <strong>{user?.name || user?.email}</strong>.
        </p>
        <p className="muted">
          Espace réservé aux utilisateurs connectés — projets et catalogue à venir.
        </p>
      </main>
    </>
  );
}
