import { Badge, Text } from '../../components/ui';

const CLIENTS = [
  { name: 'Architectes', detail: 'Demandes issues du catalogue', status: 'Actif' },
  { name: 'Décorateurs', detail: 'Sélections et simulations', status: 'Actif' },
  { name: 'Particuliers', detail: 'Consultations directes', status: 'À suivre' },
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

      <section className="workspace-card supplier-info-grid">
        {CLIENTS.map((client) => (
          <article key={client.name}>
            <span>{client.name}</span>
            <strong>{client.detail}</strong>
            <Badge tone={client.status === 'Actif' ? 'success' : 'warning'}>{client.status}</Badge>
          </article>
        ))}
      </section>
    </div>
  );
}
