import './AuthLayout.css';
import siteLogo from '../assets/images/log.png';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <div className="auth-icon">
            <img src={siteLogo} alt="ArchiPrice" />
          </div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          <hr className="auth-divider" />
        </header>
        <div className="auth-body">{children}</div>
      </div>
      {footer && <footer className="auth-footer">{footer}</footer>}
    </div>
  );
}
