import { Alert, Button, Icon } from '../../../components/ui';
import './simulBudget.css';

export default function SimulBudget({
  budgetTarget,
  budgetSummary,
  selectedCount,
  validationError,
  formatCurrency,
  formatBudgetInputValue,
  normalizeBudgetInput,
  onBudgetChange,
  onValidate,
}) {
  return (
    <aside className="catalogue-budget-panel" aria-label="Simulation budget live">
      <div className="catalogue-budget-card">
        <span className="catalogue-eyebrow">Simulation budget live</span>
        <h2>Budget</h2>

        <label className="catalogue-budget-field">
          Budget cible
          <input
            type="text"
            inputMode="numeric"
            value={formatBudgetInputValue(budgetTarget)}
            placeholder="Définir le budget"
            onChange={(event) => onBudgetChange(normalizeBudgetInput(event.target.value))}
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

        {validationError && (
          <Alert variant="danger" className="catalogue-summary-error">{validationError}</Alert>
        )}

        <Button
          type="button"
          variant="success"
          fullWidth
          icon={<Icon name="Check" size="sm" />}
          onClick={onValidate}
          disabled={selectedCount === 0}
        >
          Valider
        </Button>
      </div>
    </aside>
  );
}
