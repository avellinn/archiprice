import Icon from '../Icon';
import './ui.css';

export default function Pagination({ page = 1, totalPages = 1, onPageChange, className = '' }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  function changePage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages) return;
    onPageChange?.(nextPage);
  }

  return (
    <nav className={['ui-pagination', className].filter(Boolean).join(' ')} aria-label="Pagination">
      <button type="button" aria-label="Page précédente" onClick={() => changePage(page - 1)}>
        <Icon name="ChevronLeft" size="sm" />
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          className={item === page ? 'is-active' : ''}
          onClick={() => changePage(item)}
        >
          {item}
        </button>
      ))}
      <button type="button" aria-label="Page suivante" onClick={() => changePage(page + 1)}>
        <Icon name="ChevronRight" size="sm" />
      </button>
    </nav>
  );
}
