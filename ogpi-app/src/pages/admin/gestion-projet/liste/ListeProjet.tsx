import React, { useState, useMemo } from 'react';
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
import { Projet } from '../../../../types/projet/Projet.tsx';
import BacklogProjetModal from '../backlog/BacklogProjetModal.tsx';
import { ProjetAvancement } from '../../../../services/projet/ProjetAvancementService.tsx';

// ─── Méta-données des 9 statuts kanban ────────────────────────────────────────

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

// ─── Badge statut ─────────────────────────────────────────────────────────────

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
      <span className="projet-statut-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ListeProjetProps {
  projets:     Projet[];
  statutMap:   Map<number, number>;
  avancements: Map<number, ProjetAvancement>;
  loading:     boolean;
  onProjetSaved: () => Promise<void>;
}

// ─── Composant principal ──────────────────────────────────────────────────────

const ListeProjet: React.FC<ListeProjetProps> = ({
  projets,
  statutMap,
  avancements,
  loading,
  onProjetSaved,
}) => {
  const [search, setSearch] = useState('');
  const [showFormProjet, setShowFormProjet] = useState(false);
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null);
  const [showProjetDetails, setShowProjetDetails] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // ── États Backlog ──────────────────────────────────────────────────────────
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [selectedProjetForBacklog, setSelectedProjetForBacklog] = useState<Projet | null>(null);

  // ── KPIs (recalculés depuis les projets reçus en prop) ────────────────────
  const kpis = useMemo(() => ({
    totalProjets:    projets.length,
    totalCP:         projets.filter(p => p.userCp).length,
    totalSuppleante: projets.filter(p => p.userSuppleante).length,
  }), [projets]);

  // ── Données filtrées ─────────────────────────────────────────────────────
  const filteredProjets = useMemo(() => {
    if (!search.trim()) return projets;
    const q = search.toLowerCase();
    return projets.filter(p =>
      p.nomProjet?.toLowerCase().includes(q) ||
      (p.refBC ?? '').toLowerCase().includes(q) ||
      (p.userCp?.username ?? '').toLowerCase().includes(q) ||
      (p.lead?.leadName ?? '').toLowerCase().includes(q)
    );
  }, [projets, search]);

  // ── Handlers Backlog ──────────────────────────────────────────────────────
  const handleOpenBacklog = (projet: Projet) => {
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
      key: 'statut',
      label: 'Statut',
      render: (row: Projet) => {
        const sid = statutMap.get(row.idProjet ?? 0) ?? null;
        return <StatutBadge statutId={sid} loading={loading} />;
      },
    },
    {
      key: 'avancement',
      label: 'Avancement paiement',
      render: (row: Projet) => {
        const a = avancements.get(row.idProjet ?? 0);
        if (loading) return <div className="avancement-skeleton" />;
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

        <div className="row g-3 mt-3">
          <div className="col-md-4">
            <label className="expanded-label">Statut</label>
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
                <StatCard title="Total projets"           value={kpis.totalProjets}    subtitle="" variant={['tomato',  'charcoal']} />
              </div>
              <div className="col-lg-4 col-md-6 mb-3">
                <StatCard title="Projets avec CP"         value={kpis.totalCP}         subtitle="" variant={['dim',    'linen']}    />
              </div>
              <div className="col-lg-4 col-md-6 mb-3">
                <StatCard title="Projets avec suppléante" value={kpis.totalSuppleante} subtitle="" variant={['tuscan', 'linen']}   />
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive mt-3">
              <Table
                columns={columns}
                data={filteredProjets}
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
          await onProjetSaved();
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