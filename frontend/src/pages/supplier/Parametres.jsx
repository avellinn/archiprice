import { Icon } from '../../components/ui';

const sections = [
  {
    title: 'Général',
    rows: [
      { icon: 'Explore', title: 'Emplacements', action: 'Gérer' },
      { icon: 'Chat', title: 'Langue', chevron: true },
      { icon: 'ReceiptLong', title: 'Abonnement POS Pro', action: 'Gérer' },
    ],
  },
  {
    title: 'Personnalisation',
    subtitle: "Gérez votre POS en boutique depuis l'éditeur POS.",
    rows: [
      {
        icon: 'Dashboard',
        title: 'Appli POS',
        detail: 'Grille intelligente, écran de verrouillage, paiement et applis',
        chevron: true,
      },
      {
        icon: 'Workspaces',
        title: 'Affichages client',
        detail: 'Écran de veille, reçus numériques et écran de remerciement',
        chevron: true,
        muted: true,
      },
      {
        icon: 'ReceiptLong',
        title: 'Reçus imprimés',
        detail: 'Mise en page et contenu des reçus',
        chevron: true,
      },
    ],
  },
  {
    title: 'Caisse',
    rows: [
      { icon: 'Workspaces', title: 'Gestion des espèces', chevron: true },
    ],
  },
];

export default function Parametres() {
  return (
    <div className="supplier-settings-page">
      <header className="supplier-settings-header">
        <h1>
          <Icon name="Dashboard" size="sm" />
          Paramètres
        </h1>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="supplier-settings-card">
          <h2>{section.title}</h2>
          {section.subtitle && <p>{section.subtitle}</p>}
          <div className="supplier-settings-list">
            {section.rows.map((row) => (
              <article key={row.title} className={row.muted ? 'is-muted' : ''}>
                <Icon name={row.icon} size="sm" />
                <div>
                  <strong>{row.title}</strong>
                  {row.detail && <span>{row.detail}</span>}
                </div>
                {row.action ? (
                  <button type="button" className="supplier-settings-manage">{row.action}</button>
                ) : (
                  row.chevron && <Icon name="ChevronRight" size="sm" />
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="supplier-settings-card supplier-settings-returns">
        <h2>Retours</h2>
        <div className="supplier-settings-return-box">
          <div className="supplier-settings-return-header">
            <strong>Politique</strong>
            <span>Désactivé</span>
            <button type="button" className="supplier-settings-manage">Gérer</button>
          </div>
          <label>
            <span>Autoriser le remboursement des commandes en crédit en magasin</span>
            <input type="checkbox" />
          </label>
          <label>
            <span>Exiger des motifs de retour</span>
            <input type="checkbox" />
          </label>
        </div>
      </section>
    </div>
  );
}
