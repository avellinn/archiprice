import './ui.css';

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={['ui-badge', `ui-badge--${tone}`, 'admin-badge', `admin-badge--${tone}`, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
