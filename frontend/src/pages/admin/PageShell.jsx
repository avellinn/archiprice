import Button from '../../components/Button';
import Text from '../../components/Text';
import { Badge, DataTable } from '../../components/ui';

export function PageShell({ eyebrow = 'Backoffice', title, description, actions, children }) {
  return (
    <div className="admin-page">
      <div className="admin-page__heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="admin-page__eyebrow">
            {eyebrow}
          </Text>
          <h1>{title}</h1>
          {description && <Text className="muted">{description}</Text>}
        </div>
        {actions && <div className="admin-page__actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function StatGrid({ items }) {
  return (
    <section className="admin-stat-grid" aria-label="Résumé">
      {items.map((item) => (
        <article key={item.label} className={`admin-stat-card admin-stat-card--${item.tone || 'blue'}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail && <small>{item.detail}</small>}
        </article>
      ))}
    </section>
  );
}

export function Toolbar({ searchPlaceholder = 'Rechercher...', actions }) {
  return (
    <div className="admin-toolbar">
      <label className="admin-toolbar__search">
        <span className="visually-hidden">Recherche</span>
        <input type="search" placeholder={searchPlaceholder} />
      </label>
      <div className="admin-toolbar__actions">{actions}</div>
    </div>
  );
}

export function FilterPanel({ groups }) {
  return (
    <aside className="admin-filter-panel">
      <div className="admin-filter-panel__header">
        <strong>Filtres</strong>
        <button type="button">Réinitialiser</button>
      </div>
      {groups.map((group) => (
        <label key={group.label} className="admin-filter-field">
          <span>{group.label}</span>
          <select defaultValue={group.options[0]}>
            {group.options.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      ))}
      <Button type="button" fullWidth>
        Appliquer
      </Button>
    </aside>
  );
}

export { Badge, DataTable };
