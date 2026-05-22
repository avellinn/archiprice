import EmptyState from './EmptyState';
import './ui.css';

export default function DataTable({
  columns,
  rows,
  emptyLabel = 'Aucune donnée disponible.',
  className = '',
  tableClassName = '',
}) {
  return (
    <section className={['ui-table-card', 'admin-table-card', className].filter(Boolean).join(' ')}>
      {rows.length === 0 ? (
        <EmptyState title={emptyLabel} />
      ) : (
        <div className="ui-table-wrap admin-table-wrap">
          <table className={['ui-data-table', 'admin-data-table', tableClassName].filter(Boolean).join(' ')}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
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
