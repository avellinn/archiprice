import './EspacePro.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EspaceProWorkspace from './EspaceProWorkspace';
import ModalBoutique from '../../../components/modalBoutique';
import { Alert, Loader } from '../../../components/ui';
import useAuth from '../../../context/useAuth';
import useRealtimeRefresh from '../../../hooks/useRealtimeRefresh';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { upsertSupplierClientNotification } from '../../../services/clientNotifications';
import { createDemande } from '../../../services/demandes';
import { deleteProject, fetchProjects, resetProjects } from '../../../services/projects';

function formatFCFA(amount) {
  return `${new Intl.NumberFormat('fr-FR').format(Number(amount || 0))} FCFA`;
}

function getProjectShopSeed(project) {
  return String(project?.id || project?.name || '')
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getRecommendedShops(project, shops) {
  if (!shops.length) return [];
  const startIndex = getProjectShopSeed(project) % shops.length;
  return [...shops.slice(startIndex), ...shops.slice(0, startIndex)].slice(0, Math.min(3, shops.length));
}

function getProductShopName(product) {
  const shopMatch = String(product?.description || '').match(/Boutique\s*:\s*(.+)/i);
  return shopMatch?.[1]?.trim() || '';
}

function getDynamicProjectShops(project, products, shops) {
  const productShopNames = [...new Set(products.map(getProductShopName).filter(Boolean))];
  const matchedShops = productShopNames
    .map((shopName) => shops.find((shop) => shop.name.toLowerCase() === shopName.toLowerCase()))
    .filter(Boolean);

  return matchedShops.length > 0 ? matchedShops : getRecommendedShops(project, shops);
}

function getUserProfession(user) {
  return user?.profession || user?.type || user?.accountType || user?.role || 'Client';
}

function buildSupplierClientNotification({ shop, user, project, simulation, products = [], message = '' }) {
  const now = new Date().toISOString();
  const userId = user?.id || user?._id || user?.email || 'client';
  const supplierKey = shop?.id || shop?.name || 'boutique';

  return {
    id: `supplier-client-${supplierKey}-${userId}-${Date.now()}`,
    supplierId: shop?.id || '',
    supplierName: shop?.name || '',
    supplierContact: shop?.contact || '',
    clientId: user?.id || user?._id || '',
    clientName: user?.name || user?.fullName || user?.email || 'Client ArchiPrice',
    clientProfession: getUserProfession(user),
    clientEmail: user?.email || '',
    clientPhone: user?.phone || user?.telephone || user?.phoneNumber || 'Non renseigné',
    projectId: project?.id || '',
    projectName: project?.name || 'Projet sans nom',
    simulationTotal: simulation.total,
    simulationTotalLabel: formatFCFA(simulation.total),
    articleCount: simulation.count,
    categories: simulation.categories,
    selectedArticles: products.map((product) => ({
      id: product.id || product._id || '',
      name: product.name || 'Article sans nom',
      category: product.category || '',
      unitPrice: Number(product.unitPrice || 0),
    })),
    type: 'Demande',
    message,
    messages: message ? [{
      id: `message-${Date.now()}`,
      senderRole: 'user',
      senderName: user?.name || user?.fullName || user?.email || 'Client ArchiPrice',
      message,
      createdAt: now,
    }] : [],
    status: 'Nouveau',
    createdAt: now,
  };
}

function isActiveProject(project) {
  return !['archived', 'completed', 'done'].includes(String(project?.status || '').toLowerCase());
}

function getLatestActiveProject(projects = []) {
  return projects
    .filter(isActiveProject)
    .sort((left, right) => (
      new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0)
    ))[0] || projects[0] || null;
}

function getShopDemandMessage({ shop, project, products = [] }) {
  const shopName = shop?.name || shop?.companyName || 'cette boutique';
  const projectName = project?.name || 'mon projet';

  return products.length > 0
    ? `Demande boutique pour ${projectName}: ${products.length} article(s) sélectionné(s) chez ${shopName}.`
    : `Demande boutique pour ${projectName} chez ${shopName}.`;
}

