import './Paramètres.css';
import { useState } from 'react';
import { Button, Icon } from '../../../components/ui';
import { createAdminId, useAdminData } from '../../../services/adminData';

export default function Paramètres() {
  const [adminData, setAdminData] = useAdminData();
  const [activeCity, setActiveCity] = useState(adminData.regionalCoefficients[0]);
  const [simulationConfig, setSimulationConfig] = useState(adminData.settings);

  function handleConfigChange(field, value) {
    setSimulationConfig((currentConfig) => ({
      ...currentConfig,
      [field]: value,
    }));
  }

  function saveSettings() {
    setAdminData((currentData) => ({
      ...currentData,
      settings: simulationConfig,
    }));
  }

  function saveCity() {
    setAdminData((currentData) => {
      const city = {
        ...activeCity,
        id: activeCity.id || createAdminId('city'),
      };
      const exists = currentData.regionalCoefficients.some((item) => item.id === city.id);

      return {
        ...currentData,
        regionalCoefficients: exists
          ? currentData.regionalCoefficients.map((item) => (item.id === city.id ? city : item))
          : [city, ...currentData.regionalCoefficients],
      };
    });
  }

  function deleteCity(cityId) {
    setAdminData((currentData) => ({
      ...currentData,
      regionalCoefficients: currentData.regionalCoefficients.filter((item) => item.id !== cityId),
    }));
  }

  return (
    <div className="admin-settings-page">
      <section className="admin-settings-config-card">
        <span className="admin-settings-eyebrow">Réglages</span>
        <h1>Configuration simulations</h1>

        <form className="admin-settings-form">
          <label>
            <span>Marge par défaut (%)</span>
            <input
              type="number"
              value={simulationConfig.margin}
              onChange={(event) => handleConfigChange('margin', event.target.value)}
            />
          </label>

          <label>
            <span>TVA (%)</span>
            <input
              type="number"
              value={simulationConfig.vat}
              onChange={(event) => handleConfigChange('vat', event.target.value)}
            />
          </label>

          <label>
            <span>Arrondi</span>
            <select
              value={simulationConfig.rounding}
              onChange={(event) => handleConfigChange('rounding', event.target.value)}
            >
              <option>Au centime près</option>
              <option>À l'euro près</option>
              <option>Sans arrondi</option>
            </select>
          </label>

          <label>
            <span>Devise</span>
            <select
              value={simulationConfig.currency}
              onChange={(event) => handleConfigChange('currency', event.target.value)}
            >
              <option>FCFA</option>
              <option>EUR</option>
              <option>USD</option>
            </select>
          </label>

          <Button type="button" fullWidth onClick={saveSettings}>
            Enregistrer
          </Button>

          <small>Ces paramètres s'appliquent uniquement aux nouvelles simulations.</small>
        </form>
      </section>

      <section className="admin-settings-coefficients">
        <div className="admin-settings-coefficients__table-card">
          <h2>Coefficients régionaux</h2>

          <table className="admin-settings-coefficients__table">
            <thead>
              <tr>
                <th>Ville</th>
                <th>Coefficient</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminData.regionalCoefficients.map((item, index) => (
                <tr key={`${item.id || item.city}-${index}`} className={activeCity.city === item.city ? 'is-selected' : ''}>
                  <td>{item.city}</td>
                  <td>{item.coefficient}</td>
                  <td>
                    <div className="admin-settings-coefficients__actions">
                      <button type="button" aria-label={`Modifier ${item.city}`} onClick={() => setActiveCity(item)}>
                        <Icon name="Edit" size="sm" />
                      </button>
                      <button type="button" className="is-danger" aria-label={`Supprimer ${item.city}`} onClick={() => deleteCity(item.id)}>
                        <Icon name="Delete" size="sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="admin-settings-city-card">
          <div className="admin-settings-city-card__header">
            <h2>Ajouter / Modifier une ville</h2>
            <button type="button" aria-label="Fermer le formulaire">
              <Icon name="Close" size="sm" />
            </button>
          </div>

          <form className="admin-settings-city-form">
            <label>
              <span>Ville <b>*</b></span>
              <input type="text" value={activeCity.city} onChange={(event) => setActiveCity({
                ...activeCity,
                city: event.target.value,
              })}
              />
            </label>

            <label>
              <span>Coefficient <b>*</b></span>
              <input type="text" value={activeCity.coefficient} onChange={(event) => setActiveCity({
                ...activeCity,
                coefficient: event.target.value,
              })}
              />
              <small>Entre 0,50 et 3,00</small>
            </label>

            <div className="admin-settings-city-form__actions">
              <Button type="button" variant="outline">
                Annuler
              </Button>
              <Button type="button" onClick={saveCity}>
                Enregistrer
              </Button>
            </div>
          </form>
        </aside>
      </section>
    </div>
  );
}
