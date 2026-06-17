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
    <aside className="catalogue-budget-panel">
      <div className="catalogue-budget-panel__header">
        <h3>Simulation de budget</h3>
      </div>

      <div className="catalogue-budget-panel__content">
        <div className="catalogue-budget-panel__row">
          <span>Articles sélectionnés</span>
          <strong>{selectedCount}</strong>
        </div>

        <div className="catalogue-budget-panel__row">
          <span>Estimation min</span>
          <strong>{formatCurrency(budgetSummary.min)}</strong>
        </div>

        <div className="catalogue-budget-panel__row">
          <span>Estimation max</span>
          <strong>{formatCurrency(budgetSummary.max)}</strong>
        </div>

        <div className="catalogue-budget-panel__group">
          <label htmlFor="catalogue-budget-target">Budget cible</label>
          <input
            id="catalogue-budget-target"
            type="text"
            inputMode="numeric"
            value={formatBudgetInputValue(budgetTarget)}
            onChange={(event) => onBudgetChange(normalizeBudgetInput(event.target.value))}
            placeholder="Ex. 1 000 000"
          />
        </div>

        {validationError && (
          <div className="catalogue-budget-panel__error">{validationError}</div>
        )}

        <button type="button" className="btn btn--primary catalogue-budget-panel__validate" onClick={onValidate}>
          Valider la simulation
        </button>
      </div>
    </aside>
  );
}
