import Header from '../components/Header';
import ProjectList from '../components/ProjectList';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <Header />
      <main className="page page-wide">
        <h1>Dashboard</h1>
        <p>
          Bienvenue, <strong>{user?.name || user?.email}</strong>.
        </p>
        <ProjectList />
      </main>
    </>
  );
}
