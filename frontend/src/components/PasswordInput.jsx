import { useState } from 'react';
import './PasswordInput.css';
import Icon from './Icon';
import Text from './Text';

export default function PasswordInput({
  id,
  placeholder = 'Entrez votre mot de passe',
  autoComplete,
  error,
  label = 'Mot de passe',
  forgotLink,
  ...registerProps
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <label className="auth-label" htmlFor={id}>
          {label}
        </label>
        {forgotLink}
      </div>
      <div className="auth-password-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="auth-input"
          placeholder={placeholder}
          autoComplete={autoComplete}
          {...registerProps}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          tabIndex={-1}
        >
          <Icon name={visible ? 'Visibility' : 'VisibilityOff'} />
        </button>
      </div>
      {error && (
        <Text as="span" size="sm" className="auth-field-error">
          {error}
        </Text>
      )}
    </div>
  );
}
