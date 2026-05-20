import './Avatar.css';

export default function Avatar({
  src,
  alt,
  initials,
  name,
  size = 'md',
  color,
  className = '',
}) {
  function getInitials() {
    if (initials) return initials;
    if (name) {
      return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return '?';
  }

  const classes = ['avatar', `avatar--${size}`, className].filter(Boolean).join(' ');
  const avatarColor = color || '#F6A83E';

  if (src) {
    return <img src={src} alt={alt || name || 'Avatar'} className={classes} />;
  }

  return (
    <div className={classes} style={{ backgroundColor: avatarColor }} aria-label={name || alt}>
      <span className="avatar__initials">{getInitials()}</span>
    </div>
  );
}
