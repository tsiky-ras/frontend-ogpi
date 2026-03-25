import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../../../../context/AuthContext.tsx';
import { ProjetStatutService } from '../../../../services/projet/statut/ProjetStatutService.tsx';
import { Projet } from '../../../../types/projet/Projet.tsx';
import MenuListeProjet from '../menu/MenuListeProjet.tsx';
import FormProjet from '../form/FormProjet.tsx';
import ProjetDetails from '../form/details/ProjetDetails.tsx';
import BacklogProjetModal from '../backlog/BacklogProjetModal.tsx';

import {
  FaSearch, FaUser, FaCalendarAlt, FaChevronRight,
  FaLayerGroup, FaRedo, FaPlay, FaCheck, FaBoxOpen,
  FaMicroscope, FaTruck, FaShieldAlt, FaFlagCheckered,
  FaSyncAlt, FaTimes, FaProjectDiagram,
} from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';

import './KanbanProjet.css';

// ─── Définition des colonnes kanban ──────────────────────────────────────────

interface KanbanColumn {
  statutId: number;
  label: string;
  color: string;
  Icon: React.ElementType;
}

const COLUMNS: KanbanColumn[] = [
  { statutId: 1, label: 'À faire',      color: '#6366f1', Icon: FaLayerGroup    },
  { statutId: 2, label: 'Réouvert',     color: '#e84c3d', Icon: FaRedo          },
  { statutId: 3, label: 'En cours',     color: '#3b82f6', Icon: FaPlay          },
  { statutId: 4, label: 'Résolu',       color: '#f59e0b', Icon: FaCheck         },
  { statutId: 5, label: 'Livré Dev',    color: '#8b5cf6', Icon: FaBoxOpen       },
  { statutId: 6, label: 'Vérifié Dev',  color: '#0ea5e9', Icon: FaMicroscope    },
  { statutId: 7, label: 'Livré Qualif', color: '#f97316', Icon: FaTruck         },
  { statutId: 8, label: 'Validé',       color: '#10b981', Icon: FaShieldAlt     },
  { statutId: 9, label: 'Terminé',      color: '#14b8a6', Icon: FaFlagCheckered },
];

const DEFAULT_STATUT_ID = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '';

const initials = (nom: string) => {
  const p = nom.trim().split(' ');
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : (nom[0] || '?').toUpperCase();
};

// ─── Carte projet ─────────────────────────────────────────────────────────────

interface CardProps {
  projet: Projet;
  statutId: number;
  onDragStart: (e: React.DragEvent, p: Projet) => void;
  onDetails: () => void;
  onEdit: () => void;
  onBacklog: () => void;
}

const ProjetCard: React.FC<CardProps> = ({
  projet, statutId, onDragStart, onDetails, onEdit, onBacklog,
}) => {
  const col = COLUMNS.find(c => c.statutId === statutId) ?? COLUMNS[0];

  return (
    <div
      className="kbp-card"
      style={{ '--col-color': col.color } as React.CSSProperties}
      draggable
      onDragStart={e => onDragStart(e, projet)}
    >
      <div className="kbp-card-header">
        <div
          className="kbp-avatar"
          style={{ background: `linear-gradient(135deg, ${col.color}cc, ${col.color}44)` }}
        >
          {initials(projet.nomProjet)}
        </div>
        <div className="kbp-card-info">
          <span className="kbp-card-name">{projet.nomProjet}</span>
          {projet.refBC && <span className="kbp-card-ref">{projet.refBC}</span>}
        </div>
        <div className="kbp-card-menu" onMouseDown={e => e.stopPropagation()}>
          <MenuListeProjet
            onDetails={onDetails}
            onEdit={onEdit}
            onViewBacklog={onBacklog}
          />
        </div>
      </div>

      <div className="kbp-card-body">
        {projet.userCp && (
          <div className="kbp-card-row">
            <FaUser className="kbp-icon" />
            <span className="kbp-card-text">{projet.userCp.username}</span>
          </div>
        )}
        {(projet.dateDebutPrevu || projet.dateFinPrevu) && (
          <div className="kbp-card-row">
            <FaCalendarAlt className="kbp-icon kbp-icon--date" />
            <span className="kbp-card-text kbp-date">
              {fmtDate(projet.dateDebutPrevu)} → {fmtDate(projet.dateFinPrevu)}
            </span>
          </div>
        )}
        {projet.lead && (
          <div className="kbp-card-row">
            <FaProjectDiagram className="kbp-icon" />
            <span className="kbp-card-text">
              {projet.lead.leadRef} – {projet.lead.leadName}
            </span>
          </div>
        )}
        {projet.typeFacturation && (
          <div className="kbp-card-row">
            <span className="kbp-badge kbp-badge--type">
              {projet.typeFacturation.nomTypeFacturation}
            </span>
          </div>
        )}
      </div>

      <div className="kbp-card-footer">
        <span
          className="kbp-badge kbp-badge--statut"
          style={{ background: col.color + '22', color: col.color }}
        >
          <col.Icon style={{ fontSize: 9, marginRight: 3 }} />
          {col.label}
        </span>
      </div>
    </div>
  );
};

