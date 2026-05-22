import Text from '../components/Text';

export default function AdminPlaceholder({ eyebrow = 'Backoffice', title, description }) {
  return (
    <div className="admin-users-page">
      <div className="admin-users-heading">
        <div>
          <Text as="span" size="sm" variant="bold" className="admin-users-eyebrow">
            {eyebrow}
          </Text>
          <h1>{title}</h1>
        </div>
      </div>

      <section className="admin-users-card admin-placeholder-card">
        <Text as="strong" variant="bold" size="md">
          {title}
        </Text>
        <Text className="muted">
          {description || 'Cet espace backoffice sera alimenté dynamiquement au prochain sprint.'}
        </Text>
      </section>
    </div>
  );
}
