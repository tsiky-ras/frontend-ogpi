import React, { useEffect, useState } from 'react';
import Header from '../../../components/header/Header.tsx';
import Sidebar from '../../../components/sidebar/Sidebar.tsx';
import Title from '../../../components/title/Title.tsx';
import Button from '../../../components/button/Button.tsx';
import { FaPlus } from 'react-icons/fa';
import FilterBar from '../../../components/filters/FilterBar.tsx';
import Table from '../../../components/table/Table.tsx';
import StatCard from '../../../components/stat/StatCard.tsx';
import FormLead from '../form/FormLead.tsx';
import DetailsLead from '../details/DetailsLead.tsx';
import MenuListeLead from '../menu/MenuListeLead.tsx';

import 'bootstrap/dist/css/bootstrap.min.css';
import './ListeLead.css';

/* ================= COMPONENT ================= */
const ListeLead: React.FC = () => {
  const [search, setSearch] = useState('');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'semester' | 'year'>('month');
  const [currency, setCurrency] = useState<'AR' | 'Euro' | '$'>('Euro');
  const [showFormLead, setShowFormLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDetailLead, setShowDetailLead] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const [kpis, setKpis] = useState({
    activeOpportunitiesThisPeriod: 0,
    conversionRate: 0,
    caPipeline: 0,
    upcomingDeadlines: 0,
  });

  /* ================= MOCK DATA ================= */
  useEffect(() => {
    const mockOpportunities = [
      {
        id: 1,
        name: 'Plateforme E-commerce',
        reference: 'OPP-2024-001',
        company: 'Tech Solutions',
        email: 'contact@techsolutions.com',
        phone: '+261 34 12 345 67',
        description: 'Développement plateforme e-commerce pour le retail',
        amount: 45000,
        currency: 'EUR',
        status: 'active',
        type: 'Fixe',
        category: 'Digital',
        sector: 'Retail',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        name: 'Migration Cloud AWS',
        reference: 'OPP-2024-002',
        company: 'DataFlow Inc',
        email: 'projects@dataflow.com',
        phone: '+261 32 98 765 43',
        description: 'Migration infrastructure on-premise vers AWS',
        amount: 75000,
        currency: 'EUR',
        status: 'submitted',
        type: 'Variable',
        category: 'Infrastructure',
        sector: 'Finance',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        name: 'Application Mobile Banking',
        reference: 'OPP-2024-003',
        company: 'FinTech Corp',
        email: 'dev@fintechcorp.com',
        phone: '+261 33 45 678 90',
        description: 'Développement application mobile pour services bancaires',
        amount: 120000,
        currency: 'USD',
        status: 'won',
        type: 'Fixe',
        category: 'Digital',
        sector: 'Finance',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 4,
        name: 'Audit Sécurité IT',
        reference: 'OPP-2024-004',
        company: 'SecureNet',
        email: 'audit@securenet.com',
        phone: '+261 34 56 789 01',
        description: 'Audit complet infrastructure sécurité informatique',
        amount: 25000,
        currency: 'EUR',
        status: 'active',
        type: 'Fixe',
        category: 'Consulting',
        sector: 'Healthcare',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 5,
        name: 'Système de Gestion RH',
        reference: 'OPP-2024-005',
        company: 'HRFlow Solutions',
        email: 'projects@hrflow.mg',
        phone: '+261 32 12 345 67',
        description: 'Implémentation système gestion ressources humaines',
        amount: 55000,
        currency: 'USD',
        status: 'submitted',
        type: 'Variable',
        category: 'Digital',
        sector: 'Services',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    setOpportunities(mockOpportunities);
    calculateKPIs(mockOpportunities);
  }, [period]);

  /* ================= KPI LOGIC ================= */
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
    { key: 'reference', label: 'Référence' },
    { key: 'company', label: 'Entreprise' },
    {
      key: 'amount',
      label: 'Montant',
      render: (row: any) =>
        row.amount ? `${row.amount.toLocaleString()} ${row.currency || getCurrencySymbol()}` : '-',
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
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <MenuListeLead
          onDetails={() => {
            setSelectedLead(row);
            setShowDetailLead(true);
          }}
          onEdit={() => {
            setSelectedLead(row);
            setShowFormLead(true);
          }}
        />
      ),
    },
  ];

  const renderExpandedRow = (row: any) => (
    <div className="expanded-row-content p-4 bg-light">
      <div className="row g-3">
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Description</label>
            <p className="expanded-text">{row.description || '-'}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Email</label>
            <p className="expanded-text">
              {row.email ? <a href={`mailto:${row.email}`}>{row.email}</a> : '-'}
            </p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Téléphone</label>
            <p className="expanded-text">
              {row.phone ? <a href={`tel:${row.phone}`}>{row.phone}</a> : '-'}
            </p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Type</label>
            <p className="expanded-text">{row.type || '-'}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Catégorie</label>
            <p className="expanded-text">{row.category || '-'}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Secteur</label>
            <p className="expanded-text">{row.sector || '-'}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Date création</label>
            <p className="expanded-text">{new Date(row.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Deadline</label>
            <p className="expanded-text expanded-deadline">{new Date(row.deadline).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>
    </div>
  );

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

                  <Button label="Créer une opportunité" icon={<FaPlus />} onClick={() => setShowFormLead(true)} />
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
              <Table
                columns={columns}
                data={opportunities}
                expandedRowId={expandedRowId}
                expandedRow={renderExpandedRow}
                onRowClick={(row) => setExpandedRowId(expandedRowId === row.id ? null : row.id)}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Formulaire Lead */}
      <FormLead
        show={showFormLead}
        onClose={() => setShowFormLead(false)}
        lead={selectedLead}
        onSubmit={() => {
          // Recharger les opportunités
          setShowFormLead(false);
          setSelectedLead(null);
        }}
      />

      {/* Détails Lead */}
      <DetailsLead
        show={showDetailLead}
        onClose={() => setShowDetailLead(false)}
        lead={selectedLead}
      />
    </div>
  );
};

export default ListeLead;
