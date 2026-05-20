import './Text.css';

export default function Text({
  children,
  variant = 'regular',
  size = 'md',
  as: Component = 'p',
  className = '',
}) {
  const classes = ['text', `text--${variant}`, `text--${size}`, className].filter(Boolean).join(' ');

  return <Component className={classes}>{children}</Component>;
}
