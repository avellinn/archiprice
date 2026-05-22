import { useMemo, useState } from 'react';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { createAdminId, useAdminData } from '../../services/adminData';

const tabs = [
  { key: 'categories', label: 'Catégories', addLabel: 'Ajouter une catégorie', placeholder: 'Ex: Mobilier' },
  { key: 'rooms', label: 'Pièces', addLabel: 'Ajouter une pièce', placeholder: 'Ex: Salon' },
  { key: 'ranges', label: 'Gammes', addLabel: 'Ajouter une gamme', placeholder: 'Ex: Premium' },
];

export default function CategoriesFiltres() {
  const [adminData, setAdminData] = useAdminData();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [draftName, setDraftName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  const items = useMemo(() => (
    adminData.taxonomies[activeTab.key] || []
  ), [activeTab.key, adminData.taxonomies]);
  const selectedItem = useMemo(() => (
    items.find((item) => item.id === selectedItemId) || items[0]
  ), [items, selectedItemId]);

  function saveTaxonomyItem() {
    const name = draftName.trim() || selectedItem?.name || activeTab.placeholder.replace('Ex: ', '');

    setAdminData((currentData) => ({
      ...currentData,
      taxonomies: {
        ...currentData.taxonomies,
        [activeTab.key]: [
          { id: createAdminId(activeTab.key), name, count: 0 },
          ...(currentData.taxonomies[activeTab.key] || []),
        ],
      },
    }));
    setDraftName('');
  }

  function renameTaxonomyItem(item) {
    setSelectedItemId(item.id);
    setDraftName(item.name);
  }

  function deleteTaxonomyItem(itemId) {
    setAdminData((currentData) => ({
      ...currentData,
      taxonomies: {
        ...currentData.taxonomies,
        [activeTab.key]: (currentData.taxonomies[activeTab.key] || []).filter((item) => item.id !== itemId),
      },
    }));
  }

  function applyRename() {
    if (!selectedItem || !draftName.trim()) {
      saveTaxonomyItem();
      return;
    }

    setAdminData((currentData) => ({
      ...currentData,
      taxonomies: {
        ...currentData.taxonomies,
        [activeTab.key]: (currentData.taxonomies[activeTab.key] || []).map((item) => (
          item.id === selectedItem.id ? { ...item, name: draftName.trim() } : item
        )),
      },
    }));
    setDraftName('');
  }

  return (
    <div className="admin-taxonomy-page">
      <nav className="admin-products-breadcrumb" aria-label="Fil d'ariane">
        <span>Catalogue</span>
        <Icon name="ChevronRight" size="sm" />
        <strong>Catégories & filtres</strong>
      </nav>

      <h1>Catégories & filtres</h1>

      <div className="admin-taxonomy-layout">
        <section className="admin-taxonomy-main">
          <div className="admin-taxonomy-tabs" role="tablist" aria-label="Types de filtres catalogue">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab.key === tab.key ? 'is-active' : ''}
                role="tab"
                aria-selected={activeTab.key === tab.key}
                onClick={() => {
                  setActiveTab(tab);
                  setDraftName('');
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="admin-taxonomy-table-card">
            <div className="admin-taxonomy-table-actions">
              <Button type="button" variant="outline" icon={<Icon name="Add" size="sm" />} onClick={saveTaxonomyItem}>
                {activeTab.addLabel}
              </Button>
            </div>

            <table className="admin-taxonomy-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Nombre de produits</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.count}</td>
                    <td>
                      <span className="admin-products-actions">
                        <button type="button" aria-label={`Modifier ${item.name}`} onClick={() => renameTaxonomyItem(item)}>
                          <Icon name="Edit" size="sm" />
                        </button>
                        <button type="button" aria-label={`Supprimer ${item.name}`} className="is-danger" onClick={() => deleteTaxonomyItem(item.id)}>
                          <Icon name="Delete" size="sm" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="admin-taxonomy-side">
          <section className="admin-taxonomy-form-card">
            <div className="admin-taxonomy-card-header">
              <h2>{selectedItem ? `Modifier ${activeTab.label.toLowerCase()}` : activeTab.addLabel}</h2>
              <button type="button" aria-label="Fermer le panneau" onClick={() => setDraftName('')}>
                <Icon name="Close" />
              </button>
            </div>

            <label className="admin-taxonomy-field">
              <span>Nom <b>*</b></span>
              <input
                type="text"
                placeholder={activeTab.placeholder}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
              />
            </label>

            <footer className="admin-taxonomy-form-actions">
              <Button type="button" variant="outline" onClick={() => setDraftName('')}>
                Annuler
              </Button>
              <Button type="button" onClick={applyRename}>
                Enregistrer
              </Button>
            </footer>
          </section>

          <section className="admin-taxonomy-danger-card">
            <div className="admin-taxonomy-card-header">
              <h2>
                <Icon name="Info" size="sm" />
                Suppression de {activeTab.label.toLowerCase()}
              </h2>
              <button type="button" aria-label="Fermer l'alerte">
                <Icon name="Close" />
              </button>
            </div>

            <p>Cette entrée est utilisée par <strong>{selectedItem?.count || 0} produit(s)</strong>.</p>
            <p>Que souhaitez-vous faire ?</p>

            <div className="admin-taxonomy-danger-actions">
              <Button type="button" variant="outline" fullWidth>
                Annuler la suppression
              </Button>
              <Button type="button" variant="danger" fullWidth disabled={!selectedItem} onClick={() => deleteTaxonomyItem(selectedItem.id)}>
                Réassigner et supprimer
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
