import { useState } from 'react';
import Button from './Button';
import Text from './Text';
import { Alert } from './ui';
import { getApiErrorMessage } from '../services/api';
import { createProject } from '../services/projects';
import { isNumericOnly, sanitizeNumericInput } from '../utils/formInput';
import './Newproject.css';

const CUSTOM_ROOM_VALUE = '__custom_room__';

function parseAmount(value) {
  const amount = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

function buildProjectDescription(roomType) {
  return `Type de pièce : ${roomType}`;
}

export default function Newproject({ isOpen, onCancel, onCreated, roomTypes = [], deferCreation = false }) {
  const normalizedRoomTypes = roomTypes.map((room) => (
    typeof room === 'string'
      ? { value: room, label: room }
      : room
  )).filter((room) => room?.value && room?.label);
  const [projectName, setProjectName] = useState('');
  const [roomType, setRoomType] = useState('');
  const [customRoomType, setCustomRoomType] = useState('');
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function resetForm() {
    setProjectName('');
    setRoomType('');
    setCustomRoomType('');
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

    if (isNumericOnly(name)) {
      setError('Le nom du projet doit contenir du texte.');
      return;
    }

    const effectiveRoomType = roomType === CUSTOM_ROOM_VALUE ? customRoomType.trim() : roomType;

    if (!effectiveRoomType) {
      setError('Type de pièce requis');
      return;
    }

    if (isNumericOnly(effectiveRoomType)) {
      setError('Le type de pièce doit contenir du texte.');
      return;
    }

    if (!budget.trim()) {
      setError('Budget cible requis');
      return;
    }

    if (parseAmount(budget) <= 0) {
      setError('Le budget doit être supérieur à 0');
      return;
    }

    setSubmitting(true);
    setError('');
    setActionMessage('');

    try {
      const projectPayload = {
        name,
        description: buildProjectDescription(effectiveRoomType),
        status: 'draft',
        budgetTarget: parseAmount(budget),
      };
      const project = await createProject(projectPayload);

      if (String(project?.id || '').startsWith('local-project-')) {
        throw new Error('La base de données doit être disponible pour démarrer le projet.');
      }

      setActionMessage('Projet créé avec succès.');
      resetForm();
      onCreated?.(project);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de créer le projet. Vérifiez votre connexion et réessayez.'));
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
              required
            />
          </label>

          <label className="modal-create-project__field">
            Type de pièce
            <select required value={roomType} onChange={(event) => setRoomType(event.target.value)}>
              <option value="" disabled>Choisir une pièce</option>
              {normalizedRoomTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
              <option value={CUSTOM_ROOM_VALUE}>Autre</option>
            </select>
          </label>

          {roomType === CUSTOM_ROOM_VALUE && (
            <label className="modal-create-project__field">
              Type de pièce personnalisé
              <input
                type="text"
                value={customRoomType}
                onChange={(event) => setCustomRoomType(event.target.value)}
                placeholder="Ex. Dressing, studio, terrasse..."
                maxLength={120}
                required
              />
            </label>
          )}

          <label className="modal-create-project__field">
            Estimation budget (FCFA)
            <input
              type="text"
              value={budget}
              onChange={(event) => setBudget(sanitizeNumericInput(event.target.value))}
              placeholder="Votre budget"
              inputMode="numeric"
              required
            />
          </label>
        </div>

        {error && (
          <Alert variant="danger" className="modal-create-project__error">{error}</Alert>
        )}
        {actionMessage && (
          <Alert variant="success" className="modal-create-project__error" onClose={() => setActionMessage('')}>
            {actionMessage}
          </Alert>
        )}

        <div className="modal-create-project__actions">
          <Button type="button" variant="danger" onClick={handleCancel} disabled={submitting}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="success"
            isLoading={submitting}
            disabled={!projectName.trim() || !roomType || !budget.trim() || (roomType === CUSTOM_ROOM_VALUE && !customRoomType.trim())}
          >
            Valider
          </Button>
        </div>
      </form>
    </div>
  );
}
