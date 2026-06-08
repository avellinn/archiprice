import './CategoriesFiltres.css';
import { useMemo, useState } from 'react';
import { Button, Icon, Table } from '../../../components/ui';
import { createAdminId, useAdminData } from '../../../services/adminData';
import TaxonomyModal from './taxonomyModal';

const tabs = [
  { key: 'categories', productField: 'category', label: 'Catégories', addLabel: 'Ajouter une catégorie', placeholder: 'Ex: Mobilier' },
  { key: 'rooms', productField: 'room', label: 'Pièces', addLabel: 'Ajouter une pièce', placeholder: 'Ex: Salon' },
  { key: 'ranges', productField: 'range', label: 'Gammes', addLabel: 'Ajouter une gamme', placeholder: 'Ex: Haut de gamme' },
  { key: 'availability', productField: 'availability', label: 'Disponibilités', addLabel: 'Ajouter une disponibilité', placeholder: 'Ex: Disponible' },
  { key: 'cities', productField: 'city', label: 'Villes', addLabel: 'Ajouter une ville', placeholder: 'Ex: Cotonou' },
  { key: 'neighborhoods', productField: 'neighborhood', label: 'Quartiers', addLabel: 'Ajouter un quartier', placeholder: 'Ex: Fidjrossè' },
];

function getUsageCount(products, field, value) {
  return products.filter((product) => product[field] === value).length;
}

export default function CategoriesFiltres() {
  const [adminData, setAdminData] = useAdminData();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [draftName, setDraftName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const items = useMemo(() => (
    (adminData.taxonomies[activeTab.key] || []).map((item) => ({
      ...item,
      count: getUsageCount(adminData.products, activeTab.productField, item.name),
    }))
  ), [activeTab.key, activeTab.productField, adminData.products, adminData.taxonomies]);
  const selectedItem = useMemo(() => (
    items.find((item) => item.id === selectedItemId) || null
  ), [items, selectedItemId]);

  function resetDraft() {
    setDraftName('');
    setSelectedItemId('');
  }

  function saveTaxonomyItem() {
    const name = draftName.trim();
    if (!name) return false;

    setAdminData((currentData) => {
      const currentItems = currentData.taxonomies[activeTab.key] || [];
      const alreadyExists = currentItems.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== selectedItem?.id);

      if (alreadyExists) return currentData;

      if (selectedItem) {
        return {
          ...currentData,
          products: (currentData.products || []).map((product) => (
            product[activeTab.productField] === selectedItem.name
              ? { ...product, [activeTab.productField]: name }
              : product
          )),
          taxonomies: {
            ...currentData.taxonomies,
            [activeTab.key]: currentItems.map((item) => (
              item.id === selectedItem.id ? { ...item, name } : item
            )),
          },
        };
      }

      return {
        ...currentData,
        taxonomies: {
          ...currentData.taxonomies,
          [activeTab.key]: [
            { id: createAdminId(activeTab.key), name, count: 0 },
            ...currentItems,
          ],
        },
      };
    });
    resetDraft();
    return true;
  }

  function openCreateModal() {
    resetDraft();
    setIsModalOpen(true);
  }

  function openEditModal(item) {
    setSelectedItemId(item.id);
    setDraftName(item.name);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    resetDraft();
  }

  function submitModal(event) {
    event.preventDefault();
    if (saveTaxonomyItem()) {
      setIsModalOpen(false);
    }
  }

  function deleteTaxonomyItem(itemId) {
    setAdminData((currentData) => {
      const currentItems = currentData.taxonomies[activeTab.key] || [];
      const deletedItem = currentItems.find((item) => item.id === itemId);
      const nextItems = currentItems.filter((item) => item.id !== itemId);
      const fallbackName = nextItems[0]?.name || '';

      return {
        ...currentData,
        products: (currentData.products || []).map((product) => (
          deletedItem && product[activeTab.productField] === deletedItem.name
            ? { ...product, [activeTab.productField]: fallbackName }
            : product
        )),
        taxonomies: {
          ...currentData.taxonomies,
          [activeTab.key]: nextItems,
        },
      };
    });

    if (selectedItemId === itemId) resetDraft();
  }

  function renderTaxonomyActions(item) {
    return (
      <span className="admin-taxonomy-row-actions">
        <button
          type="button"
          aria-label={`Modifier ${item.name}`}
          onClick={(event) => {
            event.stopPropagation();
            openEditModal(item);
          }}
        >
          <Icon name="Edit" size="sm" />
        </button>
        <button
          type="button"
          aria-label={`Supprimer ${item.name}`}
          className="is-danger"
          onClick={(event) => {
            event.stopPropagation();
            deleteTaxonomyItem(item.id);
          }}
        >
          <Icon name="Delete" size="sm" />
        </button>
      </span>
    );
  }

  const taxonomyColumns = [
    {
      key: 'name',
      label: 'Nom',
      render: (name, item) => (
        <div className="admin-taxonomy-row">
          <span className="admin-taxonomy-row__name">{name}</span>
          {renderTaxonomyActions(item)}
        </div>
      ),
    },
  ];

  return (
    <div className="admin-taxonomy-page">
      <nav className="admin-products-breadcrumb" aria-label="Fil d'ariane">
        <span>Catalogue</span>
        <Icon name="ChevronRight" size="sm" />
        
      </nav>

      <section className="admin-taxonomy-main">
        <div className="admin-taxonomy-table-card">
          <div className="admin-taxonomy-toolbar">
            <div className="admin-taxonomy-tabs" aria-label="Types de filtres catalogue">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeTab.key === tab.key ? 'is-active' : ''}
                  aria-pressed={activeTab.key === tab.key}
                  onClick={() => {
                    setActiveTab(tab);
                    resetDraft();
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="admin-taxonomy-table-actions">
              
              <Button type="button" size="sm" icon={<Icon name="Add" size="sm" />} onClick={openCreateModal}>
                {activeTab.addLabel}
              </Button>
            </div>
          </div>

          <Table
            className="admin-taxonomy-list"
            columns={taxonomyColumns}
            data={items}
            getRowId={(item, index) => item.id || `${item.name}-${index}`}
            onRowClick={openEditModal}
            emptyLabel="Contenu vide"
          />
        </div>
      </section>

      {isModalOpen && (
        <TaxonomyModal
          activeTab={activeTab}
          item={selectedItem}
          value={draftName}
          onChange={setDraftName}
          onClose={closeModal}
          onSubmit={submitModal}
        />
      )}
    </div>
  );
}
