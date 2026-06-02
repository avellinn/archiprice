import { Badge, Table, Text } from '../../components/ui';

const CLIENTS = [
  {
    id: 'architectes',
    segment: 'Architectes',
    source: 'Demandes issues du catalogue',
    simulations: 12,
    lastActivity: 'Aujourd’hui',
    status: 'Actif',
  },
  {
    id: 'decorateurs',
    segment: 'Décorateurs',
    source: 'Sélections et simulations',
    simulations: 8,
    lastActivity: 'Hier',
    status: 'Actif',
  },
  {
    id: 'particuliers',
    segment: 'Particuliers',
    source: 'Consultations directes',
    simulations: 3,
    lastActivity: 'Cette semaine',
    status: 'À suivre',
  },
];

const CLIENT_COLUMNS = [
  { key: 'segment', label: 'Client' },
  { key: 'source', label: 'Source' },
  { key: 'simulations', label: 'Simulations' },
  { key: 'lastActivity', label: 'Dernière activité' },
  {
    key: 'status',
    label: 'Statut',
    render: (status) => (
      <Badge tone={status === 'Actif' ? 'success' : 'warning'}>{status}</Badge>
    ),
  },
];

export default function Clients() {
  return (
    <div className="supplier-page page">
      <div className="workspace-heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="workspace-eyebrow">
            Relation commerciale
          </Text>
          <h1>Clients</h1>
        </div>
      </div>

      <Table
        columns={CLIENT_COLUMNS}
        data={CLIENTS}
        getRowId={(client) => client.id}
        emptyLabel="Aucun client disponible."
      />
    </div>
  );
}
