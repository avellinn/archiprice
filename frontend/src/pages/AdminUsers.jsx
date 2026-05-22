import { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import Text from '../components/Text';
import { getApiErrorMessage } from '../services/api';
import { fetchAdminUsers, updateAdminUserRole } from '../services/admin';

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchAdminUsers()
      .then((list) => {
        if (!cancelled) {
          setUsers(Array.isArray(list) ? list : []);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setUsers([]);
          setError(getApiErrorMessage(err, 'Impossible de charger les utilisateurs'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((user) => user.role === 'admin').length,
    users: users.filter((user) => user.role !== 'admin').length,
  }), [users]);

  async function handleRoleChange(userId, role) {
    setUpdatingUserId(userId);
    setError('');

    try {
      const updatedUser = await updateAdminUserRole(userId, role);
      setUsers((currentUsers) => currentUsers.map((user) => (
        (user.id || user._id) === (updatedUser.id || updatedUser._id) ? updatedUser : user
      )));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de modifier le rôle'));
    } finally {
      setUpdatingUserId('');
    }
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="admin-users-eyebrow">
            Backoffice
          </Text>
          <h1>Utilisateurs</h1>
        </div>
      </div>

      <section className="admin-users-stats" aria-label="Résumé utilisateurs">
        <article>
          <span>Total utilisateurs</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Administrateurs</span>
          <strong>{stats.admins}</strong>
        </article>
        <article>
          <span>Comptes standards</span>
          <strong>{stats.users}</strong>
        </article>
      </section>

      <section className="admin-users-card">
        {isLoading && <Text>Chargement des utilisateurs...</Text>}
        {error && <Text className="error">{error}</Text>}

        {!isLoading && !error && users.length === 0 && (
          <Text className="muted">Aucun utilisateur trouvé.</Text>
        )}

        {!isLoading && users.length > 0 && (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Création</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const userId = user.id || user._id;
                  const nextRole = user.role === 'admin' ? 'user' : 'admin';

                  return (
                    <tr key={userId}>
                      <td>{user.name || 'Utilisateur'}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`admin-users-role admin-users-role--${user.role || 'user'}`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <Button
                          type="button"
                          size="sm"
                          variant={nextRole === 'admin' ? 'outline' : 'secondary'}
                          isLoading={updatingUserId === userId}
                          onClick={() => handleRoleChange(userId, nextRole)}
                        >
                          Passer {nextRole === 'admin' ? 'admin' : 'user'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
