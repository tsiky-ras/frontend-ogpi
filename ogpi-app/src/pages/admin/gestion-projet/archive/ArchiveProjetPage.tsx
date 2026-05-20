import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../../../../components/header/Header.tsx';
import Sidebar from '../../../../components/sidebar/Sidebar.tsx';
import Title from '../../../../components/title/Title.tsx';
import FilterBar from '../../../../components/filters/FilterBar.tsx';
import Table from '../../../../components/table/Table.tsx';
import {
  FaArchive, FaBoxOpen, FaProjectDiagram, FaCoins, FaFileAlt,
} from 'react-icons/fa';
import StatCard from '../../../../components/stat/StatCard.tsx';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { ArchiveProjetService } from '../../../../services/projet/ArchiveProjetService.tsx';
import { Projet } from '../../../../types/projet/Projet.tsx';
import ProjetDetails from '../form/details/ProjetDetails.tsx';
import ConfirmArchiveModal from './ConfirmArchiveModal.tsx';
import BacklogProjetModal from '../backlog/BacklogProjetModal.tsx';
import MenuArchiveProjet from '../menu/MenuListeProjet.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ArchiveProjet.css';

const P = {
  charcoal: '#223A46',
  tomato:   '#C93C29',
  success:  '#2d8f47',
  warning:  '#d97706',
  dim:      '#5F6F6E',
  blue:     '#3b82f6',
};

const DEFAULT_VISIBLE_COLUMNS = ['nomProjet', 'client', 'userCp', 'typeFacturation', 'dates', 'statut', 'refBC', 'actions'];

