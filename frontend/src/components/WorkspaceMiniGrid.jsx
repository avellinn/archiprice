import './WorkspaceMiniGrid.css';

export default function WorkspaceMiniGrid({
  cards,
  activeCardId,
  getMetric,
  onCardClick,
}) {
  return (
    <div className="workspace-mini-grid" aria-label="Raccourcis de l'espace de travail">
      {cards.map((card) => {
        const metric = getMetric(card);

        return (
          <button
            type="button"
            key={card.id}
            className={[
              'workspace-mini-card',
              `workspace-mini-card--${card.tone}`,
              activeCardId === card.id ? 'workspace-mini-card--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onCardClick(card)}
          >
            <span className="workspace-mini-card__title">{card.title}</span>
            <strong className="workspace-mini-card__value">{metric.value}</strong>
            <span className="workspace-mini-card__trend">{metric.trend}</span>
          </button>
        );
      })}
    </div>
  );
}
