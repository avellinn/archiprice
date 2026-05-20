import Text from '../components/Text';

export default function Invoices() {
  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="workspace-eyebrow">
            Paiements
          </Text>
          <h1>Factures</h1>
        </div>
      </div>

      <section className="workspace-card invoices-empty">
        <Text as="strong" variant="bold" size="md">
          Aucune facture disponible
        </Text>
        <Text className="muted">
          Les factures liées aux projets validés apparaîtront ici.
        </Text>
      </section>
    </div>
  );
}
