import siteLogo from '../assets/images/log.png';
import './Logo.css';

export default function Logo({
  variant = 'sidebar',
  alt = 'ArchiPrice',
  
  className = '',
}) {
  const classes = ['app-logo', `app-logo--${variant}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      <img className="app-logo__image" src={siteLogo} alt={alt} />
      
    </span>
  );
}
