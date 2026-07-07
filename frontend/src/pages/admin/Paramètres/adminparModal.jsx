import './adminparModal.css';
import { useState } from 'react';
import { Alert, Icon } from '../../../components/ui';
import { localizePolicy } from '../../../services/policies';

function makePolicyId() {
  return `admin-policy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const EMPTY_POLICY = {
  id: '',
  icon: 'ReceiptLong',
  title: '',
  summary: '',
  content: '',
  translations: { en: { title: '', summary: '', content: '' } },
};

export function AdminProfileModal({ adminProfile, labels, commonLabels, onChange, onClose, onSave }) {
  const [actionMessage, setActionMessage] = useState('');

  function saveProfile() {
    setActionMessage(labels.profileSaved);
    window.setTimeout(onSave, 350);
  }

  return (
    <div className="admin-param-modal-backdrop" role="presentation">
      <section className="admin-param-modal admin-param-modal--profile" role="dialog" aria-modal="true" aria-labelledby="admin-profile-modal-title">
        <header className="admin-param-modal__titlebar">
          <Icon name="Workspaces" size="sm" />
          <Icon name="ChevronRight" size="sm" />
          <h2 id="admin-profile-modal-title">{labels.profileTitle}</h2>
        </header>

        <div className="admin-param-modal-card">
          <h3>{labels.generalInfo}</h3>
          <label>
            <span>{labels.fullName}</span>
            <input value={adminProfile.name} onChange={(event) => onChange('name', event.target.value)} />
          </label>
          <label>
            <span>{labels.email}</span>
            <input type="email" value={adminProfile.email} onChange={(event) => onChange('email', event.target.value)} />
          </label>
          <label>
            <span>{labels.phone}</span>
            <input value={adminProfile.phone || ''} onChange={(event) => onChange('phone', event.target.value)} />
          </label>
        </div>

        <div className="admin-param-modal-card">
          <h3>{labels.accountContext}</h3>
          <div className="admin-param-modal__grid">
            <article>
              <span>{labels.role}</span>
              <strong>{labels.superAdmin}</strong>
            </article>
            <article>
              <span>{labels.scope}</span>
              <strong>{labels.scopeDescription}</strong>
            </article>
          </div>
        </div>

        {actionMessage && (
          <Alert variant="success" onClose={() => setActionMessage('')}>
            {actionMessage}
          </Alert>
        )}

        <footer className="admin-param-modal__footer">
          <button type="button" onClick={onClose}>{commonLabels.cancel}</button>
          <button type="button" className="is-primary" onClick={saveProfile}>{commonLabels.save}</button>
        </footer>
      </section>
    </div>
  );
}

export function AdminLocationModal({
  settings,
  labels,
  commonLabels,
  cityOptions,
  neighborhoodOptions,
  onChange,
  onClose,
  onSave,
}) {
  const canSave = Boolean(settings.companyName.trim() || settings.address.trim() || settings.neighborhood.trim() || settings.city.trim());
  const [actionMessage, setActionMessage] = useState('');

  function saveLocation() {
    setActionMessage(labels.locationSaved);
    window.setTimeout(onSave, 350);
  }

  return (
    <div className="admin-param-modal-backdrop" role="presentation">
      <section className="admin-param-modal admin-param-modal--location" role="dialog" aria-modal="true" aria-labelledby="admin-location-modal-title">
        <header className="admin-param-modal__header">
          <h2 id="admin-location-modal-title">{labels.locationTitle}</h2>
          <button type="button" aria-label={commonLabels.close} onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="admin-location-form">
          <label>
            <span>{labels.organizationName}</span>
            <input value={settings.companyName} onChange={(event) => onChange('companyName', event.target.value)} />
          </label>
          <label>
            <span>{labels.countryRegion}</span>
            <select value={settings.location} onChange={(event) => onChange('location', event.target.value)} disabled>
              <option value="Bénin">Bénin</option>
            </select>
          </label>
          <label>
            <span>{labels.address}</span>
            <input value={settings.address} onChange={(event) => onChange('address', event.target.value)} placeholder={labels.addressPlaceholder} />
          </label>
          <label>
            <span>{labels.neighborhood}</span>
            <input
              list="admin-neighborhood-options"
              value={settings.neighborhood}
              onChange={(event) => onChange('neighborhood', event.target.value)}
            />
            <datalist id="admin-neighborhood-options">
              {neighborhoodOptions.map((neighborhood) => (
                <option key={neighborhood} value={neighborhood} />
              ))}
            </datalist>
          </label>
          <label>
            <span>{labels.city}</span>
            <select value={settings.city} onChange={(event) => onChange('city', event.target.value)}>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>
        </div>

        {actionMessage && (
          <Alert variant="success" onClose={() => setActionMessage('')}>
            {actionMessage}
          </Alert>
        )}

        <footer className="admin-param-modal__footer admin-param-modal__footer--sticky">
          <button type="button" onClick={onClose}>{commonLabels.cancel}</button>
          <button type="button" className="is-primary" onClick={saveLocation} disabled={!canSave}>
            {commonLabels.save}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function AdminPolicyModal({ policies, labels, commonLabels, onPoliciesChange, onClose, language = 'fr' }) {
  const [activePolicyId, setActivePolicyId] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const activePolicy = localizePolicy(
    policies.find((policy) => policy.id === activePolicyId),
    language,
  );

  function openCreatePolicy() {
    setActivePolicyId(null);
    setEditingPolicy({ ...EMPTY_POLICY, id: makePolicyId() });
  }

  function openEditPolicy(policy, event) {
    event.stopPropagation();
    setActivePolicyId(null);
    setEditingPolicy({
      ...policy,
      translations: {
        ...(policy.translations || {}),
        en: { title: '', summary: '', content: '', ...(policy.translations?.en || {}) },
      },
    });
  }

  function deletePolicy(policyId, event) {
    event.stopPropagation();
    onPoliciesChange(policies.filter((policy) => policy.id !== policyId));
    setActionMessage(labels.policyDeleted);
    if (activePolicyId === policyId) setActivePolicyId(null);
  }

  function updateEditingPolicy(field, value) {
    setEditingPolicy((currentPolicy) => ({
      ...currentPolicy,
      [field]: value,
    }));
  }

  function updateEnglishPolicy(field, value) {
    setEditingPolicy((currentPolicy) => ({
      ...currentPolicy,
      translations: {
        ...(currentPolicy.translations || {}),
        en: { ...(currentPolicy.translations?.en || {}), [field]: value },
      },
    }));
  }

  function saveEditingPolicy(event) {
    event.preventDefault();
    const nextPolicy = {
      ...editingPolicy,
      title: editingPolicy.title.trim(),
      summary: editingPolicy.summary.trim(),
      content: editingPolicy.content.trim(),
      translations: {
        ...(editingPolicy.translations || {}),
        en: {
          title: editingPolicy.translations?.en?.title?.trim() || '',
          summary: editingPolicy.translations?.en?.summary?.trim() || '',
          content: editingPolicy.translations?.en?.content?.trim() || '',
        },
      },
    };

    if (!nextPolicy.title) return;

    const exists = policies.some((policy) => policy.id === nextPolicy.id);
    onPoliciesChange(exists
      ? policies.map((policy) => (policy.id === nextPolicy.id ? nextPolicy : policy))
      : [nextPolicy, ...policies]);
    setActionMessage(exists ? labels.policyUpdated : labels.policyCreated);
    setEditingPolicy(null);
  }

  return (
    <div className="admin-param-modal-backdrop" role="presentation">
      <section className="admin-param-modal admin-param-modal--policy" role="dialog" aria-modal="true" aria-labelledby="admin-policy-title">
        <header className="admin-param-modal__header">
          <div className="admin-policy-header-title">
            {(activePolicy || editingPolicy) && (
              <button
                type="button"
                className="admin-policy-back"
                aria-label={labels.backToPolicies}
                onClick={() => {
                  setActivePolicyId(null);
                  setEditingPolicy(null);
                }}
              >
                <Icon name="ChevronLeft" size="sm" />
              </button>
            )}
            <h2 id="admin-policy-title">{editingPolicy ? labels.editPolicy : activePolicy?.title || labels.policiesTitle}</h2>
          </div>
          <button type="button" aria-label={commonLabels.close} onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        {editingPolicy ? (
          <form className="admin-policy-form" onSubmit={saveEditingPolicy}>
            <label>
              <span>{labels.requiredTitle} <b>*</b></span>
              <input value={editingPolicy.title} onChange={(event) => updateEditingPolicy('title', event.target.value)} required autoFocus />
            </label>
            <label>
              <span>{labels.summary}</span>
              <input value={editingPolicy.summary} onChange={(event) => updateEditingPolicy('summary', event.target.value)} />
            </label>
            <label>
              <span>{labels.content}</span>
              <textarea rows={8} value={editingPolicy.content} onChange={(event) => updateEditingPolicy('content', event.target.value)} />
            </label>
            <h3>{labels.englishVersion}</h3>
            <label>
              <span>{labels.englishTitle}</span>
              <input value={editingPolicy.translations?.en?.title || ''} onChange={(event) => updateEnglishPolicy('title', event.target.value)} />
            </label>
            <label>
              <span>{labels.englishSummary}</span>
              <input value={editingPolicy.translations?.en?.summary || ''} onChange={(event) => updateEnglishPolicy('summary', event.target.value)} />
            </label>
            <label>
              <span>{labels.englishContent}</span>
              <textarea rows={8} value={editingPolicy.translations?.en?.content || ''} onChange={(event) => updateEnglishPolicy('content', event.target.value)} />
            </label>
            <div className="admin-policy-form__actions">
              <button type="button" onClick={() => setEditingPolicy(null)}>{commonLabels.cancel}</button>
              <button type="submit">{labels.save}</button>
            </div>
          </form>
        ) : activePolicy ? (
          <div className="admin-policy-page">
            <p>{activePolicy.summary}</p>
            <article>
              <h3>{activePolicy.title}</h3>
              <p>{activePolicy.content || labels.emptyContent}</p>
            </article>
          </div>
        ) : (
          <div className="admin-policy-list">
            <button type="button" className="admin-policy-add" onClick={openCreatePolicy}>
              <Icon name="Add" size="sm" />
              {labels.addPolicy}
            </button>
            {policies.length ? policies.map((policy) => {
              const visiblePolicy = localizePolicy(policy, language);
              return (
              <button type="button" key={policy.id} className="admin-policy-row" onClick={() => setActivePolicyId(policy.id)}>
                <Icon name={visiblePolicy.icon || 'ReceiptLong'} size="sm" />
                <span>
                  <strong>{visiblePolicy.title}</strong>
                  <small>{visiblePolicy.summary || labels.noSummary}</small>
                </span>
                <span className="admin-policy-row__actions" aria-label={labels.actions}>
                  <span role="button" tabIndex={0} title={labels.edit} onClick={(event) => openEditPolicy(policy, event)} onKeyDown={(event) => event.key === 'Enter' && openEditPolicy(policy, event)}>
                    <Icon name="Edit" size="sm" />
                  </span>
                  <span role="button" tabIndex={0} title={labels.delete} className="is-danger" onClick={(event) => deletePolicy(policy.id, event)} onKeyDown={(event) => event.key === 'Enter' && deletePolicy(policy.id, event)}>
                    <Icon name="Delete" size="sm" />
                  </span>
                </span>
                <Icon name="ChevronRight" size="sm" />
              </button>
              );
            }) : (
              <p className="admin-policy-empty">{labels.emptyPolicies}</p>
            )}
          </div>
        )}

        {actionMessage && (
          <Alert variant="success" onClose={() => setActionMessage('')}>
            {actionMessage}
          </Alert>
        )}

        
      </section>
    </div>
  );
}
