import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import useAuth from '../../context/useAuth';
import './Logout.css';

export default function Logout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleConfirmLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleCancel() {
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="logout-page">
      <section className="logout-card" aria-labelledby="logout-title">
        <div className="logout-card__icon" aria-hidden="true">
          <Icon name="Logout" />
        </div>

        <h1 id="logout-title">Déconnexion</h1>
        <p className="logout-card__question">Êtes-vous sûr de vouloir vous déconnecter ?</p>
        <p className="logout-card__hint">
          Vous devrez vous reconnecter pour accéder à nouveau
          <br />
          à votre compte.
        </p>

        <div className="logout-card__divider" />

        <div className="logout-card__actions">
          <Button
            type="button"
            variant="ghost"
            className="logout-card__cancel"
            onClick={handleCancel}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            className="logout-card__confirm"
            onClick={handleConfirmLogout}
          >
            Se déconnecter
          </Button>
        </div>
      </section>
    </div>
  );
}
