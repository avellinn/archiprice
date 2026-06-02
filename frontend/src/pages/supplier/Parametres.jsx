import { useMemo, useState } from 'react';
import { Icon } from '../../components/ui';
import { SupplierLocationModal, SupplierPolicyModal, SupplierShopModal } from '../../components/ui/modals';
import useAuth from '../../context/useAuth';
import { useAdminData } from '../../services/adminData';

const TIMEZONES = [
  '(GMT +01:00) Afrique centrale et de l’Ouest',
  '(GMT +00:00) Greenwich',
  '(GMT +02:00) Afrique australe',
];
const LANGUAGES = ['Français', 'Anglais'];
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

  function closeModal() {
    setActiveModal(null);
  }

  function saveSupplierSettings() {
    updateAdminData((currentData) => ({
      ...currentData,
      supplierSettings: {
        ...(currentData.supplierSettings || {}),
        shopProfile,
        settings,
        savedAt: new Date().toISOString(),
      },
    }));
    closeModal();
  }

  return (
    <div className="supplier-settings-page">
      <header className="supplier-settings-header">
        <h1>
          <Icon name="Dashboard" size="sm" />
          Paramètres
        </h1>
      </header>

      <section className="supplier-settings-card">
        <h2>Général</h2>

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
              <strong>Emplacements</strong>
              <span>{settings.neighborhood || settings.city || settings.address || settings.location}</span>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </button>

          <label className="supplier-settings-row-button supplier-settings-row-button--field">
            <Icon name="History" size="sm" />
            <div>
              <strong>Fuseau horaire</strong>
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
              <strong>Langue</strong>
              <select value={settings.language} onChange={(event) => updateSetting('language', event.target.value)}>
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
              <strong>Politique</strong>
              <span>Confidentialité, conditions, expédition et mentions légales</span>
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
