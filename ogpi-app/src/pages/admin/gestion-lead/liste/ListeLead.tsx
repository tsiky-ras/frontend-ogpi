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
import BacklogModal from '../backlog/BacklogModal.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ListeLead.css';
import { LeadService } from '../../../../services/lead/LeadService.tsx';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { Lead } from '../../../../types/lead/Lead.tsx';
import { BacklogService } from "../../../../services/lead/backlog/BacklogService.tsx";
import { useLeadTechFinDetailsService } from '../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx';
import { useSearchParams } from 'react-router-dom';

/* ================= COMPONENT ================= */
const ListeLead: React.FC = () => {
  const { user, api } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [search, setSearch] = useState('');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'semester' | 'year'>('month');
  const [currency, setCurrency] = useState<'AR' | 'Euro' | '$'>('Euro');
  const [showFormLead, setShowFormLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDetailLead, setShowDetailLead] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialStep, setInitialStep] = useState<string>('qualification');
  const [hardFilterIds, setHardFilterIds] = useState<number[]>([]);
  
  const leadService = new LeadService(api);
  const leadTechFinService = useLeadTechFinDetailsService();

  // States pour le backlog
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [selectedLeadName, setSelectedLeadName] = useState<string>('');
  const [selectedLeadIdForBacklog, setSelectedLeadIdForBacklog] = useState<number | null>(null);
  
  const backlogService = new BacklogService(api);

  const [kpis, setKpis] = useState({
    activeOpportunitiesThisPeriod: 0,
    conversionRate: 0,
    caPipeline: 0,
    upcomingDeadlines: 0,
  });
  
  const DEFAULT_VISIBLE_COLUMNS = ['name', 'status', 'actions'];

  // Fonction pour parser le paramètre hardFilter de l'URL
  const parseHardFilterFromURL = (): number[] => {
    const hardFilterParam = searchParams.get("hardFilter");
    
    if (!hardFilterParam || hardFilterParam.trim() === "") {
      return [];
    }
    
    const ids = hardFilterParam.split(",")
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id) && id > 0);
    
    // Log pour le debug
    if (ids.length > 0) {
      console.log(`Filtre URL détecté: ${hardFilterParam} -> IDs: ${ids.join(', ')}`);
    }
    
    return ids;
  };

  // Mettre à jour le filtre quand l'URL change
  useEffect(() => {
    const ids = parseHardFilterFromURL();
    setHardFilterIds(ids);
  }, [searchParams]);

  const isFilterEnabled = hardFilterIds.length > 0;

  // Fonction pour appliquer le filtre dur sur les données
  const applyHardFilter = (leadsData: Lead[]): Lead[] => {
    if (!isFilterEnabled) {
      return leadsData; // Retourne tous les leads si aucun filtre n'est défini
    }
    
    const filteredLeads = leadsData.filter(lead => hardFilterIds.includes(lead.id));
    
    // Log pour le debug (optionnel)
    console.log(`Filtre dur appliqué: ${hardFilterIds.join(', ')}`);
    console.log(`Leads trouvés: ${filteredLeads.length} sur ${leadsData.length} total`);
    
    // Afficher un avertissement si certains IDs ne sont pas trouvés
    const foundIds = filteredLeads.map(lead => lead.id);
    const missingIds = hardFilterIds.filter(id => !foundIds.includes(id));
    if (missingIds.length > 0) {
      console.warn(`IDs non trouvés: ${missingIds.join(', ')}`);
    }
    
    return filteredLeads;
  };

  // Fonction pour ouvrir le formulaire d'édition d'un lead avec step optionnel
  const openLeadForm = async (leadId: number, step?: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const completeLead = await loadFullLeadDetails(leadId);
      setSelectedLead(completeLead);
      setInitialStep(step || 'qualification');
      setShowFormLead(true);
      
      // Mettre à jour l'URL avec editLead et step
      const params: any = { editLead: leadId.toString() };
      if (step) {
        params.step = step;
      }
      // Conserver le hardFilter si présent
      const currentHardFilter = searchParams.get("hardFilter");
      if (currentHardFilter) {
        params.hardFilter = currentHardFilter;
      }
      setSearchParams(params);
    } catch (error) {
      console.error("Erreur lors de l'ouverture du formulaire:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour ouvrir les détails (visualisation)
  const openLeadDetails = async (leadId: number) => {
    try {
      const completeLead = await loadFullLeadDetails(leadId);
      setSelectedLead(completeLead);
      setShowDetailLead(true);
    } catch (error) {
      console.error("Erreur lors de l'ouverture des détails:", error);
    }
  };

  // Fonction pour fermer le formulaire
  const closeLeadForm = () => {
    setShowFormLead(false);
    setSelectedLead(null);
    setInitialStep('qualification');
    // Supprimer les paramètres editLead et step de l'URL, mais garder hardFilter
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('editLead');
    newParams.delete('step');
    setSearchParams(newParams);
  };

  // Fonction pour fermer les détails
  const closeLeadDetails = () => {
    setShowDetailLead(false);
    setSelectedLead(null);
  };

  // Fonction pour ouvrir le backlog
  const openBacklog = (leadId: number, leadName: string) => {
    setSelectedLeadIdForBacklog(leadId);
    setSelectedLeadName(leadName);
    setShowBacklogModal(true);
  };

  // Fonction pour fermer le backlog
  const closeBacklog = () => {
    setShowBacklogModal(false);
    setSelectedLeadIdForBacklog(null);
    setSelectedLeadName('');
  };

  // Effet pour gérer l'ouverture du formulaire via URL
  useEffect(() => {
    const editLeadId = searchParams.get("editLead");
    const step = searchParams.get("step");
    
    if (editLeadId && !showFormLead && !selectedLead && !isLoading) {
      const leadId = parseInt(editLeadId, 10);
      
      if (!isNaN(leadId) && leadId > 0) {
        // Vérifier d'abord si le lead est autorisé par le filtre
        if (isFilterEnabled && !hardFilterIds.includes(leadId)) {
          console.warn(`Lead ${leadId} non autorisé par le filtre`);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('editLead');
          newParams.delete('step');
          setSearchParams(newParams);
          return;
        }
        
        // Attendre que les leads soient chargés
        const timer = setTimeout(async () => {
          const leadExists = opportunities.some(opp => opp.id === leadId);
          
          if (leadExists) {
            await openLeadForm(leadId, step || undefined);
          } else if (opportunities.length > 0) {
            // Le lead n'existe pas, nettoyer l'URL
            console.warn(`Lead avec l'ID ${leadId} non trouvé`);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('editLead');
            newParams.delete('step');
            setSearchParams(newParams);
          }
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, opportunities, showFormLead, selectedLead, hardFilterIds, isFilterEnabled]);

  const loadFullLeadDetails = async (leadId: number) => {
    try {      
      const fullLead = await leadService.getById(leadId);
      const techFinDetails = await leadTechFinService.getByLeadId(leadId);
      
      const completeLead = {
        ...fullLead,
        id: fullLead.leadId || fullLead.id,
        leadId: fullLead.leadId || fullLead.id,
        
        name: fullLead.leadName || fullLead.name,
        
        client: fullLead.client
          ? {
              id: fullLead.client.id,
              name: fullLead.client.name,
              email: fullLead.client.email,
              phone: fullLead.client.phone,
            }
          : null,

        createdByUser: fullLead.createdByUser || null,

        partenaires: fullLead.leadPartenaires?.map((lp: any) => lp.partenaire) || [],
        leadPartenaires: fullLead.leadPartenaires || [],

        leadStatusHistories: fullLead.leadStatusHistories || [],
        leadStepHistories: fullLead.leadStepHistories || [],

        techFinDetails: {
          idLeadTechFinDetails: techFinDetails?.idLeadTechFinDetails || null,
          technos: techFinDetails?.technos || [],
          devise: techFinDetails?.devise || null,
          typeFacturation: techFinDetails?.typeFacturation || null,
          volumeJHVendu: techFinDetails?.volumeJHVendu ?? 0,
          tauxDeChange: techFinDetails?.tauxDeChange ?? 1,
          impots: techFinDetails?.impots ?? 0,
          montantOffre: techFinDetails?.montantOffre ?? 0,
          budget: techFinDetails?.montantOffre ?? 0,
          dateAttribution: techFinDetails?.dateAttribution || null,
          volumeJHVenduEtMontant: techFinDetails?.volumeJHVenduEtMontant || [],
        },

        technos: techFinDetails?.technos || [],
        volumeJHVendu: techFinDetails?.volumeJHVendu || 0,
        devise: techFinDetails?.devise || null,
        tauxDeChange: techFinDetails?.tauxDeChange || 1,
        typeFacturation: techFinDetails?.typeFacturation || null,
        impots: techFinDetails?.impots || 0,
        dateAttribution: techFinDetails?.dateAttribution || "",
        montantOffre: techFinDetails?.montantOffre || 0,
        budget: techFinDetails?.montantOffre || 0,
      };
      
      return completeLead;

    } catch (error) {
      console.error("Erreur lors du chargement des détails complets:", error);
      throw error;
    }
  };

  const loadLeads = async () => {
    try {
      const data = await leadService.getAll();

      const leadsData: Lead[] = data.map((lead: any) => ({
        id: lead.leadId,
        name: lead.leadName,
        reference: lead.leadRef || '',
        businessUnit: lead.businessUnit,
        typeFinancement: lead.typeProjetFinancement,
        description: lead.leadDescription || '',
        periode: lead.leadPeriode,
        internalDeadline: lead.leadInternalDeadLine || '',
        realDeadline: lead.leadRealDeadLine || '',
        projetFinancement: lead.projetDeFinancement || '',
        commentaire: lead.leadCommentaire || '',
        zone: lead.leadZone === 0 ? 0 : 1,
        jiraProject: lead.leadGoProjetJira || '',
        jiraTicket: lead.leadGoTicketJira || '',
        driveFolder: lead.driveFolder || undefined,
        driveFile: lead.mainDriveFile || undefined,
        client: lead.client,
        type: lead.leadType,
        category: lead.category,
        secteur: lead.leadSecteur,
        status: lead.currentLeadStatus?.leadStatus || { id: 0, label: 'En attente', order: 0 },
        currentLeadStatus: lead.currentLeadStatus,
        currentLeadStep: lead.currentLeadStep,
        createdByUser: lead.createdByUser || undefined,
        partenaires: [],
      }));

      // APPLIQUER LE FILTRE DUR ICI
      const filteredLeads = applyHardFilter(leadsData);

      setOpportunities(filteredLeads);
      calculateKPIs(filteredLeads);
    } catch (error) {
      console.error("Erreur chargement leads", error);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [period, hardFilterIds]); // Recharger quand le filtre change

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

  /* ================= TABLE COLUMNS ================= */
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
      render: (row: Lead) => row.businessUnit?.name || '-',
    },
    { key: 'name', label: 'Nom' },
    { key: 'reference', label: 'Référence' },
    { key: 'client', label: 'Client', render: (row: Lead) => row.client?.name || '-' },
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
    { key: 'zone', label: 'Zone', render: (row: Lead) => row.zone === 0 ? 'Local' : 'OffShore' },
    {
      key: 'partenaires',
      label: 'Partenaires',
      render: (row: Lead) =>
        row.partenaires?.length > 0 ? row.partenaires.map(p => p.name).join(', ') : '-',
    },
    {
      key: 'driveFolder',
      label: 'Répértoire',
      render: (row: Lead) =>
        row.driveFolder?.link
          ? <a href={row.driveFolder.link} target="_blank" rel="noopener noreferrer">
              Répértoire | {row.name}
            </a>
          : '-',
    },
    {
      key: 'driveFile',
      label: 'TDR',
      render: (row: Lead) =>
        row.driveFile?.link
          ? <a href={row.driveFile.link} target="_blank" rel="noopener noreferrer">
              TDR | {row.name}
            </a>
          : '-',
    },
    {
      key: 'createdBy',
      label: 'Créé par',
      render: (row: Lead) => row.createdByUser?.username || '-',
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row: Lead) => {
        const map: any = {
          1: ['bg-info', 'Ouvert'],
          2: ['bg-danger', 'No Go'],
          3: ['bg-warning', 'En cours de rédaction'],
          4: ['bg-primary', 'En cours d\'évaluation'],
          5: ['bg-success', 'Gagnée'],
          6: ['bg-secondary', 'Perdue'],
        };
        const [cls, label] = map[row.status.id] || ['bg-secondary', 'En attente de validation'];
        return <span className={`badge ${cls}`}>{label}</span>;
      },
    },
    {
      key: 'step',
      label: 'Étape',
      render: (row: Lead) => {
        const map: any = {
          1: ['bg-secondary', 'Ouvert'],
          2: ['bg-danger', 'No Go'],
          3: ['bg-info', 'Analyse technique'],
          4: ['bg-primary', 'Validation technique'],
          5: ['bg-info', 'Analyse financière'],
          6: ['bg-primary', 'Validation financière'],
          7: ['bg-warning', 'Rédaction'],
          8: ['bg-warning', 'Revue qualité'],
          9: ['bg-success', 'Soumission offre'],
          10: ['bg-warning', 'En cours d evaluation'],
          11: ['bg-success', 'Gagnée'],
          12: ['bg-secondary', 'Perdue'],
        };
        
        const stepId = row.currentLeadStep?.leadStep?.id;
        if (!stepId) return '-';
          
        const [cls, label] = map[stepId] || ['bg-secondary', 'Étape inconnue'];
        return <span className={`badge ${cls}`}>{label}</span>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Lead) => (
        <MenuListeLead
          hideDetails={true}
          onDetails={async () => {
            if (!row.id) return;
            await openLeadDetails(row.id);
          }}
          onEdit={async () => {
            if (!row.id) return;
            await openLeadForm(row.id);
          }}
          onViewBacklog={() => {
            if (!row.id) return;
            openBacklog(row.id, row.name);
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
            <p className="expanded-text">{row.createdAt ? new Date(row.createdAt).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="expanded-item">
            <label className="expanded-label">Deadline</label>
            <p className="expanded-text expanded-deadline">{row.deadline ? new Date(row.deadline).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Fonction pour supprimer le filtre
  const clearHardFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('hardFilter');
    setSearchParams(newParams);
  };

  // Optionnel: Afficher un message si aucun lead n'est trouvé avec le filtre
  if (isFilterEnabled && opportunities.length === 0 && !isLoading) {
    return (
      <div className="liste-lead-layout">
        <Header />
        <div className="liste-lead-wrapper">
          <main className="liste-lead-main">
            <div className="container-fluid">
              <div className="alert alert-warning mt-4">
                <h5>Aucun lead trouvé</h5>
                <p>Aucun lead avec l'ID {searchParams.get("hardFilter")} n'a été trouvé.</p>
                <p className="mb-0 text-muted small">Vérifie que les IDs existent dans la base de données.</p>
                <button 
                  className="btn btn-sm btn-outline-secondary mt-3"
                  onClick={clearHardFilter}
                >
                  Effacer le filtre
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <div className="liste-lead-layout">
      <Header />
      <div className="liste-lead-wrapper">
        <main className="liste-lead-main">
          <div className="container-fluid">
            {/* Ligne 2 : Filtres période & devise + bouton créer */}
            <div className="row align-items-center mb-4">
              <div className="col-lg-8 col-md-12 mb-2 mb-lg-0">
                {/* Filtres désactivés pour le moment */}
              </div>

              {/* Bouton créer */}
              {(user?.role?.roleId == 7) && (
                <div className="col-lg-4 col-md-12 text-lg-end">
                  <Button
                    label="Créer une opportunité"
                    icon={<FaPlus />}
                    onClick={() => {
                      setSelectedLead(null);
                      setInitialStep('qualification');
                      setShowFormLead(true);
                      // Nettoyer l'URL mais garder hardFilter
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('editLead');
                      newParams.delete('step');
                      setSearchParams(newParams);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Badge indiquant le filtre actif avec bouton pour l'effacer */}
            {/* {isFilterEnabled && (
              <div className="mb-3">
                <div className="alert alert-info d-flex justify-content-between align-items-center" style={{ backgroundColor: '#e3f2fd', borderColor: '#90caf9' }}>
                  <div>
                    <i className="bi bi-funnel-fill me-2"></i>
                    <strong>Filtre actif:</strong> Affichage uniquement des leads avec ID(s): {hardFilterIds.join(', ')}
                    <span className="text-muted ms-2 small">
                      (URL: ?hardFilter={searchParams.get("hardFilter")})
                    </span>
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={clearHardFilter}
                  >
                    <i className="bi bi-x-lg me-1"></i>
                    Effacer le filtre
                  </button>
                </div>
              </div>
            )} */}

            <FilterBar
              filters={[{ type: 'text', placeholder: 'Rechercher...', onChange: setSearch }]}
            />

            <div className="table-responsive mt-3">
              <Table
                columns={columns}
                data={opportunities}
                expandedRowId={expandedRowId}
                expandedRow={renderExpandedRow}
                storageKey="liste_lead_columns"
                defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Formulaire Lead (Édition) */}
      <FormLead
        show={showFormLead}
        onClose={closeLeadForm}
        lead={selectedLead}
        initialTab={initialStep}
        onSubmit={async (savedLead) => {
          await loadLeads();
        }}
      />

      {/* Détails Lead (Visualisation) */}
      <DetailsLead
        show={showDetailLead}
        onClose={closeLeadDetails}
        lead={selectedLead}
      />

      {/* Backlog Modal */}
      <BacklogModal
        show={showBacklogModal}
        onClose={closeBacklog}
        leadId={selectedLeadIdForBacklog}
        leadName={selectedLeadName}
      />
    </div>
  );
};

export default ListeLead;