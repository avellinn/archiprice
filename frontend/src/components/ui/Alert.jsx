import Icon from './Icon';
import './Alert.css';

const DEFAULT_ICONS = {
  info: 'Info',
  success: 'CheckCircle',
  warning: 'Info',
  danger: 'Close',
};

export default function Alert({
  variant = 'info',
  title,
  children,
  icon,
  onClose,
  className = '',
}) {
  const classes = ['alert', `alert--${variant}`, className].filter(Boolean).join(' ');
  const displayIcon = icon || <Icon name={DEFAULT_ICONS[variant] || DEFAULT_ICONS.info} size={24} />;

  return (
    <div className={classes} role="alert">
      <div className="alert__content">
        {displayIcon && <div className="alert__icon">{displayIcon}</div>}
        <div className="alert__body">
          {title && <div className="alert__title">{title}</div>}
          <div className="alert__message">{children}</div>
        </div>
      </div>
      {onClose && (
        <button
          className="alert__close"
          onClick={onClose}
          type="button"
          aria-label="Fermer"
        >
          <Icon name="Close" size={20} />
        </button>
      )}
    </div>
  );
}
