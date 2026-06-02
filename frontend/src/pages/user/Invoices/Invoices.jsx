import './Invoices.css';
import { Text } from '../../../components/ui';

export default function Invoices() {
  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="workspace-eyebrow">
            Paiements
          </Text>
          <h1>Estimations exportées</h1>
        </div>
      </div>

      <section className="workspace-card invoices-empty">
        <Text as="strong" variant="bold" size="md">
          Aucune estimation exportée disponible
        </Text>
        <Text className="muted">
          Les estimations exportées liées aux projets validés apparaîtront ici.
        </Text>
      </section>
    </div>
  );
}
