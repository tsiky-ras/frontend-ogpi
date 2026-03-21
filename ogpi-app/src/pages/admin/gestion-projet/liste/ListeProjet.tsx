import React, { useEffect, useState, useMemo } from 'react';
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
import { ProjetAvancementService, ProjetAvancement } from '../../../../services/projet/ProjetAvancementService.tsx';
import { ProjetStatutService, ProjetStatut } from '../../../../services/projet/statut/ProjetStatutService.tsx';

// ─── Méta-données des 9 statuts kanban (miroir de KanbanProjet.tsx) ──────────
// Doit rester synchronisé avec COLUMNS dans KanbanProjet.tsx

interface StatutMeta {
  label: string;
  color: string;
  bg: string;
}

const STATUT_META: Record<number, StatutMeta> = {
  1: { label: 'À faire',      color: '#6366f1', bg: '#eef2ff' },
  2: { label: 'Réouvert',     color: '#e84c3d', bg: '#fde8e8' },
  3: { label: 'En cours',     color: '#3b82f6', bg: '#eff6ff' },
  4: { label: 'Résolu',       color: '#f59e0b', bg: '#fffbeb' },
  5: { label: 'Livré Dev',    color: '#8b5cf6', bg: '#f5f3ff' },
  6: { label: 'Vérifié Dev',  color: '#0ea5e9', bg: '#f0f9ff' },
  7: { label: 'Livré Qualif', color: '#f97316', bg: '#fff7ed' },
  8: { label: 'Validé',       color: '#10b981', bg: '#ecfdf5' },
  9: { label: 'Terminé',      color: '#14b8a6', bg: '#f0fdfa' },
};

// ─── Badge statut inline ──────────────────────────────────────────────────────

