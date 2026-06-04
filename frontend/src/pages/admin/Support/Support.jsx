import './Support.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Badge, Icon, Table } from '../../../components/ui';
import { getApiErrorMessage } from '../../../services/api';
import { useAdminData } from '../../../services/adminData';
import { deleteAdminSupportItem, fetchAdminSupportItems, updateAdminSupportItem } from '../../../services/adminMongo';
import SupportModal from './supportModal';

function getStatusTone(status) {
  if (status === 'Ouvert') return 'danger';
  if (status === 'En cours') return 'warning';
  return 'success';
}

export default function Support() {
  const [searchParams] = useSearchParams();
  const [adminData, updateAdminData] = useAdminData();
  const [remoteSupportItems, setRemoteSupportItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});

  useEffect(() => {
    let cancelled = false;

    fetchAdminSupportItems()
      .then((list) => {
        if (!cancelled) {
          setRemoteSupportItems(list);
          setError('');
        }
      })
      .catch((apiError) => {
        if (!cancelled) setError(getApiErrorMessage(apiError, 'Impossible de charger les demandes support Mongo.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const supportItems = useMemo(() => {
    const byId = new Map();
    [...(adminData?.supportItems || []), ...remoteSupportItems].forEach((item) => {
      if (!item?.id) return;
      byId.set(item.id, item);
    });
    return [...byId.values()];
  }, [adminData?.supportItems, remoteSupportItems]);

  const feedbackItems = useMemo(() => {
    const normalizedSearch = (searchParams.get('q') || '').trim().toLowerCase();

    return supportItems.filter((item) => {
      const matchesTab = item.tab === 'feedback';
      const matchesSearch = !normalizedSearch
        || String(item.subject || '').toLowerCase().includes(normalizedSearch)
        || String(item.user || '').toLowerCase().includes(normalizedSearch)
        || String(item.email || '').toLowerCase().includes(normalizedSearch)
        || String(item.description || '').toLowerCase().includes(normalizedSearch);

      return matchesTab && matchesSearch;
    });
  }, [searchParams, supportItems]);

  const replyDraft = selectedItem?.id
    ? replyDrafts[selectedItem.id] ?? selectedItem.reply ?? ''
    : '';

  function patchSupportItemLocally(itemId, patch) {
    updateAdminData((currentData) => ({
      ...currentData,
      supportItems: (currentData.supportItems || []).map((item) => (
        item.id === itemId ? { ...item, ...patch } : item
      )),
    }));
    setRemoteSupportItems((currentItems) => currentItems.map((item) => (
      item.id === itemId ? { ...item, ...patch } : item
    )));
  }

  function removeSupportItemLocally(itemId) {
    updateAdminData((currentData) => ({
      ...currentData,
      supportItems: (currentData?.supportItems || []).filter((item) => item.id !== itemId),
    }));
    setRemoteSupportItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
    if (selectedItem?.id === itemId) setSelectedItem(null);
  }

  async function deleteSupportItem(item) {
    if (!item?.id) return;

    const previousRemoteItems = remoteSupportItems;
    const previousLocalItems = adminData?.supportItems || [];

    removeSupportItemLocally(item.id);

    try {
      if (previousRemoteItems.some((remoteItem) => remoteItem.id === item.id)) {
        await deleteAdminSupportItem(item.id);
      }
      setError('');
    } catch (apiError) {
      setRemoteSupportItems(previousRemoteItems);
      updateAdminData((currentData) => ({
        ...currentData,
        supportItems: previousLocalItems,
      }));
      setError(getApiErrorMessage(apiError, 'La suppression du feedback a échoué.'));
    }
  }

  async function updateSelectedItem(patch) {
    if (!selectedItem?.id) return;

    const previousRemoteItems = remoteSupportItems;
    const previousLocalItems = adminData.supportItems || [];
    const optimisticItem = { ...selectedItem, ...patch };

    patchSupportItemLocally(selectedItem.id, patch);
    setSelectedItem(optimisticItem);

    try {
      const updatedItem = await updateAdminSupportItem(selectedItem.id, patch);
      setRemoteSupportItems((currentItems) => currentItems.map((item) => (
        item.id === updatedItem.id ? updatedItem : item
      )));
      updateAdminData((currentData) => ({
        ...currentData,
        supportItems: (currentData.supportItems || []).map((item) => (
          item.id === updatedItem.id ? updatedItem : item
        )),
      }));
      setSelectedItem(updatedItem);
      setReplyDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[updatedItem.id];
        return nextDrafts;
      });
      setError('');
    } catch (apiError) {
      const isLocalFeedback = String(selectedItem.id || '').startsWith('feedback-');
      if (isLocalFeedback) {
        setError('');
        return;
      }

      setRemoteSupportItems(previousRemoteItems);
      updateAdminData((currentData) => ({
        ...currentData,
        supportItems: previousLocalItems,
      }));
      setSelectedItem(selectedItem);
      setError(getApiErrorMessage(apiError, "La mise à jour de la demande support a échoué."));
    }
  }

  function renderSupportRow(item) {
    return (
      <div className="admin-support-row">
        <div className="admin-support-row__content">
          <strong>{item.subject}</strong>
          <span>{item.user} · {item.date}</span>
        </div>
        <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
        <span className="admin-support-row-actions">
          <button
            type="button"
            aria-label={`Voir ${item.subject}`}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedItem(item);
            }}
          >
            <Icon name="Visibility" size="sm" />
          </button>
          <button
            type="button"
            className="is-danger"
            aria-label={`Supprimer ${item.subject}`}
            onClick={(event) => {
              event.stopPropagation();
              deleteSupportItem(item);
            }}
          >
            <Icon name="Delete" size="sm" />
          </button>
        </span>
      </div>
    );
  }

  const supportColumns = [
    {
      key: 'subject',
      label: 'Support',
      render: (_value, item) => renderSupportRow(item),
    },
  ];

  return (
    <div className="admin-support-page">
      <section className="admin-support-main">


        {error && (
          <Alert variant="danger" className="admin-support-alert" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        

        <Table
          className="admin-support-list"
          columns={supportColumns}
          data={isLoading ? [] : feedbackItems}
          getRowId={(item, index) => item.id || `${item.subject}-${index}`}
          onRowClick={setSelectedItem}
          emptyLabel={isLoading ? 'Chargement des feedbacks...' : 'Aucun feedback reçu.'}
        />
      </section>

      {selectedItem && (
        <SupportModal
          item={selectedItem}
          replyDraft={replyDraft}
          onReplyChange={(value) => {
            setReplyDrafts((currentDrafts) => ({
              ...currentDrafts,
              [selectedItem.id]: value,
            }));
          }}
          onClose={() => setSelectedItem(null)}
          onUpdate={updateSelectedItem}
        />
      )}
    </div>
  );
}
