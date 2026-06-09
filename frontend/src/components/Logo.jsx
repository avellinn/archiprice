import largeLogo from '../assets/images/log-large.png';
import './Logo.css';

const logoMap = {
  default: largeLogo,
  small: largeLogo,
  large: largeLogo,
  auth: largeLogo,
  header: largeLogo,
  sidebar: largeLogo,
};

export default function Logo({
  variant = 'default',
  alt = 'ArchiPrice',
  showText = false,
  className = '',
}) {
  const logoSource = logoMap[variant] || logoMap.default;
  const classes = ['app-logo', `app-logo--${variant}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      <img className="app-logo__image" src={logoSource} alt={alt} />
      {showText && <span className="app-logo__text">ArchiPrice</span>}
    </span>
  );
}
