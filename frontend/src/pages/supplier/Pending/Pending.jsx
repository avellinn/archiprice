import { Link } from 'react-router-dom';
import AuthLayout from '../../../components/AuthLayout';
import { Text } from '../../../components/ui';

export default function SupplierPending() {
  return (
    <AuthLayout
      title="Demande envoyée"
      subtitle="Partenariat fournisseur"
      footer={
        <Link to="/login" className="auth-link">
          Retour à la connexion
        </Link>
      }
    >
      <div className="auth-form supplier-pending">
        <Text as="strong" variant="bold" size="lg">
          Nous vous revennons dans un bref délai.
        </Text>
        <Text className="muted">
          Votre demande fournisseur a bien été transmise à l’équipe admin. Vous recevrez l’accès à votre boutique en ligne après validation.
        </Text>
      </div>
    </AuthLayout>
  );
}
