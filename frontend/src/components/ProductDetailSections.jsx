import Icon from './Icon';
import { getProductDetailSections } from '../utils/productPresentation';

export default function ProductDetailSections({ product, language = 'fr' }) {
  const sections = getProductDetailSections(product, language);
  return (
    <section className="product-sheet-info">
      {sections.map((section) => (
        <details key={section.id} open>
          <summary>{section.title}<Icon name="ChevronDown" size="sm" /></summary>
          <div>
            {section.rows.map(([label, value]) => (
              <span key={`${section.id}-${label}`}><b>{label}:</b> {value}</span>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