// ─── Colonne kanban ───────────────────────────────────────────────────────────

interface ColProps {
  col: KanbanColumn;
  projets: Projet[];
  onDragStart: (e: React.DragEvent, p: Projet) => void;
  onDrop: (e: React.DragEvent, statutId: number) => void;
  statutMap: Map<number, number>;
  onDetails: (p: Projet) => void;
  onEdit: (p: Projet) => void;
  onBacklog: (p: Projet) => void;
}

const KanbanColonne: React.FC<ColProps> = ({
  col, projets, onDragStart, onDrop, statutMap,
  onDetails, onEdit, onBacklog,
}) => {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`kbp-column${over ? ' kbp-column--over' : ''}`}
      style={{ '--col-color': col.color } as React.CSSProperties}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { setOver(false); onDrop(e, col.statutId); }}
    >
      <div className="kbp-column-header">
        <col.Icon className="kbp-column-icon" />
        <span className="kbp-column-label">{col.label}</span>
        <span className="kbp-column-count">{projets.length}</span>
      </div>

      <div className="kbp-column-body">
        {projets.length === 0 && (
          <div className="kbp-empty">
            <FaChevronRight className="kbp-empty-icon" />
            Déposer ici
          </div>
        )}
        {projets.map(p => (
          <ProjetCard
            key={p.idProjet}
            projet={p}
            statutId={statutMap.get(p.idProjet ?? 0) ?? DEFAULT_STATUT_ID}
            onDragStart={onDragStart}
            onDetails={() => onDetails(p)}
            onEdit={() => onEdit(p)}
            onBacklog={() => onBacklog(p)}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanProjetProps {
  projets:         Projet[];
  statutMap:       Map<number, number>;
  loading:         boolean;
  onProjetSaved:   () => Promise<void>;
  onStatutChange:  (projetId: number, newStatutId: number) => void;
}

// ─── KanbanProjet ─────────────────────────────────────────────────────────────

const KanbanProjet: React.FC<KanbanProjetProps> = ({
  projets,
  statutMap,
  loading,
  onProjetSaved,
  onStatutChange,
}) => {
  const { api } = useAuth();
  const statutService = useMemo(() => new ProjetStatutService(api), [api]);

  // Filtres
  const [search, setSearch]           = useState('');
  const [filterCP, setFilterCP]       = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  // Modals
  const [selectedProjet, setSelectedProjet]         = useState<Projet | null>(null);
  const [showForm, setShowForm]                     = useState(false);
  const [showDetails, setShowDetails]               = useState(false);
  const [showBacklog, setShowBacklog]               = useState(false);
  const [selectedForBacklog, setSelectedForBacklog] = useState<Projet | null>(null);

  const dragging = useRef<Projet | null>(null);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragStart = (_e: React.DragEvent, p: Projet) => {
    dragging.current = p;
  };

  const handleDrop = async (_e: React.DragEvent, targetStatutId: number) => {
    const p = dragging.current;
    if (!p || !p.idProjet) return;
    dragging.current = null;

    const current = statutMap.get(p.idProjet);
    if (current === targetStatutId) return;

    // Mise à jour optimiste immédiate — remonte au ProjetPage
    onStatutChange(p.idProjet, targetStatutId);

    try {
      await statutService.changerStatut(p.idProjet, targetStatutId);
    } catch {
      // Rollback si l'API échoue — remet l'ancienne valeur
      onStatutChange(p.idProjet, current ?? DEFAULT_STATUT_ID);
    }
  };

  // ── Filtres & groupement ───────────────────────────────────────────────────
  const cpList = useMemo(
    () => Array.from(new Set(projets.map(p => p.userCp?.username).filter(Boolean))) as string[],
    [projets]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projets.filter(p => {
      const matchSearch =
        !search ||
        p.nomProjet.toLowerCase().includes(q) ||
        (p.refBC ?? '').toLowerCase().includes(q) ||
        (p.userCp?.username ?? '').toLowerCase().includes(q) ||
        (p.lead?.leadName ?? '').toLowerCase().includes(q);
      const matchCP     = !filterCP     || p.userCp?.username === filterCP;
      const matchStatut = !filterStatut || String(statutMap.get(p.idProjet ?? 0) ?? 1) === filterStatut;
      return matchSearch && matchCP && matchStatut;
    });
  }, [projets, search, filterCP, filterStatut, statutMap]);

  const grouped = useMemo(() => {
    const g: Record<number, Projet[]> = {};
    COLUMNS.forEach(c => { g[c.statutId] = []; });
    filtered.forEach(p => {
      const sid = statutMap.get(p.idProjet ?? 0) ?? DEFAULT_STATUT_ID;
      if (!g[sid]) g[sid] = [];
      g[sid].push(p);
    });
    return g;
  }, [filtered, statutMap]);

  const totalProjets = filtered.length;
  const termines     = grouped[9]?.length ?? 0;
  const enCours      = grouped[3]?.length ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="kbp-loading">
      <div className="kbp-spinner" />
      <span>Chargement du kanban…</span>
    </div>
  );

  return (
    <>
      <div className="kbp-root">

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="kbp-toolbar">
          <div className="kbp-toolbar-left">
            <div className="kbp-search-wrap">
              <FaSearch className="kbp-search-icon" />
              <input
                className="kbp-search"
                type="text"
                placeholder="Rechercher projet, réf BC, CP, lead…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="kbp-select-wrap">
              <FiFilter className="kbp-select-icon" />
              <select
                className="kbp-select"
                value={filterCP}
                onChange={e => setFilterCP(e.target.value)}
              >
                <option value="">Tous les CP</option>
                {cpList.map(cp => (
                  <option key={cp} value={cp}>{cp}</option>
                ))}
              </select>
            </div>

            <div className="kbp-select-wrap">
              <FaSyncAlt className="kbp-select-icon" />
              <select
                className="kbp-select"
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                {COLUMNS.map(c => (
                  <option key={c.statutId} value={String(c.statutId)}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="kbp-toolbar-right">
            <div className="kbp-kpi">
              <FaLayerGroup className="kbp-kpi-icon" />
              <span className="kbp-kpi-value">{totalProjets}</span>
              <span className="kbp-kpi-label">Projets</span>
            </div>
            <div className="kbp-kpi kbp-kpi--active">
              <FaPlay className="kbp-kpi-icon" />
              <span className="kbp-kpi-value">{enCours}</span>
              <span className="kbp-kpi-label">En cours</span>
            </div>
            <div className="kbp-kpi kbp-kpi--done">
              <FaFlagCheckered className="kbp-kpi-icon" />
              <span className="kbp-kpi-value">{termines}</span>
              <span className="kbp-kpi-label">Terminés</span>
            </div>
          </div>
        </div>

        {/* ── Légende ──────────────────────────────────────────────────────── */}
        <div className="kbp-legend">
          {COLUMNS.map(col => (
            <span
              key={col.statutId}
              className="kbp-legend-item"
              style={{ '--col-color': col.color } as React.CSSProperties}
            >
              <col.Icon className="kbp-legend-icon" />
              <span className="kbp-legend-label">{col.label}</span>
              <span className="kbp-legend-count">
                {grouped[col.statutId]?.length ?? 0}
              </span>
            </span>
          ))}
        </div>

        {/* ── Board ────────────────────────────────────────────────────────── */}
        <div className="kbp-board">
          {COLUMNS.map(col => (
            <KanbanColonne
              key={col.statutId}
              col={col}
              projets={grouped[col.statutId] ?? []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              statutMap={statutMap}
              onDetails={p => { setSelectedProjet(p); setShowDetails(true); }}
              onEdit={p => { setSelectedProjet(p); setShowForm(true); }}
              onBacklog={p => { setSelectedForBacklog(p); setShowBacklog(true); }}
            />
          ))}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <FormProjet
        show={showForm}
        onClose={() => { setShowForm(false); setSelectedProjet(null); }}
        projet={selectedProjet}
        onSubmit={async () => { await onProjetSaved(); }}
      />

      <ProjetDetails
        show={showDetails}
        onClose={() => { setShowDetails(false); setSelectedProjet(null); }}
        projet={selectedProjet}
      />

      <BacklogProjetModal
        show={showBacklog}
        onClose={() => { setShowBacklog(false); setSelectedForBacklog(null); }}
        projetId={selectedForBacklog?.idProjet ?? 0}
        projetNom={selectedForBacklog?.nomProjet}
        leadId={selectedForBacklog?.lead?.leadId ?? null}
        projectStartDate={selectedForBacklog?.dateDebutPrevu ?? null}
        projectEndDate={selectedForBacklog?.dateFinPrevu ?? null}
      />
    </>
  );
};

export default KanbanProjet;