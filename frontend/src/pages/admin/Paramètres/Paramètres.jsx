import './Paramètres.css';
import { useState } from 'react';
import { Alert, Icon } from '../../../components/ui';
import { PasswordSettingsModal } from '../../../components/ui/modals';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { getAdminTranslations } from '../../../utils/adminLanguage';
import { AdminLocationModal, AdminPolicyModal, AdminProfileModal } from './adminparModal';

const TIMEZONES = [
  '(GMT +01:00) Afrique centrale et de l’Ouest',
  '(GMT +00:00) Greenwich',
  '(GMT +02:00) Afrique australe',
];
const LANGUAGES = ['Français', 'Anglais'];
const DEFAULT_ADMIN_POLICIES = [
  {
    id: 'admin-policy-cgu',
    icon: 'ReceiptLong',
    title: "CONDITIONS GÉNÉRALES D'UTILISATION (CGU)",
    summary: 'Cadre d’utilisation de la plateforme ArchiPrice par les comptes user, supplier et admin.',
    content: 'Les utilisateurs accèdent aux services ArchiPrice selon leur rôle. Les actions sensibles sont journalisées et les données métier restent protégées.',
  },
  {
    id: 'admin-policy-privacy',
    icon: 'Info',
    title: 'POLITIQUE DE CONFIDENTIALITÉ',
    summary: 'Traitement et protection des données des comptes, projets, simulations, fournisseurs et catalogues.',
    content: 'Les données sont exploitées pour fournir les fonctionnalités de simulation, de validation fournisseur, de catalogue et de support.',
  },
  {
    id: 'admin-policy-suppliers',
    icon: 'Workspaces',
    title: 'CONDITIONS FOURNISSEURS',
    summary: 'Règles de validation, publication, refus et retrait des articles proposés par les fournisseurs.',
    content: 'Les fournisseurs soumettent leurs articles à validation. L’admin peut approuver, refuser ou masquer les contenus non conformes.',
  },
  {
    id: 'admin-policy-legal',
    icon: 'Folder',
    title: 'MENTIONS LÉGALES',
    summary: 'Informations légales et responsabilité opérationnelle de la plateforme ArchiPrice.',
    content: 'ArchiPrice conserve les informations nécessaires à la traçabilité des actions, aux audits et à la continuité des services.',
  },
];

function getUniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

