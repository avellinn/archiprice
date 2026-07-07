import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getScopedStorageKey } from '../../../services/scopedStorage.js';
import { fetchProducts } from '../../../services/products.js';
import { fetchProjects } from '../../../services/projects.js';
import { getApiErrorMessage } from '../../../services/api.js';
import { normalizeProductSelectionIds } from '../../../utils/catalogueNavigation.js';
import { extractProjectBudget } from './catalogueUtils.js';

const PROJECT_GATE_GRACE_MS = 24 * 3600 * 1000;
const PROJECT_GATE_STORAGE_BASE_KEY = 'archiprice:catalogue_project_created_at';

function getGraceStorageKey() {
  return getScopedStorageKey(PROJECT_GATE_STORAGE_BASE_KEY);
}

export function getProjectGateGraceEnd() {
  try {
    const stored = window.localStorage.getItem(getGraceStorageKey());
    if (!stored) return null;
    const timestamp = Number(stored);
    if (!Number.isFinite(timestamp)) return null;
    return timestamp + PROJECT_GATE_GRACE_MS;
  } catch {
    return null;
  }
}

export function setProjectGateGraceEnd() {
  try {
    window.localStorage.setItem(getGraceStorageKey(), String(Date.now()));
  } catch {
    // ignore
  }
}

export function clearProjectGateGraceEnd() {
  try {
    window.localStorage.removeItem(getGraceStorageKey());
  } catch {
    // ignore
  }
}

/**
 * Retourne true si la période de grâce est active.
 * Source de vérité unique : le localStorage.
 */
export function isGraceActive() {
  try {
    const graceEnd = getProjectGateGraceEnd();
    return Boolean(graceEnd && Date.now() < graceEnd);
  } catch {
    return false;
  }
}

/**
 * Calcule si la gate doit s'ouvrir.
 * Centralisé ici pour éviter toute divergence entre état React et localStorage.
 */
export function shouldOpenGate({ activeProjectId, isProjectGateCompleted, isProjectGateForced, hasProjectInProgress, projectsChecked }) {
  // Pas encore prêt
  if (!projectsChecked) return false;
  // Un projectId dans l'URL = projet actif, pas de gate
  if (activeProjectId) return false;
  // Le gate a déjà été rempli dans cette session
  if (isProjectGateCompleted) return false;
  // Grâce active — ne jamais ouvrir la gate
  if (isGraceActive()) return false;
  // Force override
  if (isProjectGateForced) return true;
  // Projet draft en cours
  if (hasProjectInProgress) return false;
  // Pas de projet → gate requise
  return true;
}

