import {  Button, Icon } from './ui';
import './simulBudget.css';

export default function SimulBudget({
  budgetTarget,
  budgetSummary,
  selectedCount,
  formatCurrency,
  formatBudgetInputValue,
  normalizeBudgetInput,
  onBudgetChange,
  onValidate,
  onInteract,
  onMinimize,
  isValidating = false,
  isLocked = false,
}) {
  return (
    <aside className="catalogue-budget-panel catalogue-budget-panel--expanded" aria-label="Simulation budget live">
      <div className="catalogue-budget-card">
        {onMinimize && <div className="catalogue-budget-panel__toolbar">
          <button
            type="button"
            className="catalogue-panel-minimize"
            aria-label="Réduire la simulation budget"
            onClick={onMinimize}
          >
            <Icon name="ChevronRight" size="sm" />
          </button>
        </div>}
        <h2>Budget</h2>

        <label className="catalogue-budget-field">
          Budget cible
          <input
            type="text"
            inputMode="numeric"
            value={formatBudgetInputValue(budgetTarget)}
            placeholder="Définir le budget"
            required
            onChange={(event) => {
              onInteract?.();
              onBudgetChange(normalizeBudgetInput(event.target.value));
            }}
          />
        </label>

        <dl className="catalogue-budget-list">
          <div>
            <dt>Estimation min</dt>
            <dd>{formatCurrency(budgetSummary.min)}</dd>
          </div>
          <div>
            <dt>Estimation max</dt>
            <dd>{formatCurrency(budgetSummary.max)}</dd>
          </div>
          <div className={budgetSummary.overage > 0 ? 'is-over' : 'is-ok'}>
            <dt>Dépassement éventuel</dt>
            <dd>
              {!budgetSummary.hasTarget
                ? 'Budget à définir'
                : budgetSummary.overage > 0
                  ? formatCurrency(budgetSummary.overage)
                  : 'Aucun'}
            </dd>
          </div>
        </dl>

        <p>
          {selectedCount === 0
            ? 'Ajoutez des articles pour lancer la simulation.'
            : `${selectedCount} article(s) ajouté(s) au panier budget.`}
        </p>


        {isLocked ? (
          <p className="catalogue-budget-locked-notice" role="status" aria-live="polite">
            <Icon name="Lock" size="sm" />
            Projet traité — aucune modification possible
          </p>
        ) : (
          <Button
            type="button"
            variant="success"
            fullWidth
            icon={<Icon name="ReceiptLong" size="sm" />}
            onClick={() => {
              onInteract?.();
              onValidate();
            }}
            disabled={selectedCount === 0}
            isLoading={isValidating}
          >
            Exporter la simulation
          </Button>
        )}
      </div>
    </aside>
  );
}
