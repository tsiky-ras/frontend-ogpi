import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '../../../../components/header/Header.tsx';
import Button from '../../../../components/button/Button.tsx';
import { FaPlus, FaTrophy } from 'react-icons/fa';
import FilterBar from '../../../../components/filters/FilterBar.tsx';
import Table from '../../../../components/table/Table.tsx';
import MenuListeProjet from '../menu/MenuListeProjet.tsx';
import FormProjet from '../form/FormProjet.tsx';
import ProjetDetails from '../form/details/ProjetDetails.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ListeProjet.css';
import { Projet } from '../../../../types/projet/Projet.tsx';
import BacklogProjetModal from '../backlog/BacklogProjetModal.tsx';
import { ProjetAvancement } from '../../../../services/projet/ProjetAvancementService.tsx';
import { useComparaisonService } from '../../../../services/projet/comparaison/ComparaisonService.tsx';
import { useLeadTechFinDetailsService } from '../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx';
import { useAuth } from '../../../../context/AuthContext.tsx';

// ─── Palette ──────────────────────────────────────────────────────────────────

const P = {
  charcoal: '#223A46',
  tomato:   '#C93C29',
  success:  '#2d8f47',
  dim:      '#5F6F6E',
  linen:    '#E8E5D7',
  white:    '#ffffff',
};

// ─── Filtre temporel ──────────────────────────────────────────────────────────

type FiltrePeriode = 'tous' | 'semaine' | 'mois' | 'annee';

interface PeriodeBorne { debut: Date; fin: Date; }

function getBornes(periode: FiltrePeriode): PeriodeBorne | null {
  if (periode === 'tous') return null;
  const now   = new Date();
  const debut = new Date(now);
  const fin   = new Date(now);

  if (periode === 'semaine') {
    const jour = now.getDay() === 0 ? 6 : now.getDay() - 1;
    debut.setDate(now.getDate() - jour);
    fin.setDate(debut.getDate() + 6);
  } else if (periode === 'mois') {
    debut.setDate(1);
    fin.setMonth(now.getMonth() + 1, 0);
  } else if (periode === 'annee') {
    debut.setMonth(0, 1);
    fin.setMonth(11, 31);
  }

  debut.setHours(0, 0, 0, 0);
  fin.setHours(23, 59, 59, 999);
  return { debut, fin };
}

function projetDansPeriode(p: Projet, bornes: PeriodeBorne | null): boolean {
  if (!bornes) return true;
  const { debut, fin } = bornes;
  if (p.dateDebutPrevu || p.dateFinPrevu) {
    const starts = p.dateDebutPrevu ? new Date(p.dateDebutPrevu) : new Date(0);
    const ends   = p.dateFinPrevu   ? new Date(p.dateFinPrevu)   : new Date('9999-12-31');
    if (starts <= fin && ends >= debut) return true;
  }
  if (p.dateAttribution) {
    const da = new Date(p.dateAttribution);
    if (da >= debut && da <= fin) return true;
  }
  return false;
}

// ─── Statuts ──────────────────────────────────────────────────────────────────