export function useProjectGate({
  products,
  setBudgetTarget,
  setSelectedProductIds,
  setValidationError,
  setIsRecapVisible,
  setSuccessMessage,
  expandBudget,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeProjectId = searchParams.get('projectId') || '';
  const appliedReturnSelectionRef = useRef('');

  const [currentProject, setCurrentProject] = useState(null);
  const [pendingProjectPayload, setPendingProjectPayload] = useState(location.state?.pendingProject || null);
  const [isProjectGateCompleted, setIsProjectGateCompleted] = useState(false);
  const [isProjectGateForced, setIsProjectGateForced] = useState(Boolean(location.state?.forceProjectGate));

  // État React pour les composants qui ont besoin de réagir aux changements
  const [graceActive, setGraceActive] = useState(() => isGraceActive());

  const [projectsChecked, setProjectsChecked] = useState(false);
  const [hasProjectInProgress, setHasProjectInProgress] = useState(false);

  // Ré-évaluer la grâce toutes les 60s pour détecter l'expiration.
  useEffect(() => {
    function tick() {
      const valid = isGraceActive();
      if (!valid) {
        const graceEnd = getProjectGateGraceEnd();
        if (graceEnd) clearProjectGateGraceEnd();
      }
      setGraceActive(valid);
    }

    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Charger le projet depuis l'URL
  useEffect(() => {
    if (!activeProjectId) return undefined;
    let cancelled = false;

    fetchProjects()
      .then((projects) => {
        if (cancelled) return;
        const found = projects.find((p) => p.id === activeProjectId);
        setCurrentProject(found || null);
        const budget = extractProjectBudget(found);
        if (budget) setBudgetTarget(String(budget));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [activeProjectId, setBudgetTarget]);

  // Vérifier l'existence d'un projet draft quand pas de projectId dans l'URL
  useEffect(() => {
    if (activeProjectId) {
      const timer = window.setTimeout(() => {
        setHasProjectInProgress(true);
        setProjectsChecked(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;

    fetchProjects()
      .then((projects) => {
        if (cancelled) return;
        const draft = projects.find((p) => String(p.status || '').toLowerCase() === 'draft');
        setHasProjectInProgress(Boolean(draft));
        setProjectsChecked(true);
        if (draft?.id && !location.state?.forceProjectGate) {
          navigate(`/catalogue?projectId=${draft.id}&recap=1`, {
            replace: true,
            state: {
              from: location.state?.from || {
                pathname: '/espacepro',
                search: `?projectId=${draft.id}`,
              },
            },
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasProjectInProgress(false);
          setProjectsChecked(true);
        }
      });

    return () => { cancelled = true; };
  }, [activeProjectId, location.state?.forceProjectGate, location.state?.from, navigate]);

  // Appliquer les sélections depuis le state de navigation (retour depuis fiche produit)
  useEffect(() => {
    const explicitIds = normalizeProductSelectionIds([
      location.state?.addedProductId,
      location.state?.selectedProductId,
      location.state?.selectedProductIds,
    ]);
    if (explicitIds.length === 0) return;

    const signature = explicitIds.join('|');
    if (appliedReturnSelectionRef.current === signature) return;

    appliedReturnSelectionRef.current = signature;
    setSelectedProductIds((currentIds) => {
      const existing = new Set(currentIds);
      return [...currentIds, ...explicitIds.filter((id) => !existing.has(id))];
    });
    setValidationError('');
    setIsRecapVisible(false);
    if (location.state?.addedProductId) {
      setSuccessMessage('Produit ajouté avec succès.');
    }
  }, [
    location.state?.addedProductId,
    location.state?.selectedProductId,
    location.state?.selectedProductIds,
    setIsRecapVisible,
    setSelectedProductIds,
    setSuccessMessage,
    setValidationError,
  ]);

  // Restaurer les produits du projet pour le récap
  useEffect(() => {
    if (!activeProjectId || searchParams.get('recap') !== '1' || products.length === 0 || location.state?.skipRecap) {
      return undefined;
    }

    let cancelled = false;

    fetchProducts(activeProjectId)
      .then((projectProducts) => {
        if (cancelled) return;

        const selectedIds = products
          .filter((catalogueProduct) => projectProducts.some((pp) => (
            String(pp.name || '').trim().toLowerCase() === String(catalogueProduct.name || '').trim().toLowerCase()
            && (!pp.category || String(pp.category || '').trim().toLowerCase() === String(catalogueProduct.category || '').trim().toLowerCase())
          )))
          .map((p) => p.id);

        if (selectedIds.length > 0) {
          setSelectedProductIds(selectedIds);
          setValidationError('');
          setIsRecapVisible(true);
        } else {
          setValidationError('Aucun article du projet ne correspond au catalogue actuel.');
        }
      })
      .catch((error) => {
        if (!cancelled) setValidationError(getApiErrorMessage(error, 'Impossible de charger les articles du projet.'));
      });

    return () => { cancelled = true; };
  }, [activeProjectId, location.state?.skipRecap, products, searchParams, setIsRecapVisible, setSelectedProductIds, setValidationError]);

  function handleProjectGateCreated(project) {
    if (!project?.name) return;

    if (String(project?.id || '').startsWith('local-project-')) {
      setValidationError('Impossible de créer le projet. Vérifiez votre connexion et réessayez.');
      return;
    }

    const budget = Number(project?.budgetTarget);
    if (Number.isFinite(budget) && budget > 0) setBudgetTarget(String(budget));

    setPendingProjectPayload(project);
    setIsProjectGateCompleted(true);
    setProjectGateGraceEnd();
    setGraceActive(true);
    expandBudget();
    setSuccessMessage('Projet créé avec succès.');
  }

  function handleGateCancel() {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate('/dashboard', { replace: true });
  }

  function handleWorkspaceReturn() {
    const from = location.state?.from;
    if (from?.pathname && from.pathname !== location.pathname) {
      navigate(`${from.pathname}${from.search || ''}${from.hash || ''}`);
      return;
    }
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    const pid = searchParams.get('projectId');
    navigate(pid ? `/workspace?mode=projects&projectId=${pid}` : '/workspace');
  }

  // La gate doit s'ouvrir est calculé directement depuis le localStorage (isGraceActive)
  // et les états React — pas de dépendance à location.state.
  const gateOpen = shouldOpenGate({
    activeProjectId,
    isProjectGateCompleted,
    isProjectGateForced,
    hasProjectInProgress,
    projectsChecked,
  });

  return {
    activeProjectId,
    currentProject,
    setCurrentProject,
    pendingProjectPayload,
    setPendingProjectPayload,
    isProjectGateCompleted,
    setIsProjectGateCompleted,
    isProjectGateForced,
    setIsProjectGateForced,
    // gateOpen est la valeur définitive à utiliser dans isOpen de Newproject
    gateOpen,
    // Compatibilité avec Catalogue.jsx — aliases
    skipProjectGate: graceActive,
    isWithinGracePeriod: graceActive,
    setIsWithinGracePeriod: setGraceActive,
    projectsChecked,
    hasProjectInProgress,
    setHasProjectInProgress,
    handleProjectGateCreated,
    handleGateCancel,
    handleWorkspaceReturn,
  };
}
