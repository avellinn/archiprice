import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth } from '../services/api';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="page">
      <h1>ArchiPrice</h1>
      <p>Estimation et chiffrage pour projets d&apos;architecture.</p>

      <section className="card">
        <h2>API</h2>
        {health && (
          <pre>{JSON.stringify(health, null, 2)}</pre>
        )}
        {error && <p className="error">Backend inaccessible : {error}</p>}
      </section>

      <p>
        <Link to="/login">Connexion</Link>
      </p>
    </main>
  );
}
