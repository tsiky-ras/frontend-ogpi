import React, { useEffect, useState } from 'react';
import Header from '../../../../components/header/Header.tsx';
import Sidebar from '../../../../components/sidebar/Sidebar.tsx';
import Title from '../../../../components/title/Title.tsx';
import Button from '../../../../components/button/Button.tsx';
import { FaPlus } from 'react-icons/fa';
import FilterBar from '../../../../components/filters/FilterBar.tsx';
import Table from '../../../../components/table/Table.tsx';
import StatCard from '../../../../components/stat/StatCard.tsx';
import FormLead from '../form/FormLead.tsx';
import DetailsLead from '../details/DetailsLead.tsx';
import MenuListeLead from '../menu/MenuListeLead.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ListeLead.css';
import { LeadService } from '../../../../services/lead/LeadService.tsx';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { Lead } from '../../../../types/lead/Lead.tsx';

/* ================= COMPONENT ================= */
const ListeLead: React.FC = () => {
  const { api } = useAuth();
  const [search, setSearch] = useState('');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'semester' | 'year'>('month');
  const [currency, setCurrency] = useState<'AR' | 'Euro' | '$'>('Euro');
  const [showFormLead, setShowFormLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDetailLead, setShowDetailLead] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const leadService = new LeadService(api);
  
  const [kpis, setKpis] = useState({
    activeOpportunitiesThisPeriod: 0,
    conversionRate: 0,
    caPipeline: 0,
    upcomingDeadlines: 0,
  });

  const loadLeads = async () => {
  try {
    const data = await leadService.getAll();

    const leadsData: Lead[] = data.map((lead: any) => ({
      id: lead.leadId,
      name: lead.leadName,
      reference: lead.leadRef,
      bu: lead.businessUnit,
      typeFinancement: lead.typeProjetFinancement,
      description: lead.leadDescription,
      periode: lead.leadPeriode,
      internalDeadline: lead.leadInternalDeadLine,
      realDeadline: lead.leadRealDeadLine,
      projetFinancement: lead.typeProjetFinancement,
      commentaire: lead.leadCommentaire,
      zone: lead.leadZone === 0 ? "Local" : "OffShore",
      jiraProject: lead.leadGoProjetJira,
      jiraTicket: lead.leadGoTicketJira,
      driveFolder: lead.driveFolder || undefined,
      driveFile: lead.mainDriveFile || undefined,
      client: lead.client,
      type: lead.leadType,
      category: lead.category,
      secteur: lead.leadSecteur,
      status: lead.currentLeadStatus?.leadStatus || { id: 0, label: 'Brouillon', order: 0 },
      partenaires: lead.leadPartenaires?.map((p: any) => p.partenaire) || [],
    }));

    setOpportunities(leadsData);
    calculateKPIs(leadsData);
  } catch (error) {
    console.error("Erreur chargement leads", error);
  }
};

useEffect(() => {
  loadLeads();
}, [period]);

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
    {
      key: 'periode',
      label: 'Période',
      render: (row: Lead) =>
        row.periode
          ? new Date(row.periode).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
          : '-',
    },
    {
      key: 'businessUnit',
      label: 'Business Unit',
      render: (row: Lead) => row.bu?.name || '-',
    },
    { key: 'name', label: 'Nom' },
    { key: 'reference', label: 'Référence' },
    { key: 'client', label: 'Entreprise', render: (row: Lead) => row.client?.name || '-' },
    { key: 'type', label: 'Type', render: (row: Lead) => row.type?.label || '-' },
    { key: 'category', label: 'Catégorie', render: (row: Lead) => row.category?.label || '-' },
    { key: 'secteur', label: 'Secteur', render: (row: Lead) => row.secteur?.label || '-' },
    {
      key: 'realDeadline',
      label: 'Date de soumission',
      render: (row: Lead) => row.realDeadline ? new Date(row.realDeadline).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'internalDeadline',
      label: 'Deadline interne',
      render: (row: Lead) => row.internalDeadline ? new Date(row.internalDeadline).toLocaleDateString('fr-FR') : '-',
    },
    { key: 'projetFinancement', label: 'Type de financement', render: (row: Lead) => row.typeFinancement?.label || '-' },
    { key: 'commentaire', label: 'Commentaire', render: (row: Lead) => row.commentaire || '-' },
    { key: 'zone', label: 'Zone', render: (row: Lead) => row.zone != null ? row.zone : '-' },
    {
      key: 'partenaires',
      label: 'Partenaires',
      render: (row: Lead) =>
        row.partenaires?.length > 0 ? row.partenaires.map(p => p.name).join(', ') : '-',
    },
    {
      key: 'Répértoire drive',
      label: 'Répértoire',
      render: (row: Lead) =>
        row.driveFolder?.link
          ? <a href={row.driveFolder.link} target="_blank" rel="noopener noreferrer">
              Répértoire | {row.name}
            </a>
          : '-',
    },
    {
      key: 'Fichier drive',
      label: 'TDR',
      render: (row: Lead) =>
        row.driveFile?.link
          ? <a href={row.driveFile.link} target="_blank" rel="noopener noreferrer">
              TDR | {row.name}
            </a>
          : '-',
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row: Lead) => {
        const map: any = {
          'No Go': ['bg-danger', 'No Go'],
          'Go': ['bg-success', 'Go'],
          'Brouillon': ['bg-secondary', 'Brouillon'],
        };
        const [cls, label] = map[row.status.label] || ['bg-secondary', 'Brouillon'];
        return <span className={`badge ${cls}`}>{label}</span>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Lead) => (
        <MenuListeLead
          onDetails={async () => {
            if (!row.id) return;

            try {
              const fullLead = await leadService.getById(row.id);
              console.log('Lead complet récupéré :', fullLead);
              const safeLead = {
                ...fullLead,
                status: fullLead.status?.label ? { label: fullLead.status.label } : { label: "Brouillon" },
                type: fullLead.type?.label ? { label: fullLead.type.label } : null,
                category: fullLead.category?.label ? { label: fullLead.category.label } : null,
                secteur: fullLead.secteur?.label ? { label: fullLead.secteur.label } : null,
                bu: fullLead.bu?.name ? { name: fullLead.bu.name } : null,
                client: fullLead.client? {
                    id: fullLead.client.id,
                    name: fullLead.client.name,
                    email: fullLead.client.email,
                    phone: fullLead.client.phone,
                  }
                : null,
                partenaires: fullLead.partenaires?.map((p: any) => ({ name: p.name })) || [],
              };

              setSelectedLead(safeLead);
              setShowDetailLead(true);

              setShowDetailLead(true);
            } catch (error) {
              console.error('Erreur lors de la récupération du lead:', error);
            }
          }}
          onEdit={async () => {
            if (!row.id) return;

            try {
              const fullLead = await leadService.getById(row.id);
              setSelectedLead(fullLead);  
              setShowFormLead(true);
            } catch (error) {
              console.error("Erreur chargement lead pour édition", error);
            }
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

                  {/* Bouton créer lead */}
                  <Button
                    label="Créer une opportunité"
                    icon={<FaPlus />}
                    onClick={() => {
                      setSelectedLead(null); 
                      setShowFormLead(true);
                    }}
                  />                
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
              />
            </div>
          </div>
        </main>
      </div>

        {/* Formulaire Lead */}
        <FormLead
          show={showFormLead}
          onClose={() => {
            setShowFormLead(false);
            setSelectedLead(null); 
          }}
          lead={selectedLead} 
          onSubmit={async () => {
            await loadLeads();
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
