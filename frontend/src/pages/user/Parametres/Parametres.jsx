import './Parametres.css';
import { useRef, useMemo, useState } from 'react';
import Avatar from '../../../components/Avatar';
import { Alert, Button, Icon } from '../../../components/ui';
import { PasswordSettingsModal } from '../../../components/ui/modals';
import useAuth from '../../../context/useAuth';
import { getApiErrorMessage } from '../../../services/api';
import { getUserTranslations, USER_LANGUAGE_LABELS } from '../../../utils/userLanguage';
import { getAvatarColor, getDisplayName, getRandomAvatarColor, getUserInitials } from '../../../utils/userDisplay';

const USER_PROFILE_KEY = 'archiprice_user_profile_preferences';
const USER_PROFILE_EVENT = 'archiprice:user-profile-change';
const USE_CASES = ['Petite entreprise', 'Usage personnel', 'Agence', 'Architecture', 'Décoration'];
const LANGUAGES = Object.values(USER_LANGUAGE_LABELS);

function readStoredProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(USER_PROFILE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStoredProfile(profile) {
  try {
    window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent(USER_PROFILE_EVENT, { detail: profile }));
  } catch {
    // Le profil reste utilisable en mémoire si le stockage navigateur est indisponible.
  }
}

export default function Parametres() {
  const { user, logout, updateProfile: updateAccountProfile, changePassword } = useAuth();
  const fileInputRef = useRef(null);
  const storedProfile = useMemo(() => readStoredProfile(), []);
  const [profile, setProfile] = useState({
    name: storedProfile.name || getDisplayName(user),
    email: storedProfile.email || user?.email || '',
    useCase: storedProfile.useCase || USE_CASES[0],
    language: storedProfile.language || LANGUAGES[0],
    socialProvider: storedProfile.socialProvider || 'Google',
    isGoogleConnected: storedProfile.isGoogleConnected ?? true,
    photoUrl: storedProfile.photoUrl || '',
  });
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [removedAvatarColor, setRemovedAvatarColor] = useState(() => getRandomAvatarColor(getAvatarColor(user)));
  const [editingField, setEditingField] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [profileAlert, setProfileAlert] = useState(null);
  const profileText = getUserTranslations(profile.language).profile;

  const avatarInitials = getUserInitials({ ...user, name: profile.name }).toUpperCase();
  const removedAvatarInitial = (avatarInitials.slice(0, 1) || getUserInitials(user).slice(0, 1) || 'U').toUpperCase();
  const avatarColor = getAvatarColor(user);

  function updateProfile(field, value) {
    const nextProfile = {
      ...profile,
      [field]: value,
    };
    setProfile(nextProfile);
    writeStoredProfile(nextProfile);
  }

  function applyOfficialProfile(updatedUser) {
    const nextProfile = {
      ...profile,
      name: updatedUser.name || profile.name,
      email: updatedUser.email || profile.email,
    };
    setProfile(nextProfile);
    writeStoredProfile(nextProfile);
  }

  function openEditModal(field, label) {
    setEditingField({ field, label });
    setEditDraft(profile[field] || '');
  }

  function closeEditModal() {
    setEditingField(null);
    setEditDraft('');
  }

  async function saveEditModal(event) {
    event.preventDefault();
    if (!editingField) return;

    const nextValue = editDraft.trim();
    if (!nextValue) return;

    try {
      const updatedUser = await updateAccountProfile({ [editingField.field]: nextValue });
      applyOfficialProfile(updatedUser);
      setProfileAlert({ variant: 'success', message: 'Profil mis à jour.' });
      closeEditModal();
    } catch (apiError) {
      setProfileAlert({
        variant: 'danger',
        message: getApiErrorMessage(apiError, 'Impossible de mettre à jour le profil.'),
      });
    }
  }

  function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateProfile('photoUrl', String(reader.result || ''));
      setPhotoRemoved(false);
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setRemovedAvatarColor((currentColor) => getRandomAvatarColor(currentColor || avatarColor));
    setPhotoRemoved(true);
    updateProfile('photoUrl', '');
  }

  return (
    <main className="user-profile-page">
      <section className="user-profile-panel" aria-label="Votre profil">
        <h1>{profileText.title}</h1>
        {profileAlert && (
          <Alert variant={profileAlert.variant} onClose={() => setProfileAlert(null)}>
            {profileAlert.message}
          </Alert>
        )}

        <div className="user-profile-row user-profile-row--photo">
          <div className="user-profile-row__content">
            <strong>{profileText.photo}</strong>
            {profile.photoUrl && !photoRemoved ? (
              <img className="user-profile-avatar user-profile-avatar--image" src={profile.photoUrl} alt="Profil" />
            ) : (
              <span
                className="user-profile-avatar"
                style={{ '--user-profile-avatar-color': photoRemoved ? removedAvatarColor : avatarColor }}
              >
                {photoRemoved ? removedAvatarInitial : avatarInitials}
              </span>
            )}
          </div>
          <div className="user-profile-actions">
            <button
              type="button"
              className="user-profile-mini-button"
              aria-label={profileText.deletePhoto}
              title={profileText.deletePhoto}
              onClick={removePhoto}
            >
              <Icon name="Delete" size="sm" />
            </button>
            <input
              ref={fileInputRef}
              className="user-profile-file-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              className="user-profile-mini-button"
              aria-label={profileText.editPhoto}
              title={profileText.editPhoto}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="Edit" size="sm" />
            </button>
          </div>
        </div>

        <div className="user-profile-row">
          <div className="user-profile-row__content">
            <strong>{profileText.name}</strong>
            <span>{profile.name}</span>
          </div>
          <button
            type="button"
            className="user-profile-mini-button"
            aria-label={profileText.name}
            title={profileText.name}
            onClick={() => openEditModal('name', profileText.name)}
          >
            <Icon name="Edit" size="sm" />
          </button>
        </div>

        <div className="user-profile-row">
          <div className="user-profile-row__content">
            <strong>{profileText.email}</strong>
            <span>{profile.email}</span>
          </div>
          <button
            type="button"
            className="user-profile-mini-button"
            aria-label={profileText.email}
            title={profileText.email}
            onClick={() => openEditModal('email', profileText.email)}
          >
            <Icon name="Edit" size="sm" />
          </button>
        </div>

        <label className="user-profile-field">
          <strong>{profileText.useCase}</strong>
          <select value={profile.useCase} onChange={(event) => updateProfile('useCase', event.target.value)}>
            {USE_CASES.map((useCase) => (
              <option key={useCase} value={useCase}>{useCase}</option>
            ))}
          </select>
        </label>

        <label className="user-profile-field">
          <strong>{profileText.language}</strong>
          <select value={profile.language} onChange={(event) => updateProfile('language', event.target.value)}>
            {LANGUAGES.map((language) => (
              <option key={language} value={language}>{language}</option>
            ))}
          </select>
        </label>

        <div className="user-profile-row">
          <div className="user-profile-row__content">
            <strong>Mot de passe</strong>
            <span>Modifier le mot de passe de connexion</span>
          </div>
          <button
            type="button"
            className="user-profile-mini-button"
            aria-label="Modifier le mot de passe"
            title="Modifier le mot de passe"
            onClick={() => setIsPasswordModalOpen(true)}
          >
            <Icon name="Edit" size="sm" />
          </button>
        </div>

        <section className="user-profile-social" aria-label="Comptes de réseaux sociaux associés">
          <h2>{profileText.socialTitle}</h2>
          <p>{profileText.socialDescription}</p>
          <article>
            <Avatar  name="Google" size="lg" color="#ffffff" className="" />
            <div>
              <strong>{profile.socialProvider}</strong>
              <span>{profile.isGoogleConnected ? profile.name : profileText.disconnected}</span>
            </div>
            
            <Button type="button" variant="ghost" onClick={logout}>
              {profileText.accountLogout}
            </Button>
          </article>
        </section>
      </section>

      {editingField && (
        <div className="user-profile-modal-backdrop" role="presentation">
          <form className="user-profile-modal" role="dialog" aria-modal="true" aria-labelledby="user-profile-modal-title" onSubmit={saveEditModal}>
            <header className="user-profile-modal__header">
              <div>
                <span>Profil</span>
                <h2 id="user-profile-modal-title">Modifier {editingField.label.toLowerCase()}</h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={closeEditModal}>
                <Icon name="Close" size="sm" />
              </button>
            </header>

            <div className="user-profile-modal__body">
              <label>
                <span>{editingField.label}</span>
                <input
                  type={editingField.field === 'email' ? 'email' : 'text'}
                  value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)}
                  required
                  autoFocus
                />
              </label>
            </div>

            <footer className="user-profile-modal__footer">
              <button type="button" onClick={closeEditModal}>Annuler</button>
              <button type="submit">Sauvegarder</button>
            </footer>
          </form>
        </div>
      )}

      {isPasswordModalOpen && (
        <PasswordSettingsModal
          onClose={() => setIsPasswordModalOpen(false)}
          onSubmit={async (payload) => {
            await changePassword(payload);
            setProfileAlert({ variant: 'success', message: 'Mot de passe mis à jour.' });
          }}
        />
      )}
    </main>
  );
}
