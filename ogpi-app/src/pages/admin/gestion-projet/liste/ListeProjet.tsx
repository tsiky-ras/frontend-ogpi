import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '../../../../components/header/Header.tsx';
import Button from '../../../../components/button/Button.tsx';
import { FaPlus, FaTrophy, FaCheckCircle, FaChartLine, FaMoneyBillWave, FaBalanceScale, FaReceipt } from 'react-icons/fa';
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

const P = {
  charcoal: '#223A46', tomato: '#C93C29', success: '#2d8f47', warning: '#d97706',
  dim: '#5F6F6E', linen: '#E8E5D7', white: '#ffffff', blue: '#3b82f6',
  purple: '#7c3aed', teal: '#0ea5e9', orange: '#f97316',
};

type FiltrePeriode = 'tous' | 'semaine' | 'mois' | 'annee';
interface PeriodeBorne { debut: Date; fin: Date; }

function getBornes(periode: FiltrePeriode): PeriodeBorne | null {
  if (periode === 'tous') return null;
  const now = new Date(); const debut = new Date(now); const fin = new Date(now);
  if (periode === 'semaine') { const jour = now.getDay() === 0 ? 6 : now.getDay() - 1; debut.setDate(now.getDate() - jour); fin.setDate(debut.getDate() + 6); }
  else if (periode === 'mois') { debut.setDate(1); fin.setMonth(now.getMonth() + 1, 0); }
  else if (periode === 'annee') { debut.setMonth(0, 1); fin.setMonth(11, 31); }
  debut.setHours(0, 0, 0, 0); fin.setHours(23, 59, 59, 999);
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
  if (p.dateAttribution) { const da = new Date(p.dateAttribution); if (da >= debut && da <= fin) return true; }
  return false;
}

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

const fmt   = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtJH = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const StatutBadge: React.FC<{ statutId: number | null; loading: boolean }> = ({ statutId, loading }) => {
  if (loading) return <div className="avancement-skeleton" style={{ width: 90 }} />;
  if (statutId === null) return <span className="projet-statut-badge projet-statut-badge--none">Ouvert</span>;
  const meta = STATUT_META[statutId];
  if (!meta) return null;
  return <span className="projet-statut-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}><span className="projet-statut-dot" style={{ background: meta.color }} />{meta.label}</span>;
};

const BudgetAlert: React.FC<{ pct: number | null }> = ({ pct }) => {
  if (pct === null) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;
  const color = pct > 95 ? P.tomato : pct > 80 ? P.warning : P.success;
  const bg    = pct > 95 ? '#fef2f2' : pct > 80 ? '#fffbeb' : '#ecfdf5';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: 99 }}>{Math.round(pct)}%</span>;
};

const MargeBadge: React.FC<{ marge: number; devise: string; size?: 'sm' | 'md' }> = ({ marge, devise, size = 'md' }) => {
  const color = marge > 0 ? P.success : marge < 0 ? P.tomato : P.warning;
  return <span style={{ fontWeight: 700, color, fontSize: size === 'sm' ? '0.75rem' : '0.83rem', whiteSpace: 'nowrap' }}>{marge >= 0 ? '+' : ''}{fmt(marge)} {devise}</span>;
};

