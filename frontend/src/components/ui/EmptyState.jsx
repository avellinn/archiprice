import Text from '../Text';
import './ui.css';

export default function EmptyState({ title = 'Aucune donnée disponible.', description, className = '' }) {
  return (
    <div className={['ui-empty-state', className].filter(Boolean).join(' ')}>
      <Text as="strong" variant="bold">{title}</Text>
      {description && <Text className="muted">{description}</Text>}
    </div>
  );
}
