import './ui.css';

export default function Card({ as: Component = 'section', className = '', children, ...props }) {
  return (
    <Component className={['ui-card', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Component>
  );
}