const StatutBadge: React.FC<{ statutId: number | null; loading: boolean }> = ({
  statutId,
  loading,
}) => {
  if (loading) return <div className="avancement-skeleton" style={{ width: 90 }} />;

  if (statutId === null) {
    return (
      <span className="projet-statut-badge projet-statut-badge--none">
        Ouvert
      </span>
    );
  }

  const meta = STATUT_META[statutId];
  if (!meta) return null;

  return (
    <span
      className="projet-statut-badge"
      style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}
    >
      <span
        className="projet-statut-dot"
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const ListeProjet: React.FC = () => {
  const { api } = useAuth();
  const [search, setSearch] = useState('');
  const [projets, setProjets] = useState<Projet[]>([]);
  const [showFormProjet, setShowFormProjet] = useState(false);
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null);
  const [showProjetDetails, setShowProjetDetails] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // ── États Backlog ──────────────────────────────────────────────────────────
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [selectedProjetForBacklog, setSelectedProjetForBacklog] = useState<Projet | null>(null);

  // ── Services (stables entre rendus) ───────────────────────────────────────
  const projetService     = useMemo(() => new ProjetService(api),          [api]);
  const avancementService = useMemo(() => new ProjetAvancementService(api), [api]);
  const statutService     = useMemo(() => new ProjetStatutService(api),     [api]);

  const [kpis, setKpis] = useState({ totalProjets: 0, totalCP: 0, totalSuppleante: 0 });

  // Map projetId → ProjetAvancement
  const [avancements, setAvancements]           = useState<Map<number, ProjetAvancement>>(new Map());
  const [loadingAvancement, setLoadingAvancement] = useState(false);

  // Map projetId → statutId  (alimenté par le même endpoint que le kanban)
  const [statutMap, setStatutMap]           = useState<Map<number, number>>(new Map());
  const [loadingStatut, setLoadingStatut]   = useState(false);

  // ── Chargement projets ────────────────────────────────────────────────────
  const loadProjets = async () => {
    try {
      const data = await projetService.getAll();
      setProjets(data);
      setKpis({
        totalProjets:    data.length,
        totalCP:         data.filter(p => p.userCp).length,
        totalSuppleante: data.filter(p => p.userSuppleante).length,
      });
    } catch (error) {
      console.error('Erreur chargement projets', error);
    }
  };

  // ── Chargement avancements ────────────────────────────────────────────────
  const loadAvancements = async () => {
    setLoadingAvancement(true);
    try {
      const data = await avancementService.getAll();
      setAvancements(ProjetAvancementService.toMap(data));
    } catch {
      // silencieux
    } finally {
      setLoadingAvancement(false);
    }
  };

  // ── Chargement statuts kanban ─────────────────────────────────────────────
  const loadStatuts = async () => {
    setLoadingStatut(true);
    try {
      const map = await statutService.getStatutsCourants(); // Map<projetId, ProjetStatut>
      // On ne garde que l'id pour la Map locale
      const idMap = new Map<number, number>();
      map.forEach((statut, projetId) => idMap.set(projetId, statut.id));
      setStatutMap(idMap);
    } catch {
      // silencieux — la colonne affichera "Non défini"
    } finally {
      setLoadingStatut(false);
    }
  };

  useEffect(() => {
    loadProjets();
    loadAvancements();
    loadStatuts();
  }, []);

  // ── Handlers Backlog ──────────────────────────────────────────────────────
  const handleOpenBacklog = (projet: any) => {
    setSelectedProjetForBacklog(projet);
    setShowBacklogModal(true);
  };

  const handleCloseBacklog = () => {
    setShowBacklogModal(false);
    setSelectedProjetForBacklog(null);
  };

  // ── Colonnes de la table ──────────────────────────────────────────────────
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
    { key: 'refBC',     label: 'Réf BC' },
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
        <div style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.description || '-'}
        </div>
      ),
    },

    // ── Colonne Statut kanban ────────────────────────────────────────────────
    {
      key: 'statutKanban',
      label: 'Statut',
      render: (row: Projet) => (
        <StatutBadge
          statutId={statutMap.get(row.idProjet ?? 0) ?? null}
          loading={loadingStatut}
        />
      ),
    },

    // ── Avancement tâches ────────────────────────────────────────────────────
    {
      key: 'avancementTaches',
      label: 'Avancement tâches',
      render: (row: Projet) => {
        const a = avancements.get(row.idProjet ?? 0);
        if (loadingAvancement) return <div className="avancement-skeleton" />;
        if (!a || a.tachesTotal === 0)
          return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Aucune tâche</span>;
        const pct   = a.avancementTaches;
        const color = pct >= 100 ? '#2d8f47' : pct >= 60 ? '#EABF5B' : '#C93C29';
        return (
          <div style={{ minWidth: 120 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 3 }}>
              <span style={{ color: '#5F6F6E', fontWeight: 500 }}>
                {a.tachesValidees}/{a.tachesTotal} tâches
              </span>
              <span style={{ fontWeight: 700, color }}>{pct.toFixed(0)} %</span>
            </div>
            <div style={{ height: 7, background: '#E8E5D7', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(100, pct)}%`,
                background: color, borderRadius: 999, transition: 'width .4s',
              }} />
            </div>
          </div>
        );
      },
    },

    // ── Avancement paiement ───────────────────────────────────────────────────
    {
      key: 'avancementPaiement',
      label: 'Avancement paiement',
      render: (row: Projet) => {
        const a = avancements.get(row.idProjet ?? 0);
        if (loadingAvancement) return <div className="avancement-skeleton" />;
        if (!a || a.montantOffre === 0)
          return (
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {a && a.totalPaye > 0
                ? `${a.totalPaye.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} encaissé`
                : "Pas d'offre"}
            </span>
          );
        const pct   = a.avancementPaiement;
        const color = pct >= 100 ? '#2d8f47' : pct >= 50 ? '#3B6E8F' : '#5F6F6E';
        return (
          <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 3 }}>
              <span style={{ color: '#5F6F6E', fontWeight: 500 }}>
                {a.totalPaye.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                <span style={{ color: '#94a3b8' }}>
                  {' '}/ {a.montantOffre.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                </span>
              </span>
              <span style={{ fontWeight: 700, color }}>{pct.toFixed(0)} %</span>
            </div>
            <div style={{ height: 7, background: '#E8E5D7', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(100, pct)}%`,
                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                borderRadius: 999, transition: 'width .4s',
              }} />
            </div>
          </div>
        );
      },
    },

    // ── Actions ───────────────────────────────────────────────────────────────
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Projet) => (
        <MenuListeProjet
          onDetails={() => { setSelectedProjet(row); setShowProjetDetails(true); }}
          onEdit={()    => { setSelectedProjet(row); setShowFormProjet(true); }}
          onViewBacklog={() => handleOpenBacklog(row)}
        />
      ),
    },
  ];

  // ── Expanded row ──────────────────────────────────────────────────────────
  const renderExpandedRow = (row: Projet) => {
    const sid  = statutMap.get(row.idProjet ?? 0) ?? null;
    const meta = sid !== null ? STATUT_META[sid] : null;

    return (
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
              {row.dateDebutPrevu ? new Date(row.dateDebutPrevu).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
          <div className="col-md-6">
            <label className="expanded-label">Date de fin prévu</label>
            <p className="expanded-text">
              {row.dateFinPrevu ? new Date(row.dateFinPrevu).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
        </div>

        {/* Statut kanban dans le détail expansé */}
        <div className="row g-3 mt-3">
          <div className="col-md-4">
            <label className="expanded-label">Statut kanban</label>
            <p className="expanded-text" style={{ marginTop: 4 }}>
              {meta ? (
                <span
                  className="projet-statut-badge"
                  style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}
                >
                  <span className="projet-statut-dot" style={{ background: meta.color }} />
                  {meta.label}
                </span>
              ) : (
                <span className="projet-statut-badge projet-statut-badge--none">Non défini</span>
              )}
            </p>
          </div>
          <div className="col-md-8">
            <label className="expanded-label">Description</label>
            <p className="expanded-text">{row.description || '-'}</p>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
                  onClick={() => { setSelectedProjet(null); setShowFormProjet(true); }}
                />
              </div>
            </div>

            {/* KPIs */}
            <div className="row mb-4">
              <div className="col-lg-4 col-md-6 mb-3">
                <StatCard title="Total projets"          value={kpis.totalProjets}    subtitle="" variant={['tomato',  'charcoal']} />
              </div>
              <div className="col-lg-4 col-md-6 mb-3">
                <StatCard title="Projets avec CP"        value={kpis.totalCP}         subtitle="" variant={['dim',    'linen']}    />
              </div>
              <div className="col-lg-4 col-md-6 mb-3">
                <StatCard title="Projets avec suppléante" value={kpis.totalSuppleante} subtitle="" variant={['tuscan', 'linen']}   />
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
        onClose={() => { setShowFormProjet(false); setSelectedProjet(null); }}
        projet={selectedProjet}
        onSubmit={async () => {
          await loadProjets();
          await loadStatuts(); // rafraîchit aussi les statuts après édition
        }}
      />

      {/* Détails Projet */}
      <ProjetDetails
        show={showProjetDetails}
        onClose={() => { setShowProjetDetails(false); setSelectedProjet(null); }}
        projet={selectedProjet}
      />

      {/* Backlog */}
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