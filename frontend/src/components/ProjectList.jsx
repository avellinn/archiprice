import { useEffect, useState } from 'react';
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

export default function ProjectList({ onProjectsChange }) {
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
    return <p className="muted">Chargement des projets…</p>;
  }

  return (
    <section className="projects-section">
      <h2>Mes projets</h2>

      {error && <p className="error">{error}</p>}

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
        <button type="submit" className="btn-primary" disabled={submitting || !name.trim()}>
          {submitting ? 'Création…' : 'Créer le projet'}
        </button>
      </form>

      {projects.length === 0 ? (
        <p className="muted">Aucun projet pour le moment.</p>
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
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => handleUpdate(project.id)}
                    >
                      Enregistrer
                    </button>
                    <button type="button" className="btn-link" onClick={cancelEdit}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="project-info">
                    <strong>{project.name}</strong>
                    <span className="muted project-meta">
                      {STATUS_LABELS[project.status] ?? project.status}
                      {project.clientName ? ` · ${project.clientName}` : ''}
                    </span>
                  </div>
                  <div className="project-actions">
                    <button type="button" className="btn-link" onClick={() => startEdit(project)}>
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn-link btn-danger"
                      onClick={() => handleDelete(project.id)}
                    >
                      Supprimer
                    </button>
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
