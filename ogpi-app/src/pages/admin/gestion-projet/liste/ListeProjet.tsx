import React, { useEffect, useState } from 'react';
import Header from '../../../../components/header/Header.tsx';
import Button from '../../../../components/button/Button.tsx';
import { FaPlus } from 'react-icons/fa';
import FilterBar from '../../../../components/filters/FilterBar.tsx';
import Table from '../../../../components/table/Table.tsx';
import StatCard from '../../../../components/stat/StatCard.tsx';
import MenuListeProjet from '../menu/MenuListeProjet.tsx';
import FormProjet from '../form/FormProjet.tsx';
import ProjetDetails from '../form/details/ProjetDetails.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ListeProjet.css';
import { ProjetService } from '../../../../services/projet/ProjetService.tsx';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { Projet } from '../../../../types/projet/Projet.tsx';
import BacklogProjetModal from '../backlog/BacklogProjetModal.tsx';

const ListeProjet: React.FC = () => {
  const { api } = useAuth();
  const [search, setSearch] = useState('');
  const [projets, setProjets] = useState<Projet[]>([]);
  const [showFormProjet, setShowFormProjet] = useState(false);
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null);
  const [showProjetDetails, setShowProjetDetails] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // ── États Backlog ──────────────────────────────────────────────────────
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [selectedProjetForBacklog, setSelectedProjetForBacklog] = useState<Projet | null>(null);

  const projetService = new ProjetService(api);

  const [kpis, setKpis] = useState({
    totalProjets: 0,
    totalCP: 0,
    totalSuppleante: 0,
  });

  /* ================= DATA ================= */
  const loadProjets = async () => {
    try {
      const data = await projetService.getAll();
      setProjets(data);
      setKpis({
        totalProjets: data.length,
        totalCP: data.filter(p => p.userCp).length,
        totalSuppleante: data.filter(p => p.userSuppleante).length,
      });
    } catch (error) {
      console.error('Erreur chargement projets', error);
    }
  };

  useEffect(() => {
    loadProjets();
  }, []);

  /* ================= HANDLERS BACKLOG ================= */
  const handleOpenBacklog = (projet: any) => {
    setSelectedProjetForBacklog(projet);
    setShowBacklogModal(true);
  };

  const handleCloseBacklog = () => {
    setShowBacklogModal(false);
    setSelectedProjetForBacklog(null);
  };

  /* ================= TABLE ================= */
  const columns = [
    { key: 'nomProjet', label: 'Nom du projet' },
    {
      key: 'lead',
      label: 'Opportunité associée',
      render: (row: Projet) => {
        if (!row.lead) return '-';
        return `${row.lead.leadRef || '-'} – ${row.lead.leadName || '-'}`;
      },
    },
    { key: 'refBC', label: 'Réf BC' },
    { key: 'refCompte', label: 'Réf Compte' },
    {
      key: 'dateAttribution',
      label: "Date d'attribution",
      render: (row: Projet) =>
        row.dateAttribution ? new Date(row.dateAttribution).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'dateDebutPrevu',
      label: 'Date de début prévu',
      render: (row: Projet) =>
        row.dateDebutPrevu ? new Date(row.dateDebutPrevu).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'dateFinPrevu',
      label: 'Date de fin prévu',
      render: (row: Projet) =>
        row.dateFinPrevu ? new Date(row.dateFinPrevu).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'userCp',
      label: 'Chef de projet',
      render: (row: Projet) => row.userCp?.username || '-',
    },
    {
      key: 'userSuppleante',
      label: 'Suppléante',
      render: (row: Projet) => row.userSuppleante?.username || '-',
    },
    {
      key: 'typeFacturation',
      label: 'Type de facturation',
      render: (row: Projet) => row.typeFacturation?.nomTypeFacturation || '-',
    },
    {
      key: 'description',
      label: 'Description',
      render: (row: Projet) => (
        <div
          style={{
            maxWidth: '200px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {row.description || '-'}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Projet) => (
        <MenuListeProjet
          onDetails={() => {
            setSelectedProjet(row);
            setShowProjetDetails(true);
          }}
          onEdit={() => {
            setSelectedProjet(row);
            setShowFormProjet(true);
          }}
          onViewBacklog={() => handleOpenBacklog(row)}
        />
      ),
    },
  ];

  const renderExpandedRow = (row: Projet) => (
    <div className="expanded-row-content p-4 bg-light">
      <div className="row g-3">
        <div className="col-md-6">
          <label className="expanded-label">Lead</label>
          <p className="expanded-text">
            {row.lead ? `${row.lead.leadRef || '-'} – ${row.lead.leadName || '-'}` : '-'}
          </p>
        </div>
        <div className="col-md-4">
          <label className="expanded-label">Référence BC</label>
          <p className="expanded-text">{row.refBC || '-'}</p>
        </div>
        <div className="col-md-4">
          <label className="expanded-label">Référence Compte</label>
          <p className="expanded-text">{row.refCompte || '-'}</p>
        </div>
        <div className="col-md-4">
          <label className="expanded-label">Chef de projet</label>
          <p className="expanded-text">{row.userCp?.username || '-'}</p>
        </div>
      </div>
      <div className="row g-3 mt-3">
        <div className="col-md-6">
          <label className="expanded-label">Date de début prévu</label>
          <p className="expanded-text">
            {row.dateDebutPrevu
              ? new Date(row.dateDebutPrevu).toLocaleDateString('fr-FR')
              : '-'}
          </p>
        </div>
        <div className="col-md-6">
          <label className="expanded-label">Date de fin prévu</label>
          <p className="expanded-text">
            {row.dateFinPrevu ? new Date(row.dateFinPrevu).toLocaleDateString('fr-FR') : '-'}
          </p>
        </div>
      </div>
      <div className="row g-3 mt-3">
        <div className="col-12">
          <label className="expanded-label">Description</label>
          <p className="expanded-text">{row.description || '-'}</p>
        </div>
      </div>
    </div>
  );

  /* ================= RENDER ================= */
  return (
    <div className="liste-projet-layout">
      <Header />
      <div className="liste-projet-wrapper">
        <main className="liste-projet-main">
          <div className="container-fluid">
            {/* Filtres + créer */}
            <div className="row align-items-center mb-4">
              <div className="col-lg-8 col-md-12 mb-2 mb-lg-0">
                <FilterBar
                  filters={[{ type: 'text', placeholder: 'Rechercher...', onChange: setSearch }]}
                />
              </div>
              <div className="col-lg-4 col-md-12 text-lg-end">
                <Button
                  label="Créer un projet"
                  icon={<FaPlus />}
                  onClick={() => {
                    setSelectedProjet(null);
                    setShowFormProjet(true);
                  }}
                />
              </div>
            </div>

            {/* KPIs */}
            <div className="row mb-4">
              <div className="col-lg-4 col-md-6 mb-3">
                <StatCard
                  title="Total projets"
                  value={kpis.totalProjets}
                  subtitle=""
                  variant={['tomato', 'charcoal']}
                />
              </div>
              <div className="col-lg-4 col-md-6 mb-3">
                <StatCard
                  title="Projets avec CP"
                  value={kpis.totalCP}
                  subtitle=""
                  variant={['dim', 'linen']}
                />
              </div>
              <div className="col-lg-4 col-md-6 mb-3">
                <StatCard
                  title="Projets avec suppléante"
                  value={kpis.totalSuppleante}
                  subtitle=""
                  variant={['tuscan', 'linen']}
                />
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive mt-3">
              <Table
                columns={columns}
                data={projets}
                expandedRowId={expandedRowId}
                expandedRow={renderExpandedRow}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Formulaire Projet */}
      <FormProjet
        show={showFormProjet}
        onClose={() => {
          setShowFormProjet(false);
          setSelectedProjet(null);
        }}
        projet={selectedProjet}
        onSubmit={async (_savedProjet) => {
          await loadProjets();
        }}
      />

      {/* Détails Projet */}
      <ProjetDetails
        show={showProjetDetails}
        onClose={() => {
          setShowProjetDetails(false);
          setSelectedProjet(null);
        }}
        projet={selectedProjet}
      />
      <BacklogProjetModal
        show={showBacklogModal}
        onClose={handleCloseBacklog}
        projetId={selectedProjetForBacklog?.idProjet ?? 0}
        projetNom={selectedProjetForBacklog?.nomProjet}
        leadId={selectedProjetForBacklog?.lead?.leadId ?? null}
        projectStartDate={selectedProjetForBacklog?.dateDebutPrevu ?? null}  
        projectEndDate={selectedProjetForBacklog?.dateFinPrevu ?? null}       
      />
    </div>
  );
};

export default ListeProjet;