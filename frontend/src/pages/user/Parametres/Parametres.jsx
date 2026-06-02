import './Parametres.css';
import { Icon } from '../../../components/ui';

const USER_SETTINGS = [
  {
    title: 'Profil',
    description: 'Gérez vos informations personnelles et vos préférences de compte.',
    icon: 'Workspaces',
  },
  {
    title: 'Notifications',
    description: 'Choisissez les alertes liées aux projets, estimations et validations.',
    icon: 'Notifications',
  },
  {
    title: 'Préférences budget',
    description: 'Ajustez les paramètres utilisés pour vos simulations et récapitulatifs.',
    icon: 'ReceiptLong',
  },
];

export default function Parametres() {
  return (
    <div className="user-settings-page">
      <header className="user-settings-header">
        <h1>
          <Icon name="Info" size="sm" />
          Paramètres
        </h1>
      </header>

      <section className="user-settings-list">
        {USER_SETTINGS.map((setting) => (
          <article key={setting.title} className="user-settings-card">
            <span className="user-settings-card__icon">
              <Icon name={setting.icon} size="sm" />
            </span>
            <div>
              <h2>{setting.title}</h2>
              <p>{setting.description}</p>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </article>
        ))}
      </section>
    </div>
  );
}
