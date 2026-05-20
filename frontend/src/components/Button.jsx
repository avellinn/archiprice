import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  isLoading = false,
  disabled,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full-width' : '',
    isLoading ? 'btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconElement = icon && (
    <span className={`btn__icon btn__icon--${iconPosition}`}>
      {icon}
    </span>
  );

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading && <span className="btn__spinner" />}
      {!isLoading && iconPosition === 'left' && iconElement}
      {!isLoading && <span className="btn__content">{children}</span>}
      {!isLoading && iconPosition === 'right' && iconElement}
    </button>
  );
}