interface StatutMeta { label: string; color: string; bg: string; }

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

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtDec = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const StatutBadge: React.FC<{ statutId: number | null; loading: boolean }> = ({ statutId, loading }) => {
  if (loading) return <div className="avancement-skeleton" style={{ width: 90 }} />;
  if (statutId === null) return <span className="projet-statut-badge projet-statut-badge--none">Ouvert</span>;
  const meta = STATUT_META[statutId];
  if (!meta) return null;
  return (
    <span className="projet-statut-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}>
      <span className="projet-statut-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
};

// ─── Type financier par projet ─────────────────────────────────────────────────
// Alimenté depuis l'endpoint /api/comparaison/projet/{id} — un seul appel par projet.
// margeNette = Signé − Budget backlog projet − Charges annexes

interface ProjetFin {
  margeNette:  number;   // Signé ↔ Projet après charges (valeur dashboard)
  deviseAbr:   string;
  loaded:      boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ListeProjetProps {
  projets:       Projet[];
  statutMap:     Map<number, number>;
  avancements:   Map<number, ProjetAvancement>;
  loading:       boolean;
  onProjetSaved: () => Promise<void>;
}

// ─── Composant principal ──────────────────────────────────────────────────────

const ListeProjet: React.FC<ListeProjetProps> = ({
  projets, statutMap, avancements, loading, onProjetSaved,
}) => {
  const { getByProjetId } = useComparaisonService();
  const leadTechFinService = useLeadTechFinDetailsService();

  // ── deviseMap (fallback si la comparaison ne renvoie pas la devise) ──────
  const [deviseMap,      setDeviseMap]      = useState<Map<number, string>>(new Map());
  const [loadingDevises, setLoadingDevises] = useState(false);

  useEffect(() => {
    if (!projets.length) return;
    const leadIds = [
      ...new Set(projets.map(p => p.lead?.leadId).filter((id): id is number => id != null && id > 0)),
    ];
    if (!leadIds.length) return;
    setLoadingDevises(true);
    Promise.allSettled(
      leadIds.map(leadId =>
        leadTechFinService.getByLeadId(leadId)
          .then(tf => ({ leadId, devise: tf?.devise?.abrDevise ?? null }))
          .catch(() => ({ leadId, devise: null }))
      )
    ).then(results => {
      const leadDeviseMap = new Map<number, string>();
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.devise)
          leadDeviseMap.set(r.value.leadId, r.value.devise);
      });
      const map = new Map<number, string>();
      projets.forEach(p => {
        const pid    = p.idProjet ?? 0;
        const leadId = p.lead?.leadId;
        map.set(pid, (leadId ? leadDeviseMap.get(leadId) : null) ?? '€');
      });
      setDeviseMap(map);
    }).finally(() => setLoadingDevises(false));
  }, [projets]);

  const deviseGlobale = useMemo(() => {
    if (!deviseMap.size) return '';
    const count = new Map<string, number>();
    deviseMap.forEach(d => count.set(d, (count.get(d) ?? 0) + 1));
    let best = ''; let bestN = 0;
    count.forEach((n, d) => { if (n > bestN) { best = d; bestN = n; } });
    return count.size === 1 ? best : 'multi';
  }, [deviseMap]);

  // ── Marge nette depuis /api/comparaison/projet/{id} ──────────────────────
  // Un seul appel par projet lié à un lead.
  // La valeur = montantSigne − budgetProjet − chargesAnnexes (Signé ↔ Projet après charges)
  const [finMap,      setFinMap]      = useState<Map<number, ProjetFin>>(new Map());
  const [loadedCount, setLoadedCount] = useState(0);

  const loadFinForProjet = useCallback(async (p: Projet) => {
    const projetId = p.idProjet ?? 0;
    if (!projetId || !p.lead?.leadId) {
      setFinMap(prev => new Map(prev).set(projetId, { margeNette: 0, deviseAbr: '€', loaded: true }));
      setLoadedCount(c => c + 1);
      return;
    }
    try {
      const data = await getByProjetId(projetId);
      // margeNette = Signé − Budget backlog projet − Charges annexes
      const margeNette = (data.offreMontantSigne ?? 0)
        - (data.montantBacklogProjet ?? 0)
        - (data.totalChargesAnnexes ?? 0);
      const deviseAbr = data.deviseAbr ?? '€';
      setFinMap(prev => new Map(prev).set(projetId, { margeNette, deviseAbr, loaded: true }));
      // Mettre à jour la deviseMap avec la valeur du backend (plus fiable)
      setDeviseMap(prev => new Map(prev).set(projetId, deviseAbr));
    } catch {
      setFinMap(prev => new Map(prev).set(projetId, { margeNette: 0, deviseAbr: deviseMap.get(projetId) ?? '€', loaded: true }));
    } finally {
      setLoadedCount(c => c + 1);
    }
  }, [getByProjetId, deviseMap]);

  useEffect(() => {
    if (!projets.length) return;
    setFinMap(new Map());
    setLoadedCount(0);
    projets.forEach(p => loadFinForProjet(p));
  }, [projets]);

  // ── States UI ─────────────────────────────────────────────────────────────
  const [search,                   setSearch]                   = useState('');
  const [filtreStatutId,           setFiltreStatutId]           = useState<number>(0);
  const [filtrePeriode,            setFiltrePeriode]            = useState<FiltrePeriode>('tous');
  const [showFormProjet,           setShowFormProjet]           = useState(false);
  const [selectedProjet,           setSelectedProjet]           = useState<Projet | null>(null);
  const [showProjetDetails,        setShowProjetDetails]        = useState(false);
  const [expandedRowId,            setExpandedRowId]            = useState<number | null>(null);
  const [showBacklogModal,         setShowBacklogModal]         = useState(false);
  const [selectedProjetForBacklog, setSelectedProjetForBacklog] = useState<Projet | null>(null);
  const [formDirty,                setFormDirty]                = useState(false);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const bornes         = useMemo(() => getBornes(filtrePeriode), [filtrePeriode]);
  const projetsPeriode = useMemo(() => projets.filter(p => projetDansPeriode(p, bornes)), [projets, bornes]);

  const filteredProjets = useMemo(() => {
    let result = projetsPeriode;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.nomProjet?.toLowerCase().includes(q) ||
        (p.refBC ?? '').toLowerCase().includes(q) ||
        (p.userCp?.username ?? '').toLowerCase().includes(q) ||
        (p.lead?.leadName ?? '').toLowerCase().includes(q)
      );
    }
    if (filtreStatutId !== 0)
      result = result.filter(p => statutMap.get(p.idProjet ?? 0) === filtreStatutId);
    return result;
  }, [projetsPeriode, search, filtreStatutId, statutMap]);

  // ── Agrégats dashboard ────────────────────────────────────────────────────
  const dashStats = useMemo(() => {
    const now = new Date();
    const enRetard = projetsPeriode.filter(p => {
      if (!p.dateFinPrevu) return false;
      return new Date(p.dateFinPrevu) < now && statutMap.get(p.idProjet ?? 0) !== 9;
    }).length;

    let margeNetteTotale = 0;
    let caEncaisseTot    = 0;

    projetsPeriode.forEach(p => {
      const pid = p.idProjet ?? 0;
      const fin = finMap.get(pid);
      if (!fin?.loaded) return;
      margeNetteTotale += fin.margeNette;
      caEncaisseTot    += avancements.get(pid)?.totalPaye ?? 0;
    });

    const loadedInPeriode = projetsPeriode.filter(p => finMap.get(p.idProjet ?? 0)?.loaded).length;
    const allDone   = loadedInPeriode >= projetsPeriode.length && projetsPeriode.length > 0;
    const pctLoaded = projetsPeriode.length > 0 ? Math.round((loadedInPeriode / projetsPeriode.length) * 100) : 0;
    const tauxMarge = caEncaisseTot > 0 ? (margeNetteTotale / caEncaisseTot) * 100 : null;

    return { enRetard, margeNetteTotale, caEncaisseTot, tauxMarge, allDone, pctLoaded, loadedInPeriode, total: projetsPeriode.length };
  }, [projetsPeriode, statutMap, avancements, finMap, loadedCount]);

  const statutOptions = useMemo(() => {
    const used = new Set<number>();
    statutMap.forEach(sid => used.add(sid));
    return Object.entries(STATUT_META)
      .map(([id, meta]) => ({ id: Number(id), ...meta }))
      .filter(s => used.has(s.id));
  }, [statutMap]);

  const handleOpenBacklog     = (p: Projet) => { setSelectedProjetForBacklog(p); setShowBacklogModal(true); };
  const handleCloseBacklog    = ()           => { setShowBacklogModal(false); setSelectedProjetForBacklog(null); };
  const handleCloseFormProjet = async () => {
    setShowFormProjet(false); setSelectedProjet(null);
    if (formDirty) { setFormDirty(false); await onProjetSaved(); }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const margeColor = dashStats.margeNetteTotale >= 0 ? P.success : P.tomato;
  const skl = (w = 60) => (
    <div style={{ height: 13, width: w, background: '#e5e7eb', borderRadius: 4, display: 'inline-block' }} />
  );
  const cardBase: React.CSSProperties = {
    background: P.white, border: `1px solid ${P.linen}`,
    borderRadius: 10, overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(34,58,70,0.07)',
  };
  const cardHeader = (color: string): React.CSSProperties => ({
    background: color, color: P.white,
    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
  });

  const periodes: { key: FiltrePeriode; label: string }[] = [
    { key: 'tous',    label: 'Tous' },
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois',    label: 'Mois' },
    { key: 'annee',   label: 'Année' },
  ];

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns = [
    { key: 'nomProjet', label: 'Nom du projet' },
    {
      key: 'lead', label: 'Opportunité associée',
      render: (row: Projet) => row.lead ? `${row.lead.leadRef || '-'} – ${row.lead.leadName || '-'}` : '-',
    },
    { key: 'refBC',     label: 'Réf BC' },
    { key: 'refCompte', label: 'Réf Compte' },
    {
      key: 'dateAttribution', label: "Date d'attribution",
      render: (row: Projet) => row.dateAttribution ? new Date(row.dateAttribution).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'dateDebutPrevu', label: 'Date de début prévu',
      render: (row: Projet) => row.dateDebutPrevu ? new Date(row.dateDebutPrevu).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'dateFinPrevu', label: 'Date de fin prévu',
      render: (row: Projet) => {
        if (!row.dateFinPrevu) return '-';
        const fin    = new Date(row.dateFinPrevu);
        const retard = fin < new Date() && statutMap.get(row.idProjet ?? 0) !== 9;
        return (
          <span style={{ color: retard ? '#dc2626' : 'inherit', fontWeight: retard ? 500 : 'normal' }}>
            {fin.toLocaleDateString('fr-FR')}
            {retard && <span style={{ marginLeft: 4, fontSize: 10, background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '1px 5px' }}>Retard</span>}
          </span>
        );
      },
    },
    {
      key: 'userCp', label: 'Chef de projet',
      render: (row: Projet) => row.userCp?.username || <span style={{ color: '#f59e0b', fontSize: 12 }}>Non assigné</span>,
    },
    {
      key: 'userSuppleante', label: 'Suppléante',
      render: (row: Projet) => row.userSuppleante?.username || '-',
    },
    {
      key: 'statut', label: 'Statut',
      render: (row: Projet) => <StatutBadge statutId={statutMap.get(row.idProjet ?? 0) ?? null} loading={loading} />,
    },
    {
      key: 'ca', label: 'Chiffre d\'affaire brute',
      render: (row: Projet) => {
        const a      = avancements.get(row.idProjet ?? 0);
        const devise = finMap.get(row.idProjet ?? 0)?.deviseAbr ?? deviseMap.get(row.idProjet ?? 0) ?? '€';
        if (loading || loadingDevises) return <div className="avancement-skeleton" style={{ width: 80 }} />;
        if (!a || a.totalPaye === 0) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;
        return (
          <span style={{ fontWeight: 600, color: P.success, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            {fmt(a.totalPaye)} {devise}
          </span>
        );
      },
    },
    {
      key: 'marge_nette', label: 'Bénéfice',
      render: (row: Projet) => {
        const pid  = row.idProjet ?? 0;
        const fin  = finMap.get(pid);
        if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 90 }} />;
        // Projets sans lead → pas de comparaison possible
        if (!row.lead?.leadId) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;
        const mc = fin.margeNette >= 0 ? P.success : P.tomato;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontWeight: 700, color: mc, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              {fin.margeNette >= 0 ? '+' : ''}{fmt(fin.margeNette)} {fin.deviseAbr}
            </span>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>Signé − Projet − Charges</span>
          </div>
        );
      },
    },
    {
      key: 'actions', label: 'Actions',
      render: (row: Projet) => (
        <MenuListeProjet
          onDetails={()     => { setSelectedProjet(row); setShowProjetDetails(true); }}
          onEdit={()        => { setSelectedProjet(row); setFormDirty(false); setShowFormProjet(true); }}
          onViewBacklog={() => handleOpenBacklog(row)}
        />
      ),
    },
  ];

  const renderExpandedRow = (row: Projet) => {
    const sid  = statutMap.get(row.idProjet ?? 0) ?? null;
    const meta = sid !== null ? STATUT_META[sid] : null;
    return (
      <div className="expanded-row-content p-4 bg-light">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="expanded-label">Lead</label>
            <p className="expanded-text">{row.lead ? `${row.lead.leadRef || '-'} – ${row.lead.leadName || '-'}` : '-'}</p>
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
            <p className="expanded-text">{row.dateDebutPrevu ? new Date(row.dateDebutPrevu).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
          <div className="col-md-6">
            <label className="expanded-label">Date de fin prévu</label>
            <p className="expanded-text">{row.dateFinPrevu ? new Date(row.dateFinPrevu).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
        </div>
        <div className="row g-3 mt-3">
          <div className="col-md-4">
            <label className="expanded-label">Statut</label>
            <p className="expanded-text" style={{ marginTop: 4 }}>
              {meta
                ? <span className="projet-statut-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}>
                    <span className="projet-statut-dot" style={{ background: meta.color }} />{meta.label}
                  </span>
                : <span className="projet-statut-badge projet-statut-badge--none">Non défini</span>}
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

  return (
    <div className="liste-projet-layout">
      <Header />
      <div className="liste-projet-wrapper">
        <main className="liste-projet-main">
          <div className="container-fluid">

            {/* Bouton créer */}
            <div className="row align-items-center mb-3">
              <div className="col-lg-8 col-md-12 mb-2 mb-lg-0" />
              <div className="col-lg-4 col-md-12 text-lg-end">
                <Button
                  label="Créer un projet"
                  icon={<FaPlus />}
                  onClick={() => { setSelectedProjet(null); setFormDirty(false); setShowFormProjet(true); }}
                />
              </div>
            </div>

            {/* ── Filtre période ── */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: P.linen, borderRadius: 8, padding: '4px 6px',
              marginBottom: 18,
            }}>
              {periodes.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFiltrePeriode(key)}
                  style={{
                    padding: '5px 16px', fontSize: 12, fontWeight: 600,
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: filtrePeriode === key ? P.charcoal : 'transparent',
                    color:      filtrePeriode === key ? P.white     : P.dim,
                    boxShadow:  filtrePeriode === key ? '0 1px 4px rgba(34,58,70,0.18)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Dashboard : 3 cartes ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 24 }}>

              {/* 1. Projets actifs */}
              <div style={cardBase}>
                <div style={cardHeader(P.charcoal)}>Projets actifs</div>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: P.charcoal, lineHeight: 1 }}>
                    {loading ? skl(40) : dashStats.total}
                  </div>
                  <div style={{ fontSize: 12, color: P.dim, marginTop: 8 }}>
                    {loading ? skl(90) : (() => {
                      const termines = projetsPeriode.filter(p => statutMap.get(p.idProjet ?? 0) === 9).length;
                      return `${dashStats.total - termines} en cours · ${termines} terminés`;
                    })()}
                  </div>
                  {filtrePeriode !== 'tous' && !loading && (
                    <div style={{
                      display: 'inline-block', marginTop: 6,
                      fontSize: 10, color: P.charcoal, fontWeight: 600,
                      background: P.linen, borderRadius: 99, padding: '2px 8px',
                    }}>
                      {projets.length} total · filtre {periodes.find(p => p.key === filtrePeriode)?.label}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Marge nette totale (Signé ↔ Projet après charges) */}
              <div style={{ ...cardBase, borderLeft: `4px solid ${margeColor}` }}>
                <div style={cardHeader(P.charcoal)}>
                  <FaTrophy size={12} style={{ opacity: 0.85 }} />
                  Marge nette totale
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, color: P.dim, marginBottom: 12 }}>
                    Σ (Montant signé − Budget projet − Charges annexes) · Signé↔Projet
                  </div>

                  {/* Barre de chargement progressive */}
                  {!dashStats.allDone && dashStats.total > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 3, background: P.linen, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${dashStats.pctLoaded}%`,
                          background: margeColor, borderRadius: 999, transition: 'width 0.3s',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: P.dim, marginTop: 3 }}>
                        {dashStats.loadedInPeriode}/{dashStats.total} projets analysés…
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: margeColor, lineHeight: 1 }}>
                      {dashStats.loadedInPeriode === 0 && !dashStats.allDone
                        ? skl(120)
                        : `${dashStats.margeNetteTotale >= 0 ? '+' : ''}${fmt(dashStats.margeNetteTotale)}`
                      }
                      {!dashStats.allDone && dashStats.loadedInPeriode > 0 && (
                        <span style={{ fontSize: 16, color: P.dim, fontWeight: 400, marginLeft: 4 }}>…</span>
                      )}
                    </span>
                    {dashStats.loadedInPeriode > 0 && deviseGlobale === 'multi' && (
                      <span style={{ fontSize: 11, color: P.dim, fontStyle: 'italic', alignSelf: 'center' }}>multi-devises</span>
                    )}
                    {dashStats.loadedInPeriode > 0 && deviseGlobale && deviseGlobale !== 'multi' && (
                      <span style={{ fontSize: 20, fontWeight: 700, color: margeColor, opacity: 0.85 }}>{deviseGlobale}</span>
                    )}
                  </div>

                  {dashStats.tauxMarge !== null && dashStats.caEncaisseTot > 0 && (
                    <div style={{ fontSize: 11, color: P.dim }}>
                      CA encaissé : <strong style={{ color: P.success }}>{fmt(dashStats.caEncaisseTot)}</strong>
                      {deviseGlobale !== 'multi' && deviseGlobale && ` ${deviseGlobale}`}
                      {" · "}Taux : <strong style={{ color: margeColor }}>{dashStats.tauxMarge >= 0 ? '+' : ''}{fmtDec(dashStats.tauxMarge)} %</strong>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: P.dim, fontStyle: 'italic', marginTop: 4 }}>
                    + = rentable · − = déficitaire
                  </div>
                </div>
              </div>

              {/* 3. Projets en retard */}
              <div style={{
                ...cardBase,
                borderLeft: dashStats.enRetard > 0 ? `4px solid ${P.tomato}` : `4px solid ${P.success}`,
              }}>
                <div style={cardHeader(dashStats.enRetard > 0 ? P.tomato : P.charcoal)}>
                  {dashStats.enRetard > 0 ? '⚠ Projets en retard' : '✓ Délais respectés'}
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: dashStats.enRetard > 0 ? P.tomato : P.success }}>
                    {loading ? skl(40) : dashStats.enRetard}
                  </div>
                  <div style={{ fontSize: 12, color: P.dim, marginTop: 8 }}>
                    {loading ? skl(80) : dashStats.enRetard > 0
                      ? 'Date de fin dépassée'
                      : 'Tous les projets sont dans les délais'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Filtres ── */}
            <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
              <div style={{ flex: 1, minWidth: 200 }}>
                <FilterBar filters={[{ type: 'text', placeholder: 'Rechercher...', onChange: setSearch }]} />
              </div>
              <select
                value={filtreStatutId}
                onChange={e => setFiltreStatutId(Number(e.target.value))}
                className="form-select form-select-sm"
                style={{ width: 160 }}
              >
                <option value={0}>Tous les statuts</option>
                {statutOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {(filtreStatutId !== 0 || search.trim() || filtrePeriode !== 'tous') && (
                <span style={{ fontSize: '0.78rem', color: '#6b7280', flexShrink: 0 }}>
                  <strong style={{ color: '#4338ca' }}>{filteredProjets.length}</strong>
                  {' '}/ {projets.length} projet{projets.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Table */}
            <div className="table-responsive mt-2">
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

      <FormProjet
        show={showFormProjet}
        onClose={handleCloseFormProjet}
        projet={selectedProjet}
        onSubmit={async (_saved) => { setFormDirty(true); }}
      />

      <ProjetDetails
        show={showProjetDetails}
        onClose={() => { setShowProjetDetails(false); setSelectedProjet(null); }}
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