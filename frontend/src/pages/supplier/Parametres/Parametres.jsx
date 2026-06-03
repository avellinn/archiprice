import './Parametres.css';
import { useMemo, useState } from 'react';
import { Icon } from '../../../components/ui';
import { SupplierLocationModal, SupplierPolicyModal, SupplierShopModal } from '../../../components/ui/modals';
import useAuth from '../../../context/useAuth';
import { useAdminData } from '../../../services/adminData';
import { notifySupplierWorkspaceChange, updateSupplierProfile } from '../../../services/supplier';
import { getSupplierTranslations, SUPPLIER_LANGUAGE_LABELS } from '../../../utils/supplierLanguage';

const TIMEZONES = [
  '(GMT +01:00) Afrique centrale et de l’Ouest',
  '(GMT +00:00) Greenwich',
  '(GMT +02:00) Afrique australe',
];
const LANGUAGES = Object.values(SUPPLIER_LANGUAGE_LABELS);
const FALLBACK_CITY_OPTIONS = ['Cotonou', 'Abomey - calavi', 'Porto-novo'];
const FALLBACK_NEIGHBORHOOD_OPTIONS = [
  'Fidjrossè',
  'Akpakpa',
  'Ganhi',
  'Zongo',
  'Godomey',
  'akassato',
  'Glo-Djigbé',
  'Zinvié',
  'Tokpota',
  'Ouando',
  'Dowa',
  'Hounli',
];

function getUniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeSupplierForWorkspace(supplier) {
  return {
    id: supplier.id,
    name: supplier.companyName || supplier.name,
    contact: supplier.contact || supplier.email || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    region: supplier.region || '',
    status: supplier.status || 'Actif',
    products: supplier.products || 0,
    categories: supplier.categories || [],
  };
}