const ArchiveProjetPage: React.FC = () => {
  const { api } = useAuth();
  const archiveService = useMemo(() => new ArchiveProjetService(api), [api]);

  const [projets,           setProjets]           = useState<Projet[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [search,            setSearch]            = useState('');
  const [toasting,          setToasting]          = useState<string | null>(null);
  const [processing,        setProcessing]        = useState<number | null>(null);
  const [desarchiverTarget, setDesarchiverTarget] = useState<Projet | null>(null);
  const [detailsProjet,     setDetailsProjet]     = useState<Projet | null>(null);
  const [backlogProjet,     setBacklogProjet]     = useState<Projet | null>(null);

  const loadArchives = useCallback(async () => {
    setLoading(true);
    try {
      const data = await archiveService.getArchives();
      setProjets(data);
    } catch {
      setProjets([]);
    } finally {
      setLoading(false);
    }
  }, [archiveService]);

  useEffect(() => { loadArchives(); }, [loadArchives]);

  const showToast = (msg: string) => {
    setToasting(msg);
    setTimeout(() => setToasting(null), 3000);
  };

  const handleDesarchiver = async () => {
    if (!desarchiverTarget) return;
    const id = desarchiverTarget.idProjet ?? 0;
    setProcessing(id);
    try {
      await archiveService.desarchiver(id);
      setProjets(prev => prev.filter(p => p.idProjet !== id));
      showToast(`"${desarchiverTarget.nomProjet}" désarchivé avec succès.`);
    } catch {
      showToast('Erreur lors du désarchivage.');
    } finally {
      setProcessing(null);
      setDesarchiverTarget(null);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return projets;
    const q = search.toLowerCase();
    return projets.filter(p =>
      p.nomProjet?.toLowerCase().includes(q) ||
      (p.refBC ?? '').toLowerCase().includes(q) ||
      (p.userCp?.username ?? '').toLowerCase().includes(q) ||
      (p.lead?.client?.name ?? '').toLowerCase().includes(q) ||
      (p.lead?.leadName ?? '').toLowerCase().includes(q)
    );
  }, [projets, search]);

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  // ── Colonnes identiques au style de ListeProjet ───────────────────────
  const columns = [
    {
      key: 'nomProjet',
      label: 'Projet',
      render: (p: Projet) => (
        <div>
          <div style={{ fontWeight: 600, color: P.charcoal, fontSize: '0.88rem' }}>
            {p.nomProjet}
          </div>
          {p.lead?.leadRef && (
            <div style={{ fontSize: '0.72rem', color: P.dim, marginTop: 2 }}>
              {p.lead.leadRef} — {p.lead.leadName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (p: Projet) =>
        p.lead?.client?.name
          ? <span style={{ fontWeight: 500, color: P.blue }}>{p.lead.client.name}</span>
          : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>,
    },
    {
      key: 'userCp',
      label: 'Responsable',
      render: (p: Projet) =>
        p.userCp?.username
          ? <span style={{ fontWeight: 500 }}>{p.userCp.username}</span>
          : <span style={{ color: P.warning, fontSize: 12 }}>Non assigné</span>,
    },
    {
      key: 'typeFacturation',
      label: 'Type',
      render: (p: Projet) => {
        const nom = p.typeFacturation?.nomTypeFacturation;
        if (!nom) return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
        const isF = p.typeFacturation?.isFacturable;
        return (
          <span style={{
            fontSize: 11, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color:       isF ? P.success : P.dim,
            background:  isF ? '#ecfdf5' : '#f8fafc',
            border:      `1px solid ${isF ? '#a7f3d0' : '#e2e8f0'}`,
            borderRadius: 99, padding: '2px 8px',
          }}>
            {nom}
          </span>
        );
      },
    },
    {
      key: 'dates',
      label: 'Dates',
      render: (p: Projet) => (
        <span style={{ fontSize: '0.8rem', color: P.dim, whiteSpace: 'nowrap' }}>
          {formatDate(p.dateDebutPrevu)}
          <span style={{ margin: '0 4px', color: '#cbd5e1' }}>→</span>
          {formatDate(p.dateFinPrevu)}
        </span>
      ),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: () => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600, borderRadius: 99,
          padding: '2px 10px',
          color: '#6b7280', background: '#f1f5f9',
          border: '1px solid #e2e8f0',
        }}>
          <FaArchive size={9} />
          Archivé
        </span>
      ),
    },
    {
      key: 'refBC',
      label: 'Réf BC',
      render: (p: Projet) =>
        p.refBC
          ? <span style={{ fontSize: '0.82rem', color: P.dim, fontWeight: 500 }}>{p.refBC}</span>
          : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p: Projet) => (
        <MenuArchiveProjet
          onDetails={() => setDetailsProjet(p)}
          onViewBacklog={p.lead?.leadId ? () => setBacklogProjet(p) : undefined}
          onDesarchiver={() => setDesarchiverTarget(p)}
        />
      ),
    },
  ];

  return (
    <div className="page-lead-layout">
      <Header />

      <div className="liste-lead-wrapper">
        <aside className="liste-lead-sidebar">
          <Sidebar />
        </aside>

        <main className="liste-lead-main">
          <div className="container-fluid">

            <div className="row mb-3">
              <div className="col">
                <Title
                  title="Archives — Projets"
                  subtitle="Projets terminés et archivés"
                />
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <StatCard title="Total archivés" value={projets.length} variant="#08143d" icon={<FaArchive />} />
              </div>
              <div className="col-md-4">
                <StatCard title="Facturables" value={projets.filter(p => p.typeFacturation?.isFacturable).length} variant="#10b981" icon={<FaCoins />} />
              </div>
              <div className="col-md-4">
                <StatCard title="Avec réf. BC" value={projets.filter(p => !!p.refBC).length} variant="#3b82f6" icon={<FaFileAlt />} />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ flex: 1, maxWidth: 420 }}>
                <FilterBar
                  filters={[{
                    type: 'text',
                    placeholder: 'Rechercher un projet archivé…',
                    onChange: setSearch,
                  }]}
                />
              </div>
              {search && (
                <span style={{ fontSize: '0.8rem', color: P.dim }}>
                  <strong style={{ color: P.charcoal }}>{filtered.length}</strong> / {projets.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="archive-loading">
                <div className="archive-spinner" />
                <span>Chargement des archives…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="archive-empty">
                <FaProjectDiagram size={40} className="archive-empty-icon" />
                <p>
                  {search
                    ? 'Aucun projet ne correspond à votre recherche.'
                    : 'Aucun projet archivé pour le moment.'}
                </p>
                {search && (
                  <button className="archive-reset-btn" onClick={() => setSearch('')}>
                    Effacer la recherche
                  </button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <Table
                  columns={columns}
                  data={filtered}
                  storageKey="archive_projet_columns"
                  defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
                />
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Modal confirmation désarchivage ── */}
      <ConfirmArchiveModal
        show={desarchiverTarget !== null}
        mode="desarchiver"
        nomProjet={desarchiverTarget?.nomProjet ?? ''}
        processing={processing !== null}
        onConfirm={handleDesarchiver}
        onCancel={() => setDesarchiverTarget(null)}
      />

      {/* ── Détails projet ── */}
      <ProjetDetails
        show={detailsProjet !== null}
        onClose={() => setDetailsProjet(null)}
        projet={detailsProjet}
      />

      {/* ── Backlog / Workload ── */}
      <BacklogProjetModal
        show={backlogProjet !== null}
        onClose={() => setBacklogProjet(null)}
        projetId={backlogProjet?.idProjet ?? 0}
        projetNom={backlogProjet?.nomProjet}
        leadId={backlogProjet?.lead?.leadId ?? null}
        projectStartDate={backlogProjet?.dateDebutPrevu ?? null}
        projectEndDate={backlogProjet?.dateFinPrevu ?? null}
      />

      {/* ── Toast ── */}
      {toasting && (
        <div className="archive-toast">
          <FaBoxOpen />
          <span>{toasting}</span>
        </div>
      )}
    </div>
  );
};

export default ArchiveProjetPage;