export default function Paramètres() {
  const { user, updateProfile: updateAccountProfile, changePassword } = useAuth();
  const [adminData, updateAdminData] = useAdminData();
  const savedAdminSettings = adminData.adminSettings || {};
  const adminText = getAdminTranslations(adminData);
  const [adminProfile, setAdminProfile] = useState({
    name: savedAdminSettings.profile?.name || user?.name || '',
    email: savedAdminSettings.profile?.email || user?.email || '',
    phone: savedAdminSettings.profile?.phone || user?.phone || '',
  });
  const [settings, setSettings] = useState({
    location: savedAdminSettings.settings?.location || 'Bénin',
    companyName: savedAdminSettings.settings?.companyName || '',
    address: savedAdminSettings.settings?.address || '',
    neighborhood: savedAdminSettings.settings?.neighborhood || '',
    city: savedAdminSettings.settings?.city || '',
    timezone: savedAdminSettings.settings?.timezone || TIMEZONES[0],
    language: savedAdminSettings.settings?.language || LANGUAGES[0],
  });
  const [policies, setPolicies] = useState(
    Array.isArray(savedAdminSettings.policies) && savedAdminSettings.policies.length
      ? savedAdminSettings.policies
      : DEFAULT_ADMIN_POLICIES,
  );
  const [activeModal, setActiveModal] = useState(null);
  const [settingsAlert, setSettingsAlert] = useState(null);

  const cityOptions = getUniqueValues([
    ...(adminData.taxonomies?.cities || []).map((item) => item.name),
    ...(adminData.regionalCoefficients || []).map((item) => item.city),
    ...(adminData.products || []).map((product) => product.city),
  ]);
  const neighborhoodOptions = getUniqueValues([
    ...(adminData.taxonomies?.neighborhoods || []).map((item) => item.name),
    ...(adminData.products || []).map((product) => product.neighborhood),
  ]);

  function updateAdminProfile(field, value) {
    setAdminProfile((currentProfile) => ({
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

  function persistAdminSettings(nextProfile = adminProfile, nextSettings = settings, nextPolicies = policies) {
    updateAdminData((currentData) => ({
      ...currentData,
      adminSettings: {
        ...(currentData.adminSettings || {}),
        profile: nextProfile,
        settings: nextSettings,
        policies: nextPolicies,
        savedAt: new Date().toISOString(),
      },
    }));

    updateAccountProfile({
      name: nextProfile.name,
      email: nextProfile.email,
      phone: nextProfile.phone,
    }).catch((apiError) => {
      setSettingsAlert({
        variant: 'danger',
        message: getApiErrorMessage(apiError, 'Les paramètres admin sont enregistrés localement, mais le profil utilisateur n’a pas pu être synchronisé.'),
      });
    });
  }

  function updateLanguage(value) {
    const nextSettings = {
      ...settings,
      language: value,
    };

    setSettings(nextSettings);
    persistAdminSettings(adminProfile, nextSettings, policies);
  }

  function closeModal() {
    setActiveModal(null);
  }

  function saveAdminSettings() {
    persistAdminSettings(adminProfile, settings);
    closeModal();
  }

  return (
    <div className="admin-settings-page">
      <header className="admin-settings-header">
        <h1>
          <Icon name="Dashboard" size="sm" />
          {adminText.settings.title}
        </h1>
      </header>

      <section className="admin-settings-card">
        <h2>{adminText.settings.section}</h2>
        {settingsAlert && (
          <Alert variant={settingsAlert.variant} onClose={() => setSettingsAlert(null)}>
            {settingsAlert.message}
          </Alert>
        )}

        <div className="admin-settings-list admin-settings-list--clickable">
          <button type="button" className="admin-settings-row-button" onClick={() => setActiveModal('profile')}>
            <Icon name="Workspaces" size="sm" />
            <div>
              <strong>{adminProfile.name}</strong>
              <span>{adminProfile.email} · {adminProfile.phone}</span>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </button>

          <button type="button" className="admin-settings-row-button" onClick={() => setActiveModal('location')}>
            <Icon name="Explore" size="sm" />
            <div>
              <strong>{adminText.settings.locations}</strong>
              <span>{settings.neighborhood || settings.city || settings.address || settings.location}</span>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </button>

          <label className="admin-settings-row-button admin-settings-row-button--field">
            <Icon name="History" size="sm" />
            <div>
              <strong>{adminText.settings.timezone}</strong>
              <select value={settings.timezone} onChange={(event) => updateSetting('timezone', event.target.value)}>
                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>{timezone}</option>
                ))}
              </select>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </label>

          <label className="admin-settings-row-button admin-settings-row-button--field">
            <Icon name="Chat" size="sm" />
            <div>
              <strong>{adminText.settings.language}</strong>
              <select value={settings.language} onChange={(event) => updateLanguage(event.target.value)}>
                {LANGUAGES.map((language) => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </label>

          <button type="button" className="admin-settings-row-button" onClick={() => setActiveModal('policy')}>
            <Icon name="ReceiptLong" size="sm" />
            <div>
              <strong>{adminText.settings.policy}</strong>
              <span>{adminText.settings.policyDescription}</span>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </button>

          <button type="button" className="admin-settings-row-button" onClick={() => setActiveModal('password')}>
            <Icon name="Visibility" size="sm" />
            <div>
              <strong>Mot de passe</strong>
              <span>Modifier le mot de passe de connexion</span>
            </div>
            <Icon name="ChevronRight" size="sm" />
          </button>
        </div>
      </section>

      {activeModal === 'policy' && (
        <AdminPolicyModal
          policies={policies}
          onPoliciesChange={setPolicies}
          onClose={closeModal}
          onSave={saveAdminSettings}
        />
      )}

      {activeModal === 'profile' && (
        <AdminProfileModal
          adminProfile={adminProfile}
          onChange={updateAdminProfile}
          onClose={closeModal}
          onSave={saveAdminSettings}
        />
      )}

      {activeModal === 'location' && (
        <AdminLocationModal
          settings={settings}
          cityOptions={cityOptions}
          neighborhoodOptions={neighborhoodOptions}
          onChange={updateSetting}
          onClose={closeModal}
          onSave={saveAdminSettings}
        />
      )}

      {activeModal === 'password' && (
        <PasswordSettingsModal
          onClose={closeModal}
          onSubmit={async (payload) => {
            await changePassword(payload);
            setSettingsAlert({ variant: 'success', message: 'Mot de passe mis à jour.' });
          }}
        />
      )}
    </div>
  );
}
