import EmptyState from './EmptyState';
import './ui.css';
import './Table.css';

function getCellValue(row, column) {
  if (!column) return null;
  const value = row?.[column.key];
  return column.render ? column.render(value, row) : value;
}

export default function Table({
  columns = [],
  data = [],
  getRowId = (row, index) => row?.id || index,
  onRowClick,
  emptyLabel = 'Aucune donnée disponible.',
  className = '',
}) {
  const isInteractive = typeof onRowClick === 'function';

  return (
    <section className={['ui-table-card', 'ui-table-card--adaptive', className].filter(Boolean).join(' ')}>
      {data.length === 0 ? (
        <EmptyState title={emptyLabel} />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-data-table ui-adaptive-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={getRowId(row, rowIndex)}
                  className={isInteractive ? 'ui-adaptive-table__row--clickable' : ''}
                  tabIndex={isInteractive ? 0 : undefined}
                  role={isInteractive ? 'button' : undefined}
                  onClick={isInteractive ? () => onRowClick(row) : undefined}
                  onKeyDown={isInteractive ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  } : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} data-label={column.label}>
                      {getCellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
