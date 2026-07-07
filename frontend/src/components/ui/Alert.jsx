import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  autoCloseMs = 4000,
  layout = 'toast',
}) {
  const dismissSignature = [variant, title, children]
    .map((value) => (typeof value === 'string' || typeof value === 'number' ? String(value) : ''))
    .join('|');
  const [dismissedSignature, setDismissedSignature] = useState('');
  const classes = [
    'alert',
    `alert--${variant}`,
    layout === 'toast' ? 'alert--toast' : 'alert--inline',
    className,
  ].filter(Boolean).join(' ');
  const displayIcon = icon || <Icon name={DEFAULT_ICONS[variant] || DEFAULT_ICONS.info} size={24} />;
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    setDismissedSignature(dismissSignature);
  }, [dismissSignature, onClose]);

  useEffect(() => {
    if (!autoCloseMs || layout !== 'toast') return undefined;

    const timer = window.setTimeout(() => {
      handleClose();
    }, autoCloseMs);

    return () => window.clearTimeout(timer);
  }, [autoCloseMs, handleClose, layout]);

  if (dismissedSignature === dismissSignature) return null;

  const alertNode = (
    <div className={classes} role="alert">
      <div className="alert__content">
        {displayIcon && <div className="alert__icon">{displayIcon}</div>}
        <div className="alert__body">
          {title && <div className="alert__title">{title}</div>}
          <div className="alert__message">{children}</div>
        </div>
      </div>
      {(onClose || layout === 'toast') && (
        <button
          className="alert__close"
          onClick={handleClose}
          type="button"
          aria-label="Fermer"
        >
          <Icon name="Close" size={20} />
        </button>
      )}
    </div>
  );

  if (layout === 'toast' && typeof document !== 'undefined') {
    return createPortal(alertNode, document.body);
  }

  return alertNode;
}
