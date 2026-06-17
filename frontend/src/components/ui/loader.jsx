import { TailChase } from 'ldrs/react';
import 'ldrs/react/TailChase.css';
import './loader.css';

export default function Loader({
  
  size = 50,
  speed = 3.5,
  color = 'currentColor',
  className = '',
}) {
  const classes = ['ui-loader', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="status" aria-live="polite">
      <TailChase size={String(size)} speed={String(speed)} color={color} />
      
    </div>
  );
}
