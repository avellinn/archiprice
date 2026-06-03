import Icon from './Icon';
import './ServerError.css';

export default function ServerError({
  title = 'Un problème est survenu lors du chargement de cette page',
  message = "Un problème technique a empêché le chargement de cette page. Essayez de recharger cette page ou d'accéder à une autre page.",
  status = '500',
  actionLabel = 'Recharger',
  onRetry,
  className = '',
}) {
  return (
    <section className={['server-error', className].filter(Boolean).join(' ')} role="alert">
      <div className="server-error__illustration" aria-hidden="true">
        <div className="server-error__side">
          <span />
        </div>
        <div className="server-error__paper">
          <i />
          <strong>{status}</strong>
        </div>
      </div>

      <div className="server-error__content">
        <h2>{title}</h2>
        <p>{message}</p>
        {onRetry && (
          <button type="button" className="server-error__retry" onClick={onRetry}>
            <Icon name="History" size="sm" />
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}