export default function EspaceProPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [adminData, updateAdminData] = useAdminData();
  const [projects, setProjects] = useState([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('projectId') || '');
  const [selectedProjectProducts, setSelectedProjectProducts] = useState([]);
  const [isShopSelectorOpen, setIsShopSelectorOpen] = useState(false);
  const [selectedShopName, setSelectedShopName] = useState('');
  const [deletingProjectId, setDeletingProjectId] = useState('');
  const [pendingProjectDelete, setPendingProjectDelete] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResettingProjects, setIsResettingProjects] = useState(false);

  const loadProjects = useCallback(() => {
    setIsProjectsLoading(true);
    fetchProjects()
      .then((list) => {
        setProjects(list);
        setProjectsError('');
        const projectIdFromUrl = searchParams.get('projectId');
        if (projectIdFromUrl) setSelectedProjectId(projectIdFromUrl);
        if (!projectIdFromUrl) {
          const latestActiveProject = getLatestActiveProject(list);
          if (latestActiveProject?.id) setSelectedProjectId(latestActiveProject.id);
        }
      })
      .catch(() => {
        setProjects([]);
        setProjectsError('Impossible de charger les projets.');
      })
      .finally(() => setIsProjectsLoading(false));
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(loadProjects, 0);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  useRealtimeRefresh(loadProjects, ['projects', 'project-products']);

  const latestActiveProject = useMemo(() => getLatestActiveProject(projects), [projects]);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || latestActiveProject;
  const projectShops = useMemo(() => {
    const adminShops = (adminData.suppliers || [])
      .filter((supplier) => supplier.isRecommended && supplier.status !== 'Supprimé')
      .map((supplier) => ({
        id: supplier.id,
        name: supplier.companyName || supplier.name,
        companyName: supplier.companyName || supplier.name,
        contact: supplier.contact || supplier.email || '',
        zone: supplier.region || supplier.zone || 'Zone non renseignée',
        categories: Array.isArray(supplier.categories) && supplier.categories.length > 0
          ? supplier.categories.join(', ')
          : supplier.products
            ? `${supplier.products} article(s) lié(s)`
            : "Categories configurees par l'admin",
        status: supplier.status,
        isRecommended: supplier.isRecommended,
      }))
      .filter((supplier) => supplier.name);

    return getDynamicProjectShops(selectedProject, selectedProjectProducts, adminShops);
  }, [adminData.suppliers, selectedProject, selectedProjectProducts]);

  const selectedShop = projectShops.find((shop) => shop.name === selectedShopName) || projectShops[0];
  const selectedProjectPurchaseSimulation = useMemo(() => {
    const total = selectedProjectProducts.reduce((sum, product) => sum + Number(product.unitPrice || 0), 0);
    const categories = [...new Set(selectedProjectProducts.map((product) => product.category).filter(Boolean))];

    return { total, count: selectedProjectProducts.length, categories };
  }, [selectedProjectProducts]);

  function handleProjectSelect(projectId) {
    setSelectedProjectId(projectId);
    setSearchParams(projectId ? { projectId } : {}, { replace: true });
  }

  function handleProjectEdit(project) {
    if (!project?.id) return;
    navigate(`/catalogue?projectId=${project.id}&recap=1`, { state: { from: { pathname: '/espacepro', search: `?projectId=${project.id}` } } });
  }

  function handleReturn() {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate('/workspace');
  }

  async function confirmProjectDelete() {
    const project = pendingProjectDelete;
    if (!project) return;

    setDeletingProjectId(project.id);
    setPendingProjectDelete(null);
    setProjectsError('');

    try {
      await deleteProject(project.id);
      setProjects((currentProjects) => {
        const nextProjects = currentProjects.filter((currentProject) => currentProject.id !== project.id);
        if (selectedProjectId === project.id) handleProjectSelect(nextProjects[0]?.id || '');
        return nextProjects;
      });
    } catch (error) {
      setProjectsError(getApiErrorMessage(error, 'Impossible de supprimer le projet'));
    } finally {
      setDeletingProjectId('');
    }
  }

  async function confirmProjectsReset() {
    setIsResettingProjects(true);
    setProjectsError('');
    try {
      await resetProjects();
      setProjects([]);
      setSelectedProjectId('');
      setSelectedProjectProducts([]);
      setSearchParams({}, { replace: true });
      setIsResetConfirmOpen(false);
    } catch (error) {
      setProjectsError(getApiErrorMessage(error, 'Impossible de réinitialiser les projets'));
    } finally {
      setIsResettingProjects(false);
    }
  }

  async function handleShopSelect(shop, message = '') {
    if (!shop?.name) return;

    setSelectedShopName(shop.name);
    const demandMessage = message.trim() || getShopDemandMessage({
      shop,
      project: selectedProject,
      products: selectedProjectProducts,
    });
    const notification = buildSupplierClientNotification({
      shop,
      user,
      project: selectedProject,
      simulation: selectedProjectPurchaseSimulation,
      products: selectedProjectProducts,
      message: demandMessage,
    });

    try {
      const demande = await createDemande({
        supplierId: shop.id || shop._id || '',
        supplierName: shop.name || shop.companyName || '',
        supplierContact: shop.contact || shop.email || '',
        projectId: selectedProject?.id || '',
        projectName: selectedProject?.name || '',
        message: demandMessage,
      });
      upsertSupplierClientNotification(updateAdminData, {
        ...notification,
        id: demande.id || notification.id,
        sourceNotificationId: demande.id || notification.id,
        messages: demande.messages || notification.messages,
        status: demande.status || notification.status,
        createdAt: demande.createdAt || notification.createdAt,
        updatedAt: demande.updatedAt || notification.updatedAt,
      });
    } catch {
      upsertSupplierClientNotification(updateAdminData, notification);
    }
  }

  useEffect(() => {
    if (searchParams.get('shop') === '1' && selectedProject?.id) {
      const timer = window.setTimeout(() => {
        setIsShopSelectorOpen(true);
        setSearchParams({ projectId: selectedProject.id }, { replace: true });
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [searchParams, selectedProject?.id, setSearchParams]);

  return (
    <main className="espacepro-page">
      
        
        
      

      {pendingProjectDelete && (
        <Alert
          variant="warning"
          title="Suppression de projet"
          className="espacepro-page__alert"
          autoCloseMs={0}
          onClose={() => setPendingProjectDelete(null)}
        >
          <span>Supprimer définitivement le projet "{pendingProjectDelete.name}" ?</span>
          <span className="espacepro-page__alert-actions">
            <button type="button" onClick={() => setPendingProjectDelete(null)}>Annuler</button>
            <button type="button" onClick={confirmProjectDelete}>Supprimer</button>
          </span>
        </Alert>
      )}

      {isResetConfirmOpen && (
        <Alert
          variant="warning"
          title="Réinitialiser les projets"
          className="espacepro-page__alert"
          onClose={() => setIsResetConfirmOpen(false)}
          autoCloseMs={0}
        >
          <span>Supprimer définitivement tous les projets et leurs articles associés ?</span>
          <span className="espacepro-page__alert-actions">
            <button type="button" onClick={() => setIsResetConfirmOpen(false)}>Annuler</button>
            <button type="button" disabled={isResettingProjects} onClick={confirmProjectsReset}>
              {isResettingProjects ? 'Réinitialisation…' : 'Réinitialiser'}
            </button>
          </span>
        </Alert>
      )}

      {isProjectsLoading ? (
        <Loader className="espacepro-page__loader" />
      ) : (
        <EspaceProWorkspace
          projects={projects}
          isProjectsLoading={isProjectsLoading}
          projectsError={projectsError}
          selectedProjectId={selectedProjectId}
          onProjectSelect={handleProjectSelect}
          onProjectEdit={handleProjectEdit}
          onProjectDelete={setPendingProjectDelete}
          deletingProjectId={deletingProjectId}
          onProductsChange={setSelectedProjectProducts}
          onArticleShopOpen={() => setIsShopSelectorOpen(true)}
          onReturn={handleReturn}
          onProjectCreate={() => navigate('/catalogue', {
            state: {
              forceProjectGate: true,
              from: { pathname: '/espacepro', search: selectedProjectId ? `?projectId=${selectedProjectId}` : '' },
            },
          })}
          onProjectsReset={() => setIsResetConfirmOpen(true)}
        />
      )}

      <ModalBoutique
        isOpen={isShopSelectorOpen}
        shops={projectShops}
        selectedShopName={selectedShop?.name || selectedShopName}
        simulation={{
          totalLabel: formatFCFA(selectedProjectPurchaseSimulation.total),
          count: selectedProjectPurchaseSimulation.count,
          categories: selectedProjectPurchaseSimulation.categories,
        }}
        onClose={() => setIsShopSelectorOpen(false)}
        onSelectShop={handleShopSelect}
      />

    </main>
  );
}
