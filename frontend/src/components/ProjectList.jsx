import { useEffect, useState } from 'react';
import './ProjectList.css';
import Button from './Button';
import Text from './Text';
import { getApiErrorMessage } from '../services/api';
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
} from '../services/projects';

const STATUS_LABELS = {
  draft: 'Brouillon',
  active: 'Actif',
  archived: 'Archivé',
};

export default function ProjectList({ onProjectsChange, showCreateForm = true }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError('');
      try {
        const list = await fetchProjects();
        if (!cancelled) {
          setProjects(list);
          onProjectsChange?.(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Impossible de charger les projets'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onProjectsChange]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const project = await createProject({ name: name.trim() });
      setProjects((prev) => {
        const next = [project, ...prev];
        onProjectsChange?.(next);
        return next;
      });
      setName('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(project) {
    setEditingId(project.id);
    setEditName(project.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  async function handleUpdate(id) {
    if (!editName.trim()) return;

    setError('');
    try {
      const updated = await updateProject(id, { name: editName.trim() });
      setProjects((prev) => {
        const next = prev.map((p) => (p.id === id ? updated : p));
        onProjectsChange?.(next);
        return next;
      });
      cancelEdit();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer ce projet ?')) return;

    setError('');
    try {
      await deleteProject(id);
      setProjects((prev) => {
        const next = prev.filter((p) => p.id !== id);
        onProjectsChange?.(next);
        return next;
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (loading) {
    return <Text className="muted">Chargement des projets…</Text>;
  }

  return (
    <section className="projects-section">
      <h2>Mes projets</h2>

      {error && (
        <Text className="error">
          {error}
        </Text>
      )}

      {showCreateForm && (
        <form className="form" onSubmit={handleCreate}>
          <label>
            Nouveau projet
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du projet"
              maxLength={200}
              disabled={submitting}
            />
          </label>
          <Button type="submit" variant="primary" isLoading={submitting} disabled={!name.trim()}>
            Créer le projet
          </Button>
        </form>
      )}

      {projects.length === 0 ? (
        <Text className="muted">Aucun projet pour le moment.</Text>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.id} className="project-item">
              {editingId === project.id ? (
                <div className="project-edit">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={200}
                  />
                  <div className="project-edit-actions">
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      onClick={() => handleUpdate(project.id)}
                    >
                      Enregistrer
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={cancelEdit}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="project-info">
                    <Text as="strong" variant="bold" size="md">
                      {project.name}
                    </Text>
                    <Text as="span" size="sm" className="muted project-meta">
                      {STATUS_LABELS[project.status] ?? project.status}
                      {project.clientName ? ` · ${project.clientName}` : ''}
                    </Text>
                  </div>
                  <div className="project-actions">
                    <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(project)}>
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