export default function Parametres() {
  const { user } = useAuth();
  const [adminData, updateAdminData] = useAdminData();
  const savedSupplierSettings = adminData.supplierSettings || {};
  const [shopProfile, setShopProfile] = useState({
    name: savedSupplierSettings.shopProfile?.name || user?.shopName || user?.companyName || user?.name || 'arcpri',
    email: savedSupplierSettings.shopProfile?.email || user?.email || 'hospiceavell@gmail.com',
    phone: savedSupplierSettings.shopProfile?.phone || user?.phone || 'Aucun numéro de téléphone',
  });
  const [settings, setSettings] = useState({
    location: savedSupplierSettings.settings?.location || 'Bénin',
    companyName: savedSupplierSettings.settings?.companyName || '',
    address: savedSupplierSettings.settings?.address || '',
    neighborhood: savedSupplierSettings.settings?.neighborhood || '',
    city: savedSupplierSettings.settings?.city || FALLBACK_CITY_OPTIONS[0],
    timezone: savedSupplierSettings.settings?.timezone || '(GMT +01:00) Afrique centrale et de l’Ouest',
    language: savedSupplierSettings.settings?.language || 'Français',
  });
  const [activeModal, setActiveModal] = useState(null);
  const supplierText = getSupplierTranslations(settings.language);

  const cityOptions = useMemo(() => getUniqueValues([
    ...FALLBACK_CITY_OPTIONS,
    ...(adminData.regionalCoefficients || []).map((item) => item.city),
    ...(adminData.products || []).map((product) => product.city),
  ]), [adminData.products, adminData.regionalCoefficients]);

  const neighborhoodOptions = useMemo(() => getUniqueValues([
    ...FALLBACK_NEIGHBORHOOD_OPTIONS,
    ...(adminData.products || []).map((product) => product.neighborhood),
  ]), [adminData.products]);

  function updateShopProfile(field, value) {
    setShopProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));
  }

  function updateSetting(field, value) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
  }

  function persistSupplierSettings(nextShopProfile = shopProfile, nextSettings = settings) {
    updateAdminData((currentData) => ({
      ...currentData,
      supplierSettings: {
        ...(currentData.supplierSettings || {}),
        shopProfile: nextShopProfile,
        settings: nextSettings,
        savedAt: new Date().toISOString(),
      },
    }));

    updateSupplierProfile({
      name: nextShopProfile.name,
      companyName: nextShopProfile.name,
      email: nextShopProfile.email,
      phone: nextShopProfile.phone === 'Aucun numéro de téléphone' ? '' : nextShopProfile.phone,
      contact: nextShopProfile.email,
      region: nextSettings.city || nextSettings.location,
    })
      .then((supplier) => {
        if (!supplier) return;

        updateAdminData((currentData) => {
          const normalizedSupplier = normalizeSupplierForWorkspace(supplier);
          const suppliers = currentData.suppliers || [];
          const supplierExists = suppliers.some((item) => (
            item.id === normalizedSupplier.id
            || (item.email && item.email === normalizedSupplier.email)
            || (item.contact && item.contact === normalizedSupplier.contact)
          ));

          return {
            ...currentData,
            suppliers: supplierExists
              ? suppliers.map((item) => (
                item.id === normalizedSupplier.id
                || (item.email && item.email === normalizedSupplier.email)
                || (item.contact && item.contact === normalizedSupplier.contact)
                  ? { ...item, ...normalizedSupplier }
                  : item
              ))
              : [normalizedSupplier, ...suppliers],
          };
        });
      })
      .catch(() => {
        // Le profil local reste à jour; la prochaine sauvegarde retentera la synchronisation Mongo.
      });

    notifySupplierWorkspaceChange({ action: 'update-supplier-settings' });
  }

  function updateLanguage(value) {
    const nextSettings = {
      ...settings,
      language: value,
    };

    setSettings(nextSettings);
    persistSupplierSettings(shopProfile, nextSettings);
  }

  function closeModal() {
    setActiveModal(null);
  }

  function saveSupplierSettings() {
    persistSupplierSettings(shopProfile, settings);
    closeModal();
  }

  return (
    <div className="supplier-settings-page">
      <header className="supplier-settings-header">
        <h1>
          <Icon name="Dashboard" size="sm" />
          {supplierText.settings.title}
        </h1>
      </header>

      <section className="supplier-settings-card">
        <h2>{supplierText.settings.section}</h2>

        <div className="supplier-settings-list supplier-settings-list--clickable">
          <button type="button" className="supplier-settings-row-button" onClick={() => setActiveModal('shop')}>
            <Icon name="Workspaces" size="sm" />
            <div>
              <strong>{shopProfile.name}</strong>
              <span>{shopProfile.email} · {shopProfile.phone}</span>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </button>

          <button type="button" className="supplier-settings-row-button" onClick={() => setActiveModal('location')}>
            <Icon name="Explore" size="sm" />
            <div>
              <strong>{supplierText.settings.location}</strong>
              <span>{settings.neighborhood || settings.city || settings.address || settings.location}</span>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </button>

          <label className="supplier-settings-row-button supplier-settings-row-button--field">
            <Icon name="History" size="sm" />
            <div>
              <strong>{supplierText.settings.timezone}</strong>
              <select value={settings.timezone} onChange={(event) => updateSetting('timezone', event.target.value)}>
                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>{timezone}</option>
                ))}
              </select>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </label>

          <label className="supplier-settings-row-button supplier-settings-row-button--field">
            <Icon name="Chat" size="sm" />
            <div>
              <strong>{supplierText.settings.language}</strong>
              <select value={settings.language} onChange={(event) => updateLanguage(event.target.value)}>
                {LANGUAGES.map((language) => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </label>

          <button type="button" className="supplier-settings-row-button" onClick={() => setActiveModal('policy')}>
            <Icon name="ReceiptLong" size="sm" />
            <div>
              <strong>{supplierText.settings.policy}</strong>
              <span>{supplierText.settings.policyDescription}</span>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </button>
        </div>
      </section>

      {activeModal === 'policy' && (
        <SupplierPolicyModal onClose={closeModal} onSave={saveSupplierSettings} />
      )}

      {activeModal === 'shop' && (
        <SupplierShopModal
          shopProfile={shopProfile}
          onChange={updateShopProfile}
          onClose={closeModal}
          onSave={saveSupplierSettings}
        />
      )}

      {activeModal === 'location' && (
        <SupplierLocationModal
          settings={settings}
          cityOptions={cityOptions}
          neighborhoodOptions={neighborhoodOptions}
          onChange={updateSetting}
          onClose={closeModal}
          onSave={saveSupplierSettings}
        />
      )}
    </div>
  );
}