const EcartBadge: React.FC<{ ecart: number; devise: string; inversed?: boolean }> = ({ ecart, devise, inversed = false }) => {
  const isGood = inversed ? ecart > 0 : ecart < 0;
  const color  = ecart === 0 ? P.warning : isGood ? P.success : P.tomato;
  return <span style={{ fontWeight: 600, color, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{ecart > 0 ? '+' : ''}{fmt(ecart)} {devise}</span>;
};

const NiveauxBar: React.FC<{
  offre: number; lead: number; projet: number; realise: number; devise: string;
}> = ({ offre, lead, projet, realise, devise }) => {
  const max = Math.max(offre, lead, projet, realise, 1);
  const bar = (val: number, color: string, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <div style={{ width: 42, fontSize: '0.62rem', color: P.dim, textAlign: 'right', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, (val / max) * 100)}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <div style={{ width: 70, fontSize: '0.65rem', fontWeight: 600, color, textAlign: 'right', flexShrink: 0 }}>{fmt(val)}</div>
    </div>
  );
  return (
    <div style={{ minWidth: 200 }}>
      {bar(offre,   P.blue,   'O. vendu')}
      {bar(lead,    P.purple, 'O. tech')}
      {bar(projet,  P.teal,   'Projet')}
      {bar(realise, realise > projet ? P.tomato : P.success, 'Réalisé')}
      <div style={{ fontSize: '0.6rem', color: P.dim, marginTop: 3, textAlign: 'right' }}>{devise}</div>
    </div>
  );
};

const ChargesAnnexesDetail: React.FC<{
  total: number; transport: number; hebergement: number;
  perDiem: number; autre: number; devise: string;
}> = ({ total, transport, hebergement, perDiem, autre, devise }) => {
  if (total === 0) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;
  return (
    <div style={{ minWidth: 130 }}>
      <div style={{ fontWeight: 700, color: P.warning, fontSize: '0.85rem', whiteSpace: 'nowrap', marginBottom: 4 }}>
        {fmt(total)} {devise}
      </div>
      {transport    > 0 && <div style={{ fontSize: '0.65rem', color: P.dim, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Transport</span><span style={{ fontWeight: 600 }}>{fmt(transport)}</span></div>}
      {hebergement  > 0 && <div style={{ fontSize: '0.65rem', color: P.dim, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Hébergement</span><span style={{ fontWeight: 600 }}>{fmt(hebergement)}</span></div>}
      {perDiem      > 0 && <div style={{ fontSize: '0.65rem', color: P.dim, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Per diem</span><span style={{ fontWeight: 600 }}>{fmt(perDiem)}</span></div>}
      {autre        > 0 && <div style={{ fontSize: '0.65rem', color: P.dim, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Autre</span><span style={{ fontWeight: 600 }}>{fmt(autre)}</span></div>}
    </div>
  );
};

interface ProjetFin {
  montantOffre: number; jhVendu: number; montantLead: number; jhLead: number;
  montantProjet: number; jhProjet: number; coutRealise: number; jhRealise: number;
  chargesAnnexes: number; chargesTransport: number; chargesHebergement: number;
  chargesPerDiem: number; chargesAutre: number; margeCommercialeMontant: number;
  margeCommercialeJH: number; tauxMargeCommercialePct: number | null;
  margeBudgetaireNette: number; tauxMargeBudgetairePct: number | null;
  ecartPlanifMontant: number; ecartPlanifJH: number; ecartRealiseMontant: number;
  ecartRealiseJH: number; tauxAvancementGlobal: number | null; tauxConsoJH: number | null;
  caEncaisse: number; caPlanifie: number; deviseAbr: string; loaded: boolean;
}

interface ListeProjetProps {
  projets: Projet[]; statutMap: Map<number, number>;
  avancements: Map<number, ProjetAvancement>;
  loading: boolean; onProjetSaved: () => Promise<void>;
}

const EMPTY_FIN = (devise = '€'): ProjetFin => ({
  montantOffre: 0, jhVendu: 0, montantLead: 0, jhLead: 0, montantProjet: 0, jhProjet: 0,
  coutRealise: 0, jhRealise: 0, chargesAnnexes: 0, chargesTransport: 0, chargesHebergement: 0,
  chargesPerDiem: 0, chargesAutre: 0, margeCommercialeMontant: 0, margeCommercialeJH: 0,
  tauxMargeCommercialePct: null, margeBudgetaireNette: 0, tauxMargeBudgetairePct: null,
  ecartPlanifMontant: 0, ecartPlanifJH: 0, ecartRealiseMontant: 0, ecartRealiseJH: 0,
  tauxAvancementGlobal: null, tauxConsoJH: null, caEncaisse: 0, caPlanifie: 0,
  deviseAbr: devise, loaded: true,
});

// ─────────────────────────────────────────────────────────────────────────
//  COLONNES VISIBLES PAR DÉFAUT au premier chargement (avant tout localStorage)
// ─────────────────────────────────────────────────────────────────────────
  const DEFAULT_VISIBLE_COLUMNS = ['nomProjet', 'budgetEtCharges', 'statut', 'actions'];

const ListeProjet: React.FC<ListeProjetProps> = ({ projets, statutMap, avancements, loading, onProjetSaved }) => {
  const { getByProjetId }      = useComparaisonService();
  const leadTechFinService     = useLeadTechFinDetailsService();
  const [deviseMap, setDeviseMap]           = useState<Map<number, string>>(new Map());
  const [loadingDevises, setLoadingDevises] = useState(false);
  const [expandedBudgetIds, setExpandedBudgetIds] = useState<Set<number>>(new Set());
  const toggleBudgetExpand = (pid: number) =>
    setExpandedBudgetIds(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  const [expandedMargeIds, setExpandedMargeIds] = useState<Set<number>>(new Set());
  const toggleMargeExpand = (pid: number) =>
    setExpandedMargeIds(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  const [expandedConsoIds, setExpandedConsoIds] = useState<Set<number>>(new Set());
  const toggleConsoExpand = (pid: number) =>
    setExpandedConsoIds(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  useEffect(() => {
    if (!projets.length) return;
    const leadIds = [...new Set(projets.map(p => p.lead?.leadId).filter((id): id is number => id != null && id > 0))];
    if (!leadIds.length) return;
    setLoadingDevises(true);
    Promise.allSettled(leadIds.map(leadId => leadTechFinService.getByLeadId(leadId).then(tf => ({ leadId, devise: tf?.devise?.abrDevise ?? null })).catch(() => ({ leadId, devise: null }))))
      .then(results => {
        const ldm = new Map<number, string>();
        results.forEach(r => { if (r.status === 'fulfilled' && r.value.devise) ldm.set(r.value.leadId, r.value.devise); });
        const map = new Map<number, string>();
        projets.forEach(p => { const pid = p.idProjet ?? 0; map.set(pid, (p.lead?.leadId ? ldm.get(p.lead.leadId) : null) ?? '€'); });
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

  const [finMap, setFinMap]           = useState<Map<number, ProjetFin>>(new Map());
  const [loadedCount, setLoadedCount] = useState(0);

  const loadFinForProjet = useCallback(async (p: Projet) => {
    const projetId = p.idProjet ?? 0;
    if (!projetId || !p.lead?.leadId) {
      setFinMap(prev => new Map(prev).set(projetId, EMPTY_FIN()));
      setLoadedCount(c => c + 1); return;
    }
    try {
      const data = await getByProjetId(projetId);
      const deviseAbr = data.deviseAbr ?? '€';
      const jhLead = data.jhBacklogLeadTotal ?? 0;
      const jhReal = data.jhRealiseTotal ?? 0;
      setFinMap(prev => new Map(prev).set(projetId, {
        montantOffre:  data.offreMontantSigne    ?? 0,
        jhVendu:       data.offreJhVendu          ?? 0,
        montantLead:   data.montantBacklogLead    ?? 0,
        jhLead:        data.jhBacklogLeadTotal    ?? 0,
        montantProjet: data.montantBacklogProjet  ?? 0,
        jhProjet:      data.jhBacklogProjetTotal  ?? 0,
        coutRealise:   data.coutRealiseTotal      ?? 0,
        jhRealise:     data.jhRealiseTotal        ?? 0,
        chargesAnnexes:     data.totalChargesAnnexes ?? 0,
        chargesTransport:   data.chargesTransport    ?? 0,
        chargesHebergement: data.chargesHebergement  ?? 0,
        chargesPerDiem:     data.chargesPerDiem       ?? 0,
        chargesAutre:       data.chargesAutre         ?? 0,
        margeCommercialeMontant: data.margeCommercialeMontant ?? 0,
        margeCommercialeJH:      data.margeCommercialeJhTotal ?? 0,
        tauxMargeCommercialePct: data.tauxMargeCommercialePct ?? null,
        margeBudgetaireNette:   data.margeBudgetaireNette    ?? 0,
        tauxMargeBudgetairePct: data.tauxMargeBudgetairePct  ?? null,
        ecartPlanifMontant:  data.ecartPlanificationMontant  ?? 0,
        ecartPlanifJH:       data.ecartPlanificationJhTotal  ?? 0,
        ecartRealiseMontant: data.ecartRealiseMontantTotal   ?? 0,
        ecartRealiseJH:      data.ecartRealiseJhTotal        ?? 0,
        tauxAvancementGlobal: data.tauxAvancementGlobalPct   ?? null,
        tauxConsoJH: jhLead > 0 ? (jhReal / jhLead) * 100 : null,
        caEncaisse: data.caEncaisse ?? 0,
        caPlanifie: data.caPlanifie ?? 0,
        deviseAbr, loaded: true,
      }));
      setDeviseMap(prev => new Map(prev).set(projetId, deviseAbr));
    } catch {
      setFinMap(prev => new Map(prev).set(projetId, EMPTY_FIN(deviseMap.get(projetId) ?? '€')));
    } finally {
      setLoadedCount(c => c + 1);
    }
  }, [getByProjetId, deviseMap]);

  useEffect(() => {
    if (!projets.length) return;
    setFinMap(new Map()); setLoadedCount(0);
    projets.forEach(p => loadFinForProjet(p));
  }, [projets]);

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
        (p.lead?.leadName ?? '').toLowerCase().includes(q) ||
        (p.lead?.clientName ?? '').toLowerCase().includes(q)
      );
    }
    if (filtreStatutId !== 0) result = result.filter(p => statutMap.get(p.idProjet ?? 0) === filtreStatutId);
    return result;
  }, [projetsPeriode, search, filtreStatutId, statutMap]);

  const dashStats = useMemo(() => {
    const now = new Date();
    const enRetard = projetsPeriode.filter(p => {
      if (!p.dateFinPrevu) return false;
      return new Date(p.dateFinPrevu) < now && statutMap.get(p.idProjet ?? 0) !== 9;
    }).length;

    let montantOffreTot = 0, montantLeadTot = 0, montantProjetTot = 0, coutRealiseTot = 0;
    let margeCommercialeTot = 0, margeBudgetaireNetteTot = 0, chargesAnnexesTot = 0, caEncaisseTot = 0;
    let jhVenduTot = 0, jhLeadTot = 0, jhProjetTot = 0, jhRealiseTot = 0, margeCommercialeJHTot = 0;
    let alertesRouges = 0, alertesOranges = 0;

    projetsPeriode.forEach(p => {
      const pid = p.idProjet ?? 0;
      const fin = finMap.get(pid);
      if (fin?.loaded) {
        montantOffreTot         += fin.montantOffre;
        montantLeadTot          += fin.montantLead;
        montantProjetTot        += fin.montantProjet;
        coutRealiseTot          += fin.coutRealise;
        margeCommercialeTot     += fin.margeCommercialeMontant;
        margeBudgetaireNetteTot += fin.margeBudgetaireNette;
        chargesAnnexesTot       += fin.chargesAnnexes;
        caEncaisseTot           += fin.caEncaisse || (avancements.get(pid)?.totalPaye ?? 0);
        jhVenduTot              += fin.jhVendu;
        jhLeadTot               += fin.jhLead;
        jhProjetTot             += fin.jhProjet;
        jhRealiseTot            += fin.jhRealise;
        margeCommercialeJHTot   += fin.margeCommercialeJH;
        if (fin.tauxConsoJH !== null) {
          if (fin.tauxConsoJH > 95) alertesRouges++;
          else if (fin.tauxConsoJH > 80) alertesOranges++;
        }
      }
    });

    const loadedInPeriode = projetsPeriode.filter(p => finMap.get(p.idProjet ?? 0)?.loaded).length;
    const allDone   = loadedInPeriode >= projetsPeriode.length && projetsPeriode.length > 0;
    const pctLoaded = projetsPeriode.length > 0 ? Math.round((loadedInPeriode / projetsPeriode.length) * 100) : 0;
    const tauxMargeComm = montantOffreTot > 0 ? (margeCommercialeTot / montantOffreTot) * 100 : null;
    const tauxMargeBud  = montantOffreTot > 0 ? (margeBudgetaireNetteTot / montantOffreTot) * 100 : null;

    return {
      enRetard, montantOffreTot, montantLeadTot, montantProjetTot, coutRealiseTot,
      margeCommercialeTot, margeBudgetaireNetteTot, chargesAnnexesTot, caEncaisseTot,
      jhVenduTot, jhLeadTot, jhProjetTot, jhRealiseTot, margeCommercialeJHTot,
      alertesRouges, alertesOranges, tauxMargeComm, tauxMargeBud,
      allDone, pctLoaded, loadedInPeriode, total: projetsPeriode.length,
    };
  }, [projetsPeriode, statutMap, avancements, finMap, loadedCount]);

  const statutOptions = useMemo(() => {
    const used = new Set<number>();
    statutMap.forEach(sid => used.add(sid));
    return Object.entries(STATUT_META)
      .map(([id, meta]) => ({ id: Number(id), ...meta }))
      .filter(s => used.has(s.id));
  }, [statutMap]);

  const handleOpenBacklog  = (p: Projet) => { setSelectedProjetForBacklog(p); setShowBacklogModal(true); };
  const handleCloseBacklog = async () => { setShowBacklogModal(false); setSelectedProjetForBacklog(null); await onProjetSaved(); };
  const handleCloseFormProjet = async () => { setShowFormProjet(false); setSelectedProjet(null); setFormDirty(false); await onProjetSaved(); };

  const margeCommColor = dashStats.margeCommercialeTot >= 0 ? P.success : P.tomato;
  const margeBudColor  = dashStats.margeBudgetaireNetteTot >= 0 ? P.success : P.tomato;
  const skl = (w = 60) => <div style={{ height: 13, width: w, background: '#e5e7eb', borderRadius: 4, display: 'inline-block' }} />;

  const cardBase: React.CSSProperties = { background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(34,58,70,0.07)' };
  const cardHeader = (color: string): React.CSSProperties => ({ background: color, color: P.white, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const });
  const periodes: { key: FiltrePeriode; label: string }[] = [
    { key: 'tous', label: 'Tous' }, { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' }, { key: 'annee', label: 'Année' },
  ];

  const loadingBar = (color: string) => !dashStats.allDone && dashStats.total > 0 ? (
    <div style={{ height: 3, background: P.linen, borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
      <div style={{ height: '100%', width: `${dashStats.pctLoaded}%`, background: color, borderRadius: 999, transition: 'width 0.3s' }} />
    </div>
  ) : null;

  // ─────────────────────────────────────────────────────────────────────────
  //  COLONNES TABLEAU
  // ─────────────────────────────────────────────────────────────────────────
  const columns = [
    { key: 'nomProjet', label: 'Nom du projet' },
    {
      key: 'lead', label: 'Opportunité associée',
      render: (row: Projet) => row.lead ? `${row.lead.leadRef || '-'} – ${row.lead.leadName || '-'}` : '-',
    },
    { key: 'refBC',     label: 'Réf BC' },
    { key: 'refCompte', label: 'Réf Compte' },
    {
      key: 'userCp', label: 'Chef de projet',
      render: (row: Projet) => row.userCp?.username
        ? <span style={{ fontWeight: 500 }}>{row.userCp.username}</span>
        : <span style={{ color: P.warning, fontSize: 12 }}>Non assigné</span>,
    },
    {
      key: 'dateDebutPrevu', label: 'Début',
      render: (row: Projet) => row.dateDebutPrevu ? new Date(row.dateDebutPrevu).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'dateFinPrevu', label: 'Fin prévu',
      render: (row: Projet) => {
        if (!row.dateFinPrevu) return '-';
        const fin = new Date(row.dateFinPrevu);
        const retard = fin < new Date() && statutMap.get(row.idProjet ?? 0) !== 9;
        return (
          <span style={{ color: retard ? P.tomato : 'inherit', fontWeight: retard ? 600 : 'normal' }}>
            {fin.toLocaleDateString('fr-FR')}
            {retard && <span style={{ marginLeft: 4, fontSize: 10, background: '#fef2f2', color: P.tomato, borderRadius: 4, padding: '1px 5px' }}>Retard</span>}
          </span>
        );
      },
    },
    {
      key: 'statut', label: 'Statut',
      render: (row: Projet) => <StatutBadge statutId={statutMap.get(row.idProjet ?? 0) ?? null} loading={loading} />,
    },
    // {
    //   key: 'budget4niveaux', label: 'Budget HT',
    //   render: (row: Projet) => {
    //     const pid = row.idProjet ?? 0;
    //     const fin = finMap.get(pid);
    //     if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 180 }} />;
    //     if (!row.lead?.leadId) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;
    //     return (
    //       <NiveauxBar
    //         offre={fin.montantOffre} lead={fin.montantLead}
    //         projet={fin.montantProjet} realise={fin.coutRealise}
    //         devise={fin.deviseAbr}
    //       />
    //     );
    //   },
    // },
    {
      key: 'budgetEtCharges', label: 'Budget & Charges annexes',
      render: (row: Projet) => {
        const pid      = row.idProjet ?? 0;
        const fin      = finMap.get(pid);
        const expanded = expandedBudgetIds.has(pid);

        if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 160 }} />;
        if (!row.lead?.leadId) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;

        const leadAvecCharges   = fin.montantLead   + fin.chargesAnnexes;
        const projetAvecCharges = fin.montantProjet + fin.chargesAnnexes;
        const hasCharges        = fin.chargesAnnexes > 0;

        const ligne = (label: string, val: number, color: string) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
            <span style={{ fontSize: '0.62rem', color: P.dim }}>{label}</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>{fmt(val)} {fin.deviseAbr}</span>
          </div>
        );

        return (
          <div style={{ minWidth: 190 }}>
            {/* ── Niveau 1 : Budget Projet seul ── */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: P.teal, whiteSpace: 'nowrap' }}>
                {fmt(fin.montantProjet)} {fin.deviseAbr}
              </span>
              {hasCharges && (
                <span style={{ fontSize: '0.62rem', color: P.warning, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  +{fmt(fin.chargesAnnexes)} ch.
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.6rem', color: P.dim, marginBottom: 5 }}>Budget projet</div>

            {/* ── Bouton toggle ── */}
            <button
              onClick={() => toggleBudgetExpand(pid)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '0.6rem', fontWeight: 600,
                color: expanded ? P.dim : P.charcoal,
                background: expanded ? '#f1f5f9' : P.linen,
                border: `1px solid ${expanded ? '#cbd5e1' : '#d1c9b4'}`,
                borderRadius: 99, padding: '2px 8px', cursor: 'pointer',
              }}
            >
              <span>{expanded ? '▲' : '▼'}</span>
              {expanded ? 'Réduire' : 'Voir comparaison'}
            </button>

            {/* ── Niveau 2 : comparaison texte ── */}
            {expanded && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>

                {/* ── Sans charges annexes ── */}
                <div style={{
                  fontSize: '0.58rem', fontWeight: 700, color: P.white,
                  background: P.charcoal, borderRadius: 4, padding: '1px 7px',
                  display: 'inline-block', letterSpacing: '0.04em', marginBottom: 5,
                }}>
                  SANS CHARGES ANNEXES
                </div>
                {ligne('O. vendu',  fin.montantOffre,  P.blue)}
                {ligne('O. tech',   fin.montantLead,   P.purple)}
                {ligne('Projet',    fin.montantProjet, P.teal)}
                {ligne('Réalisé',   fin.coutRealise,   fin.coutRealise > fin.montantProjet ? P.tomato : P.success)}

                {hasCharges && (
                  <>
                    {/* ── Détail charges ── */}
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                      <div style={{
                        fontSize: '0.58rem', fontWeight: 700, color: P.white,
                        background: P.warning, borderRadius: 4, padding: '1px 7px',
                        display: 'inline-block', letterSpacing: '0.04em', marginBottom: 5,
                      }}>
                        CHARGES ANNEXES
                      </div>
                      <ChargesAnnexesDetail
                        total={fin.chargesAnnexes} transport={fin.chargesTransport}
                        hebergement={fin.chargesHebergement} perDiem={fin.chargesPerDiem}
                        autre={fin.chargesAutre} devise={fin.deviseAbr}
                      />
                    </div>

                    {/* ── Avec charges annexes ── */}
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                      <div style={{
                        fontSize: '0.58rem', fontWeight: 700, color: P.white,
                        background: P.teal, borderRadius: 4, padding: '1px 7px',
                        display: 'inline-block', letterSpacing: '0.04em', marginBottom: 5,
                      }}>
                        AVEC CHARGES ANNEXES
                      </div>
                      {ligne('O. tech + charges',  leadAvecCharges,   P.purple)}
                      {ligne('Projet + charges',   projetAvecCharges, P.teal)}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      },
    },
  {
    key: 'consoJH', label: 'Conso. JH',
    render: (row: Projet) => {
      const pid      = row.idProjet ?? 0;
      const fin      = finMap.get(pid);
      const expanded = expandedConsoIds.has(pid);

      if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 100 }} />;
      if (!row.lead?.leadId) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;

      const pctVsProjet = fin.jhProjet > 0 ? (fin.jhRealise / fin.jhProjet) * 100 : null;
      const pctVsLead   = fin.jhLead   > 0 ? (fin.jhRealise / fin.jhLead)   * 100 : null;

      const colorFromPct = (pct: number | null, baseColor: string) =>
        pct === null  ? baseColor
        : pct > 100   ? P.tomato
        : pct === 100 ? P.success
        : pct > 85    ? P.warning
        : baseColor;

      const projetColor = colorFromPct(pctVsProjet, P.teal);
      const leadColor   = colorFromPct(pctVsLead,   P.blue);

      return (
        <div style={{ minWidth: 130 }}>
          {/* ── Niveau 1 : réel vs projet ── */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: projetColor, whiteSpace: 'nowrap' }}>
              {fmtJH(fin.jhRealise)} JH
            </span>
            {fin.jhProjet > 0 && (
              <span style={{ fontSize: '0.62rem', color: P.dim, whiteSpace: 'nowrap' }}>
                / {fmtJH(fin.jhProjet)} projet
              </span>
            )}
          </div>
          {/* ── Bouton toggle ── */}
          <button
            onClick={() => toggleConsoExpand(pid)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.6rem', fontWeight: 600,
              color: expanded ? P.dim : P.charcoal,
              background: expanded ? '#f1f5f9' : P.linen,
              border: `1px solid ${expanded ? '#cbd5e1' : '#d1c9b4'}`,
              borderRadius: 99, padding: '2px 8px', cursor: 'pointer',
            }}
          >
            <span>{expanded ? '▲' : '▼'}</span>
            {expanded ? 'Réduire' : 'Voir comparaison'}
          </button>

          {/* ── Niveau 2 : vs O.tech + écarts ── */}
          {expanded && (
            <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px dashed #e2e8f0' }}>
              <div style={{ fontSize: '0.6rem', color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                vs O. tech (lead)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
                <span style={{ fontSize: '0.62rem', color: P.dim }}>Réel</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: leadColor }}>{fmtJH(fin.jhRealise)} JH</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: '0.62rem', color: P.dim }}>O. tech</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: P.dim }}>{fmtJH(fin.jhLead)} JH</span>
              </div>
              {pctVsLead !== null && (
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: leadColor, marginBottom: 4 }}>
                  {Math.round(pctVsLead)}%
                  <span style={{ fontWeight: 400, color: P.dim, marginLeft: 3 }}>vs O.tech</span>
                </div>
              )}
              {fin.ecartRealiseJH !== 0 && (
                <div style={{ fontSize: '0.62rem', color: fin.ecartRealiseJH > 0 ? P.tomato : P.success }}>
                  {fin.ecartRealiseJH > 0 ? '▲' : '▼'} {Math.abs(fin.ecartRealiseJH).toFixed(1)} JH vs planifié
                </div>
              )}
              {fin.ecartPlanifJH !== 0 && (
                <div style={{ marginTop: 2, fontSize: '0.62rem', color: fin.ecartPlanifJH > 0 ? P.tomato : P.success }}>
                  {fin.ecartPlanifJH > 0 ? '▲' : '▼'} {Math.abs(fin.ecartPlanifJH).toFixed(1)} JH O.tech vs Projet
                </div>
              )}
            </div>
          )}
        </div>
      );
    },
  },
    // {
    //   key: 'chargesAnnexes', label: 'Charges annexes',
    //   render: (row: Projet) => {
    //     const pid = row.idProjet ?? 0;
    //     const fin = finMap.get(pid);
    //     if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 100 }} />;
    //     if (!row.lead?.leadId) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;
    //     return (
    //       <ChargesAnnexesDetail
    //         total={fin.chargesAnnexes} transport={fin.chargesTransport}
    //         hebergement={fin.chargesHebergement} perDiem={fin.chargesPerDiem}
    //         autre={fin.chargesAutre} devise={fin.deviseAbr}
    //       />
    //     );
    //   },
    // },
    {
      key: 'ca', label: 'Encaissé',
      render: (row: Projet) => {
        const pid = row.idProjet ?? 0;
        const fin = finMap.get(pid);
        const av  = avancements.get(pid);
        const devise    = fin?.deviseAbr ?? deviseMap.get(pid) ?? '€';
        const totalPaye = fin?.caEncaisse || (av?.totalPaye ?? 0);
        if (loading || loadingDevises) return <div className="avancement-skeleton" style={{ width: 80 }} />;
        if (!totalPaye) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;
        const pctCA = fin && fin.montantOffre > 0 ? (totalPaye / fin.montantOffre) * 100 : null;
        return (
          <div>
            <span style={{ fontWeight: 700, color: P.success, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{fmt(totalPaye)} {devise}</span>
            {fin && fin.montantOffre > 0 && (
              <div style={{ fontSize: '0.7rem', color: P.dim }}>/ {fmt(fin.montantOffre)} O.vendu</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'marges', label: 'Marges',
      render: (row: Projet) => {
        const pid      = row.idProjet ?? 0;
        const fin      = finMap.get(pid);
        const expanded = expandedMargeIds.has(pid);

        if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 110 }} />;
        if (!row.lead?.leadId) return <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>;

        const netteColor = fin.margeBudgetaireNette >= 0 ? P.success : P.tomato;

        return (
          <div style={{ minWidth: 145 }}>

            {/* ── Niveau 1 : Marge nette toujours visible ── */}
            <MargeBadge marge={fin.margeBudgetaireNette} devise={fin.deviseAbr} size="sm" />
            <div style={{ fontSize: '0.6rem', color: P.dim, marginBottom: 2 }}>O.vendu − (Projet + Charges)</div>

            {/* ── Bouton toggle ── */}
            <button
              onClick={() => toggleMargeExpand(pid)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '0.6rem', fontWeight: 600,
                color: expanded ? P.dim : P.charcoal,
                background: expanded ? '#f1f5f9' : P.linen,
                border: `1px solid ${expanded ? '#cbd5e1' : '#d1c9b4'}`,
                borderRadius: 99, padding: '2px 8px', cursor: 'pointer',
              }}
            >
              <span>{expanded ? '▲' : '▼'}</span>
              {expanded ? 'Réduire' : 'Voir prévisionnelle'}
            </button>

            {/* ── Niveau 2 : Marge prévisionnelle ── */}
            {expanded && (
              <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: '0.6rem', color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                  Prévisionnelle
                </div>
                <MargeBadge marge={fin.margeCommercialeMontant} devise={fin.deviseAbr} size="sm" />
                <div style={{ fontSize: '0.6rem', color: P.dim }}>O.vendu − O.tech</div>
              </div>
            )}
          </div>
        );
      },
    },    
    {
      key: 'actions', label: 'Actions',
      render: (row: Projet) => (
        <MenuListeProjet
          onDetails={() => { setSelectedProjet(row); setShowProjetDetails(true); }}
          onEdit={() => { setSelectedProjet(row); setFormDirty(false); setShowFormProjet(true); }}
          onViewBacklog={() => handleOpenBacklog(row)}
        />
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  //  LIGNE EXPANDÉE
  // ─────────────────────────────────────────────────────────────────────────
  const renderExpandedRow = (row: Projet) => {
    const sid  = statutMap.get(row.idProjet ?? 0) ?? null;
    const meta = sid !== null ? STATUT_META[sid] : null;
    const fin  = finMap.get(row.idProjet ?? 0);
    const av   = avancements.get(row.idProjet ?? 0);
    const cs: React.CSSProperties = { borderRadius: 8, padding: '10px 14px' };

    return (
      <div className="expanded-row-content p-4 bg-light">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="expanded-label">Opportunité liée</label>
            <p className="expanded-text">{row.lead ? <><strong>{row.lead.leadRef || '-'}</strong> – {row.lead.leadName || '-'}</> : '-'}</p>
          </div>
          <div className="col-md-2"><label className="expanded-label">Réf BC</label><p className="expanded-text">{row.refBC || '-'}</p></div>
          <div className="col-md-2"><label className="expanded-label">Réf Compte</label><p className="expanded-text">{row.refCompte || '-'}</p></div>
          <div className="col-md-2"><label className="expanded-label">Suppléante</label><p className="expanded-text">{row.userSuppleante?.username || '-'}</p></div>
          <div className="col-md-2">
            <label className="expanded-label">Statut</label>
            <p className="expanded-text" style={{ marginTop: 4 }}>
              {meta
                ? <span className="projet-statut-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}><span className="projet-statut-dot" style={{ background: meta.color }} />{meta.label}</span>
                : <span className="projet-statut-badge projet-statut-badge--none">Non défini</span>
              }
            </p>
          </div>
        </div>

        {fin?.loaded && row.lead?.leadId && (<>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', background: P.charcoal, display: 'inline-block', padding: '2px 10px', borderRadius: 6, letterSpacing: '0.05em', marginTop: 20, marginBottom: 10 }}>
            COMPARAISON BUDGÉTAIRE — 4 NIVEAUX
          </div>
          <div className="row g-3">
            <div className="col-md-3">
              <div style={{ ...cs, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>🔵 O. Vendu — Offre signée</div>
                <div style={{ fontWeight: 800, color: P.blue, fontSize: '1.1rem' }}>{fmt(fin.montantOffre)} {fin.deviseAbr}</div>
                <div style={{ fontSize: 12, color: P.dim, marginTop: 4 }}>{fmtJH(fin.jhVendu)} JH vendus</div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: '#faf5ff', border: '1px solid #d8b4fe' }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>🟣 O. Tech — Backlog Lead</div>
                <div style={{ fontWeight: 800, color: P.purple, fontSize: '1.1rem' }}>{fmt(fin.montantLead)} {fin.deviseAbr}</div>
                <div style={{ fontSize: 12, color: P.dim, marginTop: 4 }}>{fmtJH(fin.jhLead)} JH planifiés</div>
                <div style={{ marginTop: 6, fontSize: '0.72rem' }}>
                  <span style={{ fontSize: '0.6rem', color: P.dim }}>Marge prévis. vs O.vendu : </span>
                  <EcartBadge ecart={fin.margeCommercialeMontant} devise={fin.deviseAbr} inversed />
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: fin.ecartPlanifMontant > 0 ? '#fff7ed' : '#f0fdfa', border: `1px solid ${fin.ecartPlanifMontant > 0 ? '#fed7aa' : '#99f6e4'}` }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>🔷 Projet — Backlog Projet</div>
                <div style={{ fontWeight: 800, color: P.teal, fontSize: '1.1rem' }}>{fmt(fin.montantProjet)} {fin.deviseAbr}</div>
                <div style={{ fontSize: 12, color: P.dim, marginTop: 4 }}>{fmtJH(fin.jhProjet)} JH planifiés</div>
                <div style={{ marginTop: 6, fontSize: '0.72rem' }}>
                  <EcartBadge ecart={fin.ecartPlanifMontant} devise={fin.deviseAbr} />
                  <span style={{ fontSize: '0.62rem', color: P.dim, marginLeft: 4 }}>vs O.tech (lead)</span>
                  <span style={{ fontSize: '0.62rem', color: fin.ecartPlanifJH > 0 ? P.tomato : P.success, marginLeft: 4 }}>
                    ({fin.ecartPlanifJH > 0 ? '+' : ''}{fmtJH(fin.ecartPlanifJH)} JH)
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: fin.ecartRealiseMontant > 0 ? '#fef2f2' : '#ecfdf5', border: `1px solid ${fin.ecartRealiseMontant > 0 ? '#fecaca' : '#a7f3d0'}` }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {fin.ecartRealiseMontant > 0 ? '🔴' : '🟢'} Réalisé — Coût réel
                </div>
                <div style={{ fontWeight: 800, color: fin.ecartRealiseMontant > 0 ? P.tomato : P.success, fontSize: '1.1rem' }}>{fmt(fin.coutRealise)} {fin.deviseAbr}</div>
                <div style={{ fontSize: 12, color: P.dim, marginTop: 4 }}>{fmtJH(fin.jhRealise)} JH consommés</div>
                <div style={{ marginTop: 6, fontSize: '0.72rem' }}>
                  <EcartBadge ecart={fin.ecartRealiseMontant} devise={fin.deviseAbr} />
                  <span style={{ fontSize: '0.62rem', color: P.dim, marginLeft: 4 }}>vs Projet planifié</span>
                  <span style={{ fontSize: '0.62rem', color: fin.ecartRealiseJH > 0 ? P.tomato : P.success, marginLeft: 4 }}>
                    ({fin.ecartRealiseJH > 0 ? '+' : ''}{fmtJH(fin.ecartRealiseJH)} JH)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', background: P.charcoal, display: 'inline-block', padding: '2px 10px', borderRadius: 6, letterSpacing: '0.05em', marginTop: 18, marginBottom: 10 }}>
            MARGES &amp; CHARGES
          </div>
          <div className="row g-3">
            <div className="col-md-3">
              <div style={{ ...cs, background: fin.margeCommercialeMontant >= 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${fin.margeCommercialeMontant >= 0 ? '#a7f3d0' : '#fecaca'}` }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Marge Prévisionnelle</div>
                <MargeBadge marge={fin.margeCommercialeMontant} devise={fin.deviseAbr} />
                <div style={{ fontSize: 11, color: fin.margeCommercialeMontant >= 0 ? P.success : P.tomato, marginTop: 2 }}>
                  O.vendu − O.tech{fin.tauxMargeCommercialePct != null && <> · {Math.round(fin.tauxMargeCommercialePct)}%</>}
                </div>
                <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>{fin.margeCommercialeJH >= 0 ? '+' : ''}{fmtJH(fin.margeCommercialeJH)} JH</div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: fin.margeBudgetaireNette >= 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${fin.margeBudgetaireNette >= 0 ? '#a7f3d0' : '#fecaca'}` }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Marge Budgétaire Nette</div>
                <MargeBadge marge={fin.margeBudgetaireNette} devise={fin.deviseAbr} />
                <div style={{ fontSize: 11, color: fin.margeBudgetaireNette >= 0 ? P.success : P.tomato, marginTop: 2 }}>
                  O.vendu − (Projet + Charges){fin.tauxMargeBudgetairePct != null && <> · {Math.round(fin.tauxMargeBudgetairePct)}%</>}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: fin.chargesAnnexes > 0 ? '#fff7ed' : '#f8fafc', border: `1px solid ${fin.chargesAnnexes > 0 ? '#fed7aa' : '#e2e8f0'}` }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Charges Annexes</div>
                {fin.chargesAnnexes > 0 ? (
                  <>
                    <div style={{ fontWeight: 800, color: P.warning, fontSize: '1rem' }}>{fmt(fin.chargesAnnexes)} {fin.deviseAbr}</div>
                    {fin.chargesTransport    > 0 && <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>🚗 Transport : {fmt(fin.chargesTransport)} {fin.deviseAbr}</div>}
                    {fin.chargesHebergement  > 0 && <div style={{ fontSize: 11, color: P.dim }}>🏨 Hébergement : {fmt(fin.chargesHebergement)} {fin.deviseAbr}</div>}
                    {fin.chargesPerDiem      > 0 && <div style={{ fontSize: 11, color: P.dim }}>🍽️ Per diem : {fmt(fin.chargesPerDiem)} {fin.deviseAbr}</div>}
                    {fin.chargesAutre        > 0 && <div style={{ fontSize: 11, color: P.dim }}>📦 Autre : {fmt(fin.chargesAutre)} {fin.deviseAbr}</div>}
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #fed7aa', fontSize: 10, color: P.dim }}>
                      Impact : −{fmt(fin.chargesAnnexes)} sur marge nette
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Aucune charge</span>
                )}
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>CA Encaissé</div>
                {(fin.caEncaisse || av?.totalPaye) ? (
                  <>
                    <div style={{ fontWeight: 800, color: P.blue, fontSize: '1rem' }}>{fmt(fin.caEncaisse || av?.totalPaye || 0)} {fin.deviseAbr}</div>
                    <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>/ {fmt(fin.montantOffre)} {fin.deviseAbr} O.vendu</div>
                    {fin.montantOffre > 0 && (<>
                      <div className="avancement-bar-track" style={{ marginTop: 6 }}>
                        <div className="avancement-bar-fill" style={{ width: `${Math.min(100, ((fin.caEncaisse || av?.totalPaye || 0) / fin.montantOffre) * 100)}%`, background: P.blue }} />
                      </div>
                      <div style={{ fontSize: 10, color: P.dim, marginTop: 2 }}>
                        {Math.round(((fin.caEncaisse || av?.totalPaye || 0) / fin.montantOffre) * 100)}% encaissé
                      </div>
                    </>)}
                  </>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Aucun paiement reçu</span>
                )}
              </div>
            </div>
          </div>
        </>)}

        {av && (
          <div className="row g-3 mt-2">
            <div className="col-md-4">
              <label className="expanded-label">Avancement tâches</label>
              <p className="expanded-text">
                {av.tachesTotal > 0
                  ? `${av.tachesValidees} / ${av.tachesTotal} tâches validées (${av.avancementTaches?.toFixed(0) ?? 0}%)`
                  : '—'}
              </p>
            </div>
            {row.description && (
              <div className="col-md-8">
                <label className="expanded-label">Description</label>
                <p className="expanded-text">{row.description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDU PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="liste-projet-layout">
      <Header />
      <div className="liste-projet-wrapper">
        <main className="liste-projet-main">
          <div className="container-fluid">
            <div className="row align-items-center mb-3">
              <div className="col-lg-8 col-md-12 mb-2 mb-lg-0" />
              <div className="col-lg-4 col-md-12 text-lg-end">
                <Button label="Créer un projet" icon={<FaPlus />} onClick={() => { setSelectedProjet(null); setFormDirty(false); setShowFormProjet(true); }} />
              </div>
            </div>

            {/* Filtre période */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: P.linen, borderRadius: 8, padding: '4px 6px', marginBottom: 18 }}>
              {periodes.map(({ key, label }) => (
                <button key={key} onClick={() => setFiltrePeriode(key)} style={{ padding: '5px 16px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s', background: filtrePeriode === key ? P.charcoal : 'transparent', color: filtrePeriode === key ? P.white : P.dim, boxShadow: filtrePeriode === key ? '0 1px 4px rgba(34,58,70,0.18)' : 'none' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Dashboard 6 cartes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 10, marginBottom: 24 }}>
              <div style={cardBase}>
                <div style={cardHeader(P.charcoal)}><FaChartLine size={11} style={{ opacity: 0.85 }} /> Projets</div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: P.charcoal, lineHeight: 1 }}>{loading ? skl(40) : dashStats.total}</div>
                  <div style={{ fontSize: 11, color: P.dim, marginTop: 6 }}>
                    {loading ? skl(90) : (() => {
                      const t = projetsPeriode.filter(p => statutMap.get(p.idProjet ?? 0) === 9).length;
                      return `${dashStats.total - t} en cours · ${t} terminés`;
                    })()}
                  </div>
                  {dashStats.enRetard > 0 && !loading && (
                    <div style={{ marginTop: 6, fontSize: 10, color: P.tomato, fontWeight: 700, background: '#fef2f2', padding: '2px 8px', borderRadius: 99, display: 'inline-block' }}>
                      {dashStats.enRetard} en retard
                    </div>
                  )}
                </div>
              </div>
              <div style={{ ...cardBase, borderLeft: `4px solid ${P.blue}` }}>
                <div style={cardHeader(P.charcoal)}><FaMoneyBillWave size={11} style={{ opacity: 0.85 }} /> O. Vendu</div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: P.dim, marginBottom: 4 }}>Offre signée · {fmtJH(dashStats.jhVenduTot)} JH</div>
                  {loadingBar(P.blue)}
                  <div style={{ fontSize: 24, fontWeight: 800, color: P.blue, lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {dashStats.loadedInPeriode === 0 && !dashStats.allDone ? skl(100) : fmt(dashStats.montantOffreTot)}
                  </div>
                  {deviseGlobale && deviseGlobale !== 'multi' && <div style={{ fontSize: 12, fontWeight: 700, color: P.blue, marginTop: 2 }}>{deviseGlobale}</div>}
                  {dashStats.caEncaisseTot > 0 && dashStats.montantOffreTot > 0 && (
                    <>
                      <div className="avancement-bar-track" style={{ marginTop: 8 }}>
                        <div className="avancement-bar-fill" style={{ width: `${Math.min(100, dashStats.caEncaisseTot / dashStats.montantOffreTot * 100)}%`, background: P.success }} />
                      </div>
                      <div style={{ fontSize: 10, color: P.success, fontWeight: 600, marginTop: 2 }}>
                        CA enc. : {fmt(dashStats.caEncaisseTot)}{deviseGlobale !== 'multi' ? ` ${deviseGlobale}` : ''}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ ...cardBase, borderLeft: `4px solid ${P.purple}` }}>
                <div style={cardHeader(P.charcoal)}><FaBalanceScale size={11} style={{ opacity: 0.85 }} /> O.tech vs Projet</div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: P.dim, marginBottom: 4 }}>Écart planification</div>
                  {loadingBar(P.purple)}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 10, color: P.dim }}>O. tech</div>
                      <div style={{ fontWeight: 700, color: P.purple, fontSize: '0.85rem' }}>{dashStats.loadedInPeriode === 0 ? skl(60) : fmt(dashStats.montantLeadTot)}</div>
                      <div style={{ fontSize: 10, color: P.dim }}>{fmtJH(dashStats.jhLeadTot)} JH</div>
                    </div>
                    <div style={{ borderLeft: `1px solid ${P.linen}`, paddingLeft: 12 }}>
                      <div style={{ fontSize: 10, color: P.dim }}>Projet</div>
                      <div style={{ fontWeight: 700, color: P.teal, fontSize: '0.85rem' }}>{dashStats.loadedInPeriode === 0 ? skl(60) : fmt(dashStats.montantProjetTot)}</div>
                      <div style={{ fontSize: 10, color: P.dim }}>{fmtJH(dashStats.jhProjetTot)} JH</div>
                    </div>
                  </div>
                  {dashStats.loadedInPeriode > 0 && (() => {
                    const ecart = dashStats.montantProjetTot - dashStats.montantLeadTot;
                    return <div style={{ fontSize: 11, fontWeight: 700, color: ecart > 0 ? P.tomato : P.success }}>{ecart > 0 ? '▲ Dépassement ' : '▼ Économie '}{fmt(Math.abs(ecart))}{deviseGlobale !== 'multi' ? ` ${deviseGlobale}` : ''}</div>;
                  })()}
                </div>
              </div>
              <div style={{ ...cardBase, borderLeft: `4px solid ${P.orange}` }}>
                <div style={cardHeader(P.charcoal)}><FaReceipt size={11} style={{ opacity: 0.85 }} /> Charges annexes</div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: P.dim, marginBottom: 4 }}>Transport · Héberg. · Per diem</div>
                  {loadingBar(P.orange)}
                  <div style={{ fontSize: 24, fontWeight: 800, color: P.warning, lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {dashStats.loadedInPeriode === 0 && !dashStats.allDone ? skl(100) : fmt(dashStats.chargesAnnexesTot)}
                    {!dashStats.allDone && dashStats.loadedInPeriode > 0 && <span style={{ fontSize: 14, color: P.dim, fontWeight: 400, marginLeft: 4 }}>…</span>}
                  </div>
                  {deviseGlobale && deviseGlobale !== 'multi' && dashStats.loadedInPeriode > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: P.warning, marginTop: 2 }}>{deviseGlobale}</div>}
                  {dashStats.montantOffreTot > 0 && dashStats.chargesAnnexesTot > 0 && <div style={{ marginTop: 4, fontSize: 11, color: P.warning, fontWeight: 600 }}>{Math.round((dashStats.chargesAnnexesTot / dashStats.montantOffreTot) * 100)}% de l'O.vendu</div>}
                </div>
              </div>
              <div style={{ ...cardBase, borderLeft: `4px solid ${margeCommColor}` }}>
                <div style={cardHeader(P.charcoal)}><FaTrophy size={11} style={{ opacity: 0.85 }} /> Marge Prévis.</div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: P.dim, marginBottom: 4 }}>O.vendu − O.tech</div>
                  {loadingBar(margeCommColor)}
                  <div style={{ fontSize: 22, fontWeight: 800, color: margeCommColor, lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {dashStats.loadedInPeriode === 0 && !dashStats.allDone ? skl(100) : `${dashStats.margeCommercialeTot >= 0 ? '+' : ''}${fmt(dashStats.margeCommercialeTot)}`}
                    {!dashStats.allDone && dashStats.loadedInPeriode > 0 && <span style={{ fontSize: 14, color: P.dim, fontWeight: 400, marginLeft: 4 }}>…</span>}
                  </div>
                  {deviseGlobale && deviseGlobale !== 'multi' && dashStats.loadedInPeriode > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: margeCommColor, marginTop: 2 }}>{deviseGlobale}</div>}
                  {dashStats.tauxMargeComm !== null && dashStats.loadedInPeriode > 0 && <div style={{ marginTop: 4, fontSize: 11, color: margeCommColor, fontWeight: 600 }}>{Math.round(dashStats.tauxMargeComm)}% de l'O.vendu</div>}
                  {dashStats.loadedInPeriode > 0 && <div style={{ fontSize: 11, color: P.dim, marginTop: 4 }}>{dashStats.margeCommercialeJHTot >= 0 ? '+' : ''}{fmtJH(dashStats.margeCommercialeJHTot)} JH de marge</div>}
                </div>
              </div>
              <div style={{ ...cardBase, borderLeft: `4px solid ${margeBudColor}` }}>
                <div style={cardHeader(P.charcoal)}><FaCheckCircle size={11} style={{ opacity: 0.85 }} /> Marge Nette</div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: P.dim, marginBottom: 4 }}>O.vendu − (Projet + Charges)</div>
                  {loadingBar(margeBudColor)}
                  <div style={{ fontSize: 22, fontWeight: 800, color: margeBudColor, lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {dashStats.loadedInPeriode === 0 && !dashStats.allDone ? skl(100) : `${dashStats.margeBudgetaireNetteTot >= 0 ? '+' : ''}${fmt(dashStats.margeBudgetaireNetteTot)}`}
                    {!dashStats.allDone && dashStats.loadedInPeriode > 0 && <span style={{ fontSize: 14, color: P.dim, fontWeight: 400, marginLeft: 4 }}>…</span>}
                  </div>
                  {deviseGlobale && deviseGlobale !== 'multi' && dashStats.loadedInPeriode > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: margeBudColor, marginTop: 2 }}>{deviseGlobale}</div>}
                  {dashStats.tauxMargeBud !== null && dashStats.loadedInPeriode > 0 && <div style={{ marginTop: 4, fontSize: 11, color: margeBudColor, fontWeight: 600 }}>{Math.round(dashStats.tauxMargeBud)}% de l'O.vendu</div>}
                  {dashStats.chargesAnnexesTot > 0 && dashStats.loadedInPeriode > 0 && <div style={{ fontSize: 11, color: P.warning, marginTop: 4 }}>Charges : {fmt(dashStats.chargesAnnexesTot)}{deviseGlobale !== 'multi' ? ` ${deviseGlobale}` : ''}</div>}
                </div>
              </div>
            </div>

            {/* Filtres */}
            <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
              <div style={{ flex: 1, minWidth: 200 }}>
                <FilterBar filters={[{ type: 'text', placeholder: 'Rechercher (projet, client, chef de projet…)', onChange: setSearch }]} />
              </div>
              <select value={filtreStatutId} onChange={e => setFiltreStatutId(Number(e.target.value))} className="form-select form-select-sm" style={{ width: 160 }}>
                <option value={0}>Tous les statuts</option>
                {statutOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              {(filtreStatutId !== 0 || search.trim() || filtrePeriode !== 'tous') && (
                <span style={{ fontSize: '0.78rem', color: '#6b7280', flexShrink: 0 }}>
                  <strong style={{ color: '#4338ca' }}>{filteredProjets.length}</strong> / {projets.length} projet{projets.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="table-responsive mt-2">
              <Table
                columns={columns}
                data={filteredProjets}
                expandedRowId={expandedRowId}
                expandedRow={renderExpandedRow}
                storageKey="liste_projet_columns"
                defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
              />
            </div>
          </div>
        </main>
      </div>

      <FormProjet show={showFormProjet} onClose={handleCloseFormProjet} projet={selectedProjet} onSubmit={async (_saved) => { setFormDirty(true); }} />
      <ProjetDetails show={showProjetDetails} onClose={() => { setShowProjetDetails(false); setSelectedProjet(null); }} projet={selectedProjet} />
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