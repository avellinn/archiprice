import { useMemo } from 'react';
import { useAdminData } from '../../services/adminData';
import { Badge, DataTable, PageShell, StatGrid } from './PageShell';

export default function Dashboard() {
  const [adminData] = useAdminData();

  const stats = useMemo(() => [
    {
      label: 'Produits catalogue',
      value: adminData.products.length,
      detail: `${adminData.products.filter((product) => product.availability === 'Disponible').length} disponibles`,
      tone: 'blue',
    },
    {
      label: 'Fournisseurs',
      value: adminData.suppliers.length,
      detail: `${adminData.suppliers.filter((supplier) => supplier.status === 'Actif').length} actifs`,
      tone: 'orange',
    },
    {
      label: 'Simulations',
      value: adminData.simulations.length,
      detail: `${adminData.simulations.filter((simulation) => simulation.status === 'Succès').length} réussies`,
      tone: 'green',
    },
    {
      label: 'Support',
      value: adminData.supportItems.length,
      detail: `${adminData.supportItems.filter((item) => item.status === 'Ouvert').length} ouverts`,
      tone: 'red',
    },
  ], [adminData]);

  const rows = useMemo(() => [
    ...adminData.products.slice(0, 2).map((product) => ({
      id: `product-${product.id}`,
      event: `Produit: ${product.name}`,
      owner: 'Catalogue',
      status: product.availability,
      date: product.city || '-',
    })),
    ...adminData.simulations.slice(0, 2).map((simulation) => ({
      id: `simulation-${simulation.id}`,
      event: `Simulation: ${simulation.user}`,
      owner: 'Simulations',
      status: simulation.status,
      date: simulation.date,
    })),
    ...adminData.supportItems.slice(0, 2).map((item) => ({
      id: `support-${item.id}`,
      event: item.subject,
      owner: 'Support',
      status: item.status,
      date: item.date,
    })),
  ], [adminData.products, adminData.simulations, adminData.supportItems]);

  const columns = [
    { key: 'event', label: 'Activité' },
    { key: 'owner', label: 'Module' },
    {
      key: 'status',
      label: 'Statut',
      render: (row) => <Badge tone={row.status === 'Ouvert' || row.status === 'Rupture' ? 'warning' : 'success'}>{row.status}</Badge>,
    },
    { key: 'date', label: 'Date' },
  ];

  return (
    <PageShell
      title="Tableau de bord"
      description="Vue globale dynamique des opérations backoffice et des alertes à traiter."
    >
      <StatGrid items={stats} />
      <DataTable columns={columns} rows={rows} />
    </PageShell>
  );
}
