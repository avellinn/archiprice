import Button from './Button';
import Icon from './Icon';
import { Alert } from './ui';
import './recap.css';

export default function Recap({
  selectedProducts,
  budgetSummary,
  generatedAt,
  reference,
  validationError,
  isValidating,
  formatCurrency,
  formatOptionalCurrency,
  onClose,
  onModify,
  onConfirm,
}) {
  return (
    <section className="catalogue-summary-panel" aria-label="Récapitulatif des articles">
      <div className="catalogue-summary-card">
        <header className="catalogue-summary-header">
          <span className="catalogue-summary-folder" aria-hidden="true">
            <Icon name="Folder" size="sm" />
          </span>
          <h2>Récapitulatif</h2>
          <button type="button" aria-label="Fermer le récapitulatif" onClick={onClose}>
            <Icon name="Close" size="sm" />
          </button>
        </header>

        <div className="catalogue-summary-body">
          <h3>
            <Icon name="ArrowUp" size="sm" />
            Informations Générales
          </h3>

          <div className="catalogue-summary-info-grid">
            <div>
              <span>Budget cible</span>
              <strong>{formatOptionalCurrency(budgetSummary.target)}</strong>
            </div>
            <div>
              <span>Articles choisis</span>
              <strong>{selectedProducts.length}</strong>
            </div>
            <div>
              <span>Boutiques</span>
              <strong>{new Set(selectedProducts.map((product) => product.shop)).size}</strong>
            </div>
            <div>
              <span>Statut</span>
              <strong>{!budgetSummary.hasTarget ? 'A definir' : budgetSummary.overage > 0 ? 'Depassement' : 'Controle'}</strong>
            </div>
          </div>

          <div className="catalogue-summary-tags">
            {selectedProducts.slice(0, 4).map((product, index) => (
              <span key={`${product.id || product.name}-${index}`}>{product.name}</span>
            ))}
          </div>

          <h3>
            <Icon name="Info" size="sm" />
            Volumes budget (FCFA)
          </h3>

          <div className="catalogue-summary-volume">
            <div>
              <span>Constaté min</span>
              <strong>{formatCurrency(budgetSummary.min)}</strong>
            </div>
            <div>
              <span>Ecart</span>
              <strong className={budgetSummary.overage > 0 ? 'is-danger' : ''}>
                {budgetSummary.hasTarget ? formatCurrency(budgetSummary.overage) : 'A definir'}
              </strong>
            </div>
            <div>
              <span>Accordé max</span>
              <strong>{formatCurrency(budgetSummary.max)}</strong>
            </div>
          </div>

          <p className="catalogue-summary-valid">
            <Icon name="CheckCircle" size="sm" />
            Volume accordé : estimation calculée sur les articles sélectionnés
          </p>

          <h3>
            <Icon name="ReceiptLong" size="sm" />
            Calcul Fiscal
          </h3>

          <div className={budgetSummary.overage > 0 || !budgetSummary.hasTarget ? 'catalogue-summary-alert' : 'catalogue-summary-alert is-exempt'}>
            <strong>{!budgetSummary.hasTarget ? 'BUDGET A DEFINIR' : budgetSummary.overage > 0 ? 'A DOSSIER A AJUSTER' : 'DOSSIER CONTROLE'}</strong>
            <span>
              {!budgetSummary.hasTarget
                ? 'Le budget cible doit être renseigné par l’utilisateur avant validation.'
                : budgetSummary.overage > 0
                  ? 'Le montant maximal dépasse le budget cible. Révisez les articles ou ajustez le budget.'
                  : 'Ce panier reste conforme au budget cible défini pour le projet.'}
            </span>
          </div>

          <div className="catalogue-summary-total">
            <span>Montant total à payer</span>
            <strong>{budgetSummary.overage > 0 ? formatCurrency(budgetSummary.max) : budgetSummary.hasTarget ? 'EXONERE' : 'EN ATTENTE'}</strong>
            <small>{budgetSummary.overage > 0 ? 'Dépassement potentiel inclus' : budgetSummary.hasTarget ? 'Exonération légale' : 'Budget utilisateur requis'}</small>
          </div>
        </div>

        <footer className="catalogue-summary-footer">
          <span>Généré le {generatedAt}</span>
          <span>Réf. Dossier : #{reference}</span>
          <div>
            <Button
              type="button"
              variant="outline"
              icon={<Icon name="ArrowLeft" size="sm" />}
              onClick={onModify}
              disabled={isValidating}
            >
              Modifier
            </Button>
            <Button
              type="button"
              variant="success"
              icon={<Icon name="Check" size="sm" />}
              onClick={onConfirm}
              disabled={!budgetSummary.hasTarget || isValidating}
              isLoading={isValidating}
            >
              Confirmer la Validation
            </Button>
          </div>
          {validationError && <Alert variant="danger" className="catalogue-summary-error">{validationError}</Alert>}
        </footer>
      </div>
    </section>
  );
}
