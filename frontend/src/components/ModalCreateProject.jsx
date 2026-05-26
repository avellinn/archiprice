import { useState } from 'react';
import Button from './Button';
import Text from './Text';
import { getApiErrorMessage } from '../services/api';
import { createProject } from '../services/projects';
import './ModalCreateProject.css';

const ROOM_TYPES = [
  { value: 'salon', label: 'Salon' },
  { value: 'chambre', label: 'Chambre' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'douche', label: 'Douche' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'espace externe', label: 'Espace externe' },
];

function buildProjectDescription(roomType, budget) {
  const formattedBudget = formatBudgetInput(budget);

  return [
    `Type de pièce : ${roomType}`,
    formattedBudget ? `Estimation budget : ${formattedBudget}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function parseAmount(value) {
  const amount = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

function formatBudgetInput(value) {
  const amount = parseAmount(value);
  return amount > 0 ? formatFCFA(amount) : '';
}

export default function ModalCreateProject({ isOpen, onCancel, onCreated }) {
  const [projectName, setProjectName] = useState('');
  const [roomType, setRoomType] = useState(ROOM_TYPES[0].value);
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function resetForm() {
    setProjectName('');
    setRoomType(ROOM_TYPES[0].value);
    setBudget('');
    setError('');
  }

  function handleCancel() {
    resetForm();
    onCancel?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = projectName.trim();
    if (!name) {
      setError('Nom du projet requis');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const project = await createProject({
        name,
        description: buildProjectDescription(roomType, budget.trim()),
      });
      resetForm();
      onCreated?.(project);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de créer le projet'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-create-project__backdrop" role="presentation">
      <form
        className="modal-create-project"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-create-project-title"
      >
        <div className="modal-create-project__header">
          <div>
            <Text as="span" size="sm" variant="bold" className="modal-create-project__eyebrow">
              Nouveau projet
            </Text>
            <h2 id="modal-create-project-title">Créer un projet</h2>
          </div>
          <button
            type="button"
            className="modal-create-project__close"
            onClick={handleCancel}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="modal-create-project__fields">
          <label className="modal-create-project__field">
            Nom du projet
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Entrez le nom de votre projet"
              maxLength={200}
              autoFocus
            />
          </label>

          <label className="modal-create-project__field">
            Type de pièce
            <select value={roomType} onChange={(event) => setRoomType(event.target.value)}>
              {ROOM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="modal-create-project__field">
            Estimation budget (FCFA) 
            <input
              type="number"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Votre budget"
              min="0"
              inputMode="numeric"
            />
          </label>
        </div>

        {error && (
          <Text size="sm" className="modal-create-project__error">
            {error}
          </Text>
        )}

        <div className="modal-create-project__actions">
          <Button type="button" variant="danger" onClick={handleCancel} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" variant="success" isLoading={submitting} disabled={!projectName.trim()}>
            Valider
          </Button>
        </div>
      </form>
    </div>
  );
}
