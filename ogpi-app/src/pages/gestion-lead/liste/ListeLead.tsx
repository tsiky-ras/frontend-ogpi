import React, { useEffect, useState } from 'react';
import Header from '../../../components/header/Header.tsx';
import Sidebar from '../../../components/sidebar/Sidebar.tsx';
import Title from '../../../components/title/Title.tsx';
import Button from '../../../components/button/Button.tsx';
import { FaPlus } from 'react-icons/fa';
import FilterBar from '../../../components/filters/FilterBar.tsx';
import Table from '../../../components/table/Table.tsx';
import StatCard from '../../../components/stat/StatCard.tsx';

import 'bootstrap/dist/css/bootstrap.min.css';
import './ListeLead.css';

/* ================= COMPONENT ================= */
const ListeLead: React.FC = () => {
  const [search, setSearch] = useState('');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'semester' | 'year'>('month');
  const [currency, setCurrency] = useState<'AR' | 'Euro' | '$'>('Euro');

  const [kpis, setKpis] = useState({
    activeOpportunitiesThisPeriod: 0,
    conversionRate: 0,
    caPipeline: 0,
    upcomingDeadlines: 0,
  });

  /* ================= UTILS ================= */
  const getCurrencySymbol = () => {
    switch (currency) {
      case 'AR':
        return 'Ar';
      case 'Euro':
        return '€';
      case '$':
        return '$';
      default:
        return '€';
    }
  };

  /* ================= EFFECT (MAQUETTE) ================= */
  useEffect(() => {
    // Maquette : données mockées
    const mockOpportunities: any[] = [];
    calculateKPIs(mockOpportunities);
  }, [period]);

  /* ================= KPI LOGIC ================= */
  const getPeriodDateRange = () => {
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'semester') {
      startDate = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    return { startDate, endDate: new Date() };
  };

  const calculateKPIs = (data: any[]) => {
    const { startDate, endDate } = getPeriodDateRange();

    const activeThisPeriod = data.filter(
      (opp) =>
        opp.updatedAt &&
        new Date(opp.updatedAt) >= startDate &&
        new Date(opp.updatedAt) <= endDate &&
        opp.status === 'active'
    ).length;

    const submitted = data.filter(
      (opp) =>
        opp.submittedAt &&
        new Date(opp.submittedAt) >= startDate &&
        new Date(opp.submittedAt) <= endDate &&
        opp.status === 'submitted'
    ).length;

    const won = data.filter(
      (opp) =>
        opp.wonAt &&
        new Date(opp.wonAt) >= startDate &&
        new Date(opp.wonAt) <= endDate &&
        opp.status === 'won'
    ).length;

    const conversionRate = submitted > 0 ? (won / submitted) * 100 : 0;

    const caPipeline = data
      .filter(
        (opp) =>
          opp.createdAt &&
          new Date(opp.createdAt) >= startDate &&
          new Date(opp.createdAt) <= endDate &&
          (opp.status === 'submitted' || opp.status === 'won')
      )
      .reduce((sum, opp) => sum + (opp.amount || 0), 0);

    const oneWeekLater = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = data.filter(
      (opp) =>
        opp.deadline &&
        new Date(opp.deadline) >= endDate &&
        new Date(opp.deadline) <= oneWeekLater
    ).length;

    setKpis({
      activeOpportunitiesThisPeriod: activeThisPeriod,
      conversionRate: Number(conversionRate.toFixed(2)),
      caPipeline,
      upcomingDeadlines,
    });
  };

  /* ================= TABLE ================= */
  const columns = [
    { key: 'name', label: 'Nom' },
    { key: 'company', label: 'Entreprise' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Téléphone' },
    {
      key: 'amount',
      label: 'Montant',
      render: (row: any) =>
        row.amount ? `${row.amount.toLocaleString()} ${getCurrencySymbol()}` : '-',
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row: any) => {
        const map: any = {
          active: ['bg-success', 'Actif'],
          submitted: ['bg-info', 'Soumis'],
          won: ['bg-success', 'Gagné'],
          lost: ['bg-danger', 'Perdu'],
        };
        const [cls, label] = map[row.status] || ['bg-secondary', 'Brouillon'];
        return <span className={`badge ${cls}`}>{label}</span>;
      },
    },
  ];

  /* ================= RENDER ================= */
  return (
    <div className="liste-lead-layout">
      <Header />
      <div className="liste-lead-wrapper">
        <aside className="liste-lead-sidebar">
          <Sidebar />
        </aside>

        <main className="liste-lead-main">
          <div className="container-fluid">
            {/* HEADER */}
            <div className="row align-items-center mb-4">
              <div className="col-lg-6 col-md-12 mb-3 mb-lg-0">
                <Title
                  title="Gestion des opportunités"
                  subtitle="Gérez vos opportunités commerciales"
                />
              </div>

              <div className="col-lg-6 col-md-12">
                <div className="d-flex flex-wrap align-items-center justify-content-lg-end gap-2 bg-light p-2 rounded">
                  <select
                    value={period}
                    onChange={(e) =>
                      setPeriod(e.target.value as 'week' | 'month' | 'semester' | 'year')
                    }
                    className="form-select form-select-sm"
                    style={{ width: '120px' }}
                  >
                    <option value="week">Semaine</option>
                    <option value="month">Mois</option>
                    <option value="semester">Semestre</option>
                    <option value="year">Année</option>
                  </select>

                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value as 'AR' | 'Euro' | '$')
                    }
                    className="form-select form-select-sm"
                    style={{ width: '120px' }}
                  >
                    <option value="Euro">Euro €</option>
                    <option value="$">Dollar $</option>
                  </select>

                  <Button label="Créer une opportunité" icon={<FaPlus />} onClick={() => {}} />
                </div>
              </div>
            </div>

            {/* KPI */}
            <div className="row mb-4">
              <div className="col-lg-3 col-md-6 mb-3">
                <StatCard
                  title="Opportunités actives"
                  value={kpis.activeOpportunitiesThisPeriod}
                  subtitle="Traitées cette période"
                  variant={['tomato', 'charcoal']}
                />
              </div>
              <div className="col-lg-3 col-md-6 mb-3">
                <StatCard
                  title="Taux de conversion"
                  value={`${kpis.conversionRate}%`}
                  subtitle="Soumises / Gagnées"
                  variant={['dim', 'linen']}
                />
              </div>
              <div className="col-lg-3 col-md-6 mb-3">
                <StatCard
                  title="Chiffre d'affaires Pipeline"
                  value={`${(kpis.caPipeline / 1000).toFixed(0)}k ${getCurrencySymbol()}`}
                  subtitle="Montant durant la période"
                  variant={['tuscan', 'linen']}
                />
              </div>
              <div className="col-lg-3 col-md-6 mb-3">
                <StatCard
                  title="Échéances proches"
                  value={kpis.upcomingDeadlines}
                  subtitle="Cette période"
                  variant={['charcoal', 'linen']}
                />
              </div>
            </div>

            <FilterBar
              filters={[{ type: 'text', placeholder: 'Rechercher...', onChange: setSearch }]}
            />

            <div className="table-responsive mt-3">
              <Table columns={columns} data={opportunities} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ListeLead;
