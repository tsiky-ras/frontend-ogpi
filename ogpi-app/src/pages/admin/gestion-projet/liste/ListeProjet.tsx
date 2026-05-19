import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '../../../../components/header/Header.tsx';
import Button from '../../../../components/button/Button.tsx';
import { FaPlus, FaHourglassHalf, FaLayerGroup, FaChartBar, FaCoins, FaArchive } from 'react-icons/fa';
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
import { useAuth } from '../../../../context/AuthContext.tsx';
import { ArchiveProjetService } from '../../../../services/projet/ArchiveProjetService.tsx';
import ConfirmArchiveModal from '../archive/ConfirmArchiveModal.tsx';

const P = {
  charcoal: '#223A46', tomato: '#C93C29', success: '#2d8f47', warning: '#d97706',
  dim: '#5F6F6E', linen: '#E8E5D7', white: '#ffffff', blue: '#3b82f6',
  purple: '#7c3aed', teal: '#0ea5e9', orange: '#f97316',
};

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
  return (
    <span className="projet-statut-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}>
      <span className="projet-statut-dot" style={{ background: meta.color }} />{meta.label}
    </span>
  );
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

const ChargesAnnexesDetail: React.FC<{ total: number; transport: number; hebergement: number; perDiem: number; autre: number; devise: string }> = ({ total, transport, hebergement, perDiem, autre, devise }) => {
  if (total === 0) return <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>0 {devise}</span>;
  return (
    <div style={{ minWidth: 130 }}>
      <div style={{ fontWeight: 700, color: P.warning, fontSize: '0.85rem', marginBottom: 4 }}>{fmt(total)} {devise}</div>
      {transport   > 0 && <div style={{ fontSize: '0.65rem', color: P.dim, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Transport</span><span style={{ fontWeight: 600 }}>{fmt(transport)}</span></div>}
      {hebergement > 0 && <div style={{ fontSize: '0.65rem', color: P.dim, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Hébergement</span><span style={{ fontWeight: 600 }}>{fmt(hebergement)}</span></div>}
      {perDiem     > 0 && <div style={{ fontSize: '0.65rem', color: P.dim, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Per diem</span><span style={{ fontWeight: 600 }}>{fmt(perDiem)}</span></div>}
      {autre       > 0 && <div style={{ fontSize: '0.65rem', color: P.dim, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Autre</span><span style={{ fontWeight: 600 }}>{fmt(autre)}</span></div>}
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
  ecartPlanifMontant: number; ecartPlanifJH: number;
  ecartRealiseMontant: number; ecartRealiseJH: number;
  tauxConsoJH: number | null; caEncaisse: number; caPlanifie: number;
  deviseAbr: string; loaded: boolean;
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
  tauxConsoJH: null, caEncaisse: 0, caPlanifie: 0, deviseAbr: devise, loaded: true,
});

const DEFAULT_VISIBLE_COLUMNS = ['nomProjet', 'statut', 'consoJH', 'marges', 'actions'];

const ListeProjet: React.FC<ListeProjetProps> = ({ projets, statutMap, avancements, loading, onProjetSaved }) => {
  const { getByProjetId } = useComparaisonService();
  const { api, hasPerm } = useAuth();
  const archiveService = useMemo(() => new ArchiveProjetService(api), [api]);

  // ── Archive modal state ────────────────────────────────────────────────────
  const [archivingId,    setArchivingId]    = useState<number | null>(null);
  const [archiveTarget,  setArchiveTarget]  = useState<Projet | null>(null);
  const [archiveToast,   setArchiveToast]   = useState<string | null>(null);

  const showArchiveToast = (msg: string) => {
    setArchiveToast(msg);
    setTimeout(() => setArchiveToast(null), 3000);
  };

  const handleArchiver = async () => {
    if (!archiveTarget) return;
    const pid = archiveTarget.idProjet ?? 0;
    setArchivingId(pid);
    try {
      await archiveService.archiver(pid);
      showArchiveToast(`"${archiveTarget.nomProjet}" archivé avec succès.`);
      await onProjetSaved();
    } catch {
      showArchiveToast('Erreur lors de l\'archivage.');
    } finally {
      setArchivingId(null);
      setArchiveTarget(null);
    }
  };

  const [finMap, setFinMap]           = useState<Map<number, ProjetFin>>(new Map());
  const [loadedCount, setLoadedCount] = useState(0);

  type FiltrePeriode = 'tous' | 'semaine' | 'mois' | 'annee';
  const [filtrePeriode, setFiltrePeriode] = useState<FiltrePeriode>('tous');

  const bornes = useMemo(() => {
    if (filtrePeriode === 'tous') return null;
    const now = new Date(); const debut = new Date(now); const fin = new Date(now);
    if (filtrePeriode === 'semaine') { const j = now.getDay() === 0 ? 6 : now.getDay() - 1; debut.setDate(now.getDate() - j); fin.setDate(debut.getDate() + 6); }
    else if (filtrePeriode === 'mois')  { debut.setDate(1); fin.setMonth(now.getMonth() + 1, 0); }
    else if (filtrePeriode === 'annee') { debut.setMonth(0, 1); fin.setMonth(11, 31); }
    debut.setHours(0,0,0,0); fin.setHours(23,59,59,999);
    return { debut, fin };
  }, [filtrePeriode]);

  const projetsPeriode = useMemo(() => {
    if (!bornes) return projets;
    const { debut, fin } = bornes;
    return projets.filter(p => {
      if (p.dateDebutPrevu || p.dateFinPrevu) {
        const s = p.dateDebutPrevu ? new Date(p.dateDebutPrevu) : new Date(0);
        const e = p.dateFinPrevu   ? new Date(p.dateFinPrevu)   : new Date('9999-12-31');
        if (s <= fin && e >= debut) return true;
      }
      if (p.dateAttribution) { const da = new Date(p.dateAttribution); if (da >= debut && da <= fin) return true; }
      return false;
    });
  }, [projets, bornes]);

  const loadFinForProjet = useCallback(async (p: Projet) => {
    const pid = p.idProjet ?? 0;
    if (!pid || !p.lead?.leadId) { setFinMap(prev => new Map(prev).set(pid, EMPTY_FIN())); setLoadedCount(c => c + 1); return; }
    try {
      const data = await getByProjetId(pid);
      const devise = data.deviseAbr ?? '€';
      const jhLead = data.jhBacklogLeadTotal ?? 0;
      const jhReal = data.jhRealiseTotal ?? 0;
      setFinMap(prev => new Map(prev).set(pid, {
        montantOffre: data.offreMontantSigne ?? 0, jhVendu: data.offreJhVendu ?? 0,
        montantLead: data.montantBacklogLead ?? 0, jhLead,
        montantProjet: data.montantBacklogProjet ?? 0, jhProjet: data.jhBacklogProjetTotal ?? 0,
        coutRealise: data.coutRealiseTotal ?? 0, jhRealise: jhReal,
        chargesAnnexes: data.totalChargesAnnexes ?? 0, chargesTransport: data.chargesTransport ?? 0,
        chargesHebergement: data.chargesHebergement ?? 0, chargesPerDiem: data.chargesPerDiem ?? 0,
        chargesAutre: data.chargesAutre ?? 0,
        margeCommercialeMontant: data.margeCommercialeMontant ?? 0,
        margeCommercialeJH: data.margeCommercialeJhTotal ?? 0,
        tauxMargeCommercialePct: data.tauxMargeCommercialePct ?? null,
        margeBudgetaireNette: data.margeBudgetaireNette ?? 0,
        tauxMargeBudgetairePct: data.tauxMargeBudgetairePct ?? null,
        ecartPlanifMontant: data.ecartPlanificationMontant ?? 0,
        ecartPlanifJH: data.ecartPlanificationJhTotal ?? 0,
        ecartRealiseMontant: data.ecartRealiseMontantTotal ?? 0,
        ecartRealiseJH: data.ecartRealiseJhTotal ?? 0,
        tauxConsoJH: jhLead > 0 ? (jhReal / jhLead) * 100 : null,
        caEncaisse: data.caEncaisse ?? 0, caPlanifie: data.caPlanifie ?? 0,
        deviseAbr: devise, loaded: true,
      }));
    } catch { setFinMap(prev => new Map(prev).set(pid, EMPTY_FIN())); }
    finally { setLoadedCount(c => c + 1); }
  }, [getByProjetId]);

  useEffect(() => {
    if (!projets.length) return;
    setFinMap(new Map()); setLoadedCount(0);
    projets.forEach(p => loadFinForProjet(p));
  }, [projets]);

  // ── Stats globales cards ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    let jhVendu = 0, jhRealise = 0, jhProjet = 0, montantOffre = 0, caEncaisse = 0;
    let projetsAvecFin = 0;
    const devCount = new Map<string, number>();

    projetsPeriode.forEach(p => {
      const fin = finMap.get(p.idProjet ?? 0);
      if (!fin?.loaded || !p.lead?.leadId) return;
      projetsAvecFin++;
      jhVendu    += fin.jhVendu;
      jhRealise  += fin.jhRealise;
      jhProjet   += fin.jhProjet;
      montantOffre += fin.montantOffre;
      caEncaisse  += fin.caEncaisse || (avancements.get(p.idProjet ?? 0)?.totalPaye ?? 0);
      if (fin.deviseAbr) devCount.set(fin.deviseAbr, (devCount.get(fin.deviseAbr) ?? 0) + 1);
    });

    const jhReste       = Math.max(0, jhVendu - jhRealise);
    const pctConsoVendu = jhVendu > 0 ? (jhRealise / jhVendu) * 100 : null;
    const valorisation  = jhVendu > 0 && montantOffre > 0 ? (jhRealise / jhVendu) * montantOffre : 0;
    const resteValeur   = jhVendu > 0 && montantOffre > 0 ? (jhReste   / jhVendu) * montantOffre : 0;
    const allDone       = projetsPeriode.length === 0 || loadedCount >= projetsPeriode.length;
    const pctLoaded     = projetsPeriode.length > 0 ? Math.round((loadedCount / projetsPeriode.length) * 100) : 0;
    let deviseAbr = '€';
    if (devCount.size === 1) deviseAbr = [...devCount.keys()][0];
    else if (devCount.size > 1) deviseAbr = 'multi';

    return { total: projetsPeriode.length, projetsAvecFin, jhVendu, jhRealise, jhProjet, jhReste, pctConsoVendu, montantOffre, caEncaisse, valorisation, resteValeur, deviseAbr, allDone, pctLoaded };
  }, [projetsPeriode, finMap, avancements, loadedCount]);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const [search,         setSearch]         = useState('');
  const [filtreStatutId, setFiltreStatutId] = useState<number>(0);
  const [filtreCp,       setFiltreCp]       = useState<string>('');
  const [filtreClient,   setFiltreClient]   = useState<string>('');
  const [filtreTypeFact, setFiltreTypeFact] = useState<string>('');

  const cpOptions     = useMemo(() => { const s = new Set<string>(); projets.forEach(p => { if (p.userCp?.username) s.add(p.userCp.username); }); return [...s].sort(); }, [projets]);
  const clientOptions = useMemo(() => { const s = new Set<string>(); projets.forEach(p => { if (p.lead?.client?.name) s.add(p.lead.client.name); }); return [...s].sort(); }, [projets]);
  const typeFactOptions = useMemo(() => { const s = new Set<string>(); projets.forEach(p => { if (p.typeFacturation?.nomTypeFacturation) s.add(p.typeFacturation.nomTypeFacturation); }); return [...s].sort(); }, [projets]);
  const statutOptions = useMemo(() => { const used = new Set<number>(); statutMap.forEach(sid => used.add(sid)); return Object.entries(STATUT_META).map(([id, meta]) => ({ id: Number(id), ...meta })).filter(s => used.has(s.id)); }, [statutMap]);

  const filteredProjets = useMemo(() => {
    let r = projetsPeriode;
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(p => p.nomProjet?.toLowerCase().includes(q) || (p.refBC ?? '').toLowerCase().includes(q) || (p.userCp?.username ?? '').toLowerCase().includes(q) || (p.lead?.leadName ?? '').toLowerCase().includes(q) || (p.lead?.client?.name ?? '').toLowerCase().includes(q)); }
    if (filtreStatutId !== 0) r = r.filter(p => statutMap.get(p.idProjet ?? 0) === filtreStatutId);
    if (filtreCp)       r = r.filter(p => p.userCp?.username === filtreCp);
    if (filtreClient)   r = r.filter(p => p.lead?.client?.name === filtreClient);
    if (filtreTypeFact) r = r.filter(p => p.typeFacturation?.nomTypeFacturation === filtreTypeFact);
    return r;
  }, [projetsPeriode, search, filtreStatutId, filtreCp, filtreClient, filtreTypeFact, statutMap]);

  const activeFilters = [filtreStatutId !== 0, filtreCp !== '', filtreClient !== '', filtreTypeFact !== '', search.trim() !== ''].filter(Boolean).length;

  const [showFormProjet, setShowFormProjet]           = useState(false);
  const [selectedProjet, setSelectedProjet]           = useState<Projet | null>(null);
  const [showProjetDetails, setShowProjetDetails]     = useState(false);
  const [expandedRowId, setExpandedRowId]             = useState<number | null>(null);
  const [showBacklogModal, setShowBacklogModal]       = useState(false);
  const [selectedProjetForBacklog, setSelectedProjetForBacklog] = useState<Projet | null>(null);
  const [formDirty, setFormDirty]                     = useState(false);

  const handleOpenBacklog     = (p: Projet) => { setSelectedProjetForBacklog(p); setShowBacklogModal(true); };
  const handleCloseBacklog    = async () => { setShowBacklogModal(false); setSelectedProjetForBacklog(null); await onProjetSaved(); };
  const handleCloseFormProjet = async () => { setShowFormProjet(false); setSelectedProjet(null); setFormDirty(false); await onProjetSaved(); };

  // ── Helpers UI ────────────────────────────────────────────────────────────
  const skl = (w = 80) => <div style={{ height: 14, width: w, background: '#e5e7eb', borderRadius: 4, display: 'inline-block' }} />;
  const cardBase: React.CSSProperties = { background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(34,58,70,0.07)' };
  const cardHdr = (color: string, icon: React.ReactNode, title: string) => (
    <div style={{ background: color, color: P.white, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{icon} {title}</div>
  );
  const loadBar = (color: string) => !stats.allDone && stats.total > 0 ? (
    <div style={{ height: 3, background: P.linen, borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
      <div style={{ height: '100%', width: `${stats.pctLoaded}%`, background: color, borderRadius: 999, transition: 'width 0.3s' }} />
    </div>
  ) : null;
  const progBar = (pct: number, color: string) => (
    <div style={{ height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginTop: 5 }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s' }} />
    </div>
  );

  const pctConsoColor = stats.pctConsoVendu == null ? P.teal : stats.pctConsoVendu > 100 ? P.tomato : stats.pctConsoVendu > 85 ? P.warning : P.teal;

  // ── Colonnes tableau ──────────────────────────────────────────────────────
  const columns = [
    { key: 'nomProjet', label: 'Nom du projet' },
    { key: 'lead', label: 'Opportunité', render: (row: Projet) => row.lead ? <>{row.lead.leadRef || '-'} – <strong>{row.lead.leadName || '-'}</strong></> : '-' },
    { key: 'client', label: 'Client', render: (row: Projet) => row.lead?.client?.name ? <span style={{ fontWeight: 500, color: P.blue }}>{row.lead.client.name}</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span> },
    {
      key: 'typeFacturation', label: 'Type de facturation',
      render: (row: Projet) => {
        const nom = row.typeFacturation?.nomTypeFacturation;
        if (!nom) return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
        const isFacturable = row.typeFacturation?.isFacturable;
        return (
          <span style={{
            fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
            color: isFacturable ? P.success : P.dim,
            background: isFacturable ? '#ecfdf5' : '#f8fafc',
            border: `1px solid ${isFacturable ? '#a7f3d0' : '#e2e8f0'}`,
            borderRadius: 99, padding: '2px 8px',
          }}>
            {nom}
          </span>
        );
      },
    },
    { key: 'refBC', label: 'Réf BC' },
    { key: 'refCompte', label: 'Réf Compte' },
    { key: 'userCp', label: 'Responsable', render: (row: Projet) => row.userCp?.username ? <span style={{ fontWeight: 500 }}>{row.userCp.username}</span> : <span style={{ color: P.warning, fontSize: 12 }}>Non assigné</span> },
    {
      key: 'dateFinPrevu', label: 'Fin prévu',
      render: (row: Projet) => {
        if (!row.dateFinPrevu) return '-';
        const fin = new Date(row.dateFinPrevu);
        const retard = fin < new Date() && statutMap.get(row.idProjet ?? 0) !== 9;
        return <span style={{ color: retard ? P.tomato : 'inherit', fontWeight: retard ? 600 : 'normal' }}>{fin.toLocaleDateString('fr-FR')}{retard && <span style={{ marginLeft: 4, fontSize: 10, background: '#fef2f2', color: P.tomato, borderRadius: 4, padding: '1px 5px' }}>Retard</span>}</span>;
      },
    },
    { key: 'statut', label: 'Statut', render: (row: Projet) => <StatutBadge statutId={statutMap.get(row.idProjet ?? 0) ?? null} loading={loading} /> },
    {
      key: 'consoJH', label: 'JH Réalisé / Vendu',
      render: (row: Projet) => {
        const pid = row.idProjet ?? 0;
        const fin = finMap.get(pid);
        if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 120 }} />;
        if (!row.lead?.leadId) {
          const av = avancements.get(pid);
          return av && av.tachesTotal > 0
            ? <span style={{ fontSize: 12, color: P.dim }}>{av.tachesValidees}/{av.tachesTotal} tâches</span>
            : <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>0,0 JH</span>;
        }
        const pct   = fin.jhVendu > 0 ? (fin.jhRealise / fin.jhVendu) * 100 : null;
        const reste = Math.max(0, fin.jhVendu - fin.jhRealise);
        const color = pct == null ? P.teal : pct > 100 ? P.tomato : pct > 85 ? P.warning : P.teal;
        return (
          <div style={{ minWidth: 130 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color, whiteSpace: 'nowrap' }}>{fmtJH(fin.jhRealise)}</span>
              {fin.jhVendu > 0 && <span style={{ fontSize: '0.62rem', color: P.dim }}>/ {fmtJH(fin.jhVendu)} vendus</span>}
            </div>
            {pct !== null && (
              <>
                {progBar(pct, color)}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color }}>{Math.round(pct)}%</span>
                  <span style={{ fontSize: 10, color: P.dim }}>{fmtJH(reste)} reste</span>
                </div>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'budgetEtCharges', label: 'Budget & Charges',
      render: (row: Projet) => {
        const fin = finMap.get(row.idProjet ?? 0);
        if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 120 }} />;
        if (!row.lead?.leadId) return <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#94a3b8' }}>0 MGA</span>;
        return (
          <div>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: P.teal, whiteSpace: 'nowrap' }}>{fmt(fin.montantProjet)} {fin.deviseAbr}</span>
            <div style={{ fontSize: 10, color: P.dim }}>Budget projet</div>
            {fin.chargesAnnexes > 0 && <div style={{ fontSize: 10, fontWeight: 600, color: P.warning, marginTop: 2 }}>+{fmt(fin.chargesAnnexes)} charges</div>}
          </div>
        );
      },
    },
    {
      key: 'ca', label: 'CA Encaissé',
      render: (row: Projet) => {
        const pid       = row.idProjet ?? 0;
        const fin       = finMap.get(pid);
        const av        = avancements.get(pid);
        const totalPaye = fin?.caEncaisse || (av?.totalPaye ?? 0);
        if (loading) return <div className="avancement-skeleton" style={{ width: 80 }} />;
        const pct = fin && fin.montantOffre > 0 ? (totalPaye / fin.montantOffre) * 100 : null;
        return (
          <div>
            <span style={{ fontWeight: 700, color: P.success, fontSize: '0.88rem', whiteSpace: 'nowrap' }}>{fmt(totalPaye)} {fin?.deviseAbr ?? 'MGA'}</span>
            <div style={{ fontSize: 10, color: P.dim }}>{pct != null ? Math.round(pct) : 0}% encaissé</div>
          </div>
        );
      },
    },
    {
      key: 'marges', label: 'Marge nette',
      render: (row: Projet) => {
        const fin = finMap.get(row.idProjet ?? 0);
        if (!fin?.loaded) return <div className="avancement-skeleton" style={{ width: 100 }} />;
        if (!row.lead?.leadId) return <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>+0 MGA</span>;
        return (
          <div>
            <MargeBadge marge={fin.margeBudgetaireNette} devise={fin.deviseAbr} size="sm" />
            <div style={{ fontSize: 10, color: fin.margeBudgetaireNette >= 0 ? P.success : P.tomato }}>
              {fin.tauxMargeBudgetairePct != null ? Math.round(fin.tauxMargeBudgetairePct) : 0}% de l'offre
            </div>
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
          // ── Ouvre le modal de confirmation au lieu d'un confirm inline ──
          onArchiver={() => setArchiveTarget(row)}
        />
      ),
    },
  ];

  // ── Ligne expandée ────────────────────────────────────────────────────────
  const renderExpandedRow = (row: Projet) => {
    const sid  = statutMap.get(row.idProjet ?? 0) ?? null;
    const meta = sid !== null ? STATUT_META[sid] : null;
    const fin  = finMap.get(row.idProjet ?? 0);
    const av   = avancements.get(row.idProjet ?? 0);
    const cs: React.CSSProperties = { borderRadius: 8, padding: '10px 14px' };
    return (
      <div className="expanded-row-content p-4 bg-light">
        <div className="row g-3">
          <div className="col-md-4"><label className="expanded-label">Opportunité liée</label><p className="expanded-text">{row.lead ? <><strong>{row.lead.leadRef || '-'}</strong> – {row.lead.leadName || '-'}</> : '-'}</p></div>
          <div className="col-md-2"><label className="expanded-label">Client</label><p className="expanded-text">{row.lead?.client?.name || '-'}</p></div>
          <div className="col-md-2"><label className="expanded-label">Réf BC</label><p className="expanded-text">{row.refBC || '-'}</p></div>
          <div className="col-md-2"><label className="expanded-label">Réf Compte</label><p className="expanded-text">{row.refCompte || '-'}</p></div>
          <div className="col-md-1"><label className="expanded-label">Type projet</label><p className="expanded-text" style={{ marginTop: 4 }}>{row.typeFacturation?.nomTypeFacturation ? <span style={{ fontSize: 11, fontWeight: 600, color: row.typeFacturation.isFacturable ? P.success : P.dim, background: row.typeFacturation.isFacturable ? '#ecfdf5' : '#f8fafc', border: `1px solid ${row.typeFacturation.isFacturable ? '#a7f3d0' : '#e2e8f0'}`, borderRadius: 99, padding: '2px 8px' }}>{row.typeFacturation.nomTypeFacturation}</span> : '-'}</p></div>
          <div className="col-md-1">
            <label className="expanded-label">Statut</label>
            <p className="expanded-text" style={{ marginTop: 4 }}>
              {meta ? <span className="projet-statut-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}><span className="projet-statut-dot" style={{ background: meta.color }} />{meta.label}</span>
                    : <span className="projet-statut-badge projet-statut-badge--none">Non défini</span>}
            </p>
          </div>
        </div>

        {fin?.loaded && row.lead?.leadId && (<>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', background: P.charcoal, display: 'inline-block', padding: '2px 10px', borderRadius: 6, letterSpacing: '0.05em', marginTop: 20, marginBottom: 10 }}>COMPARAISON BUDGÉTAIRE — 4 NIVEAUX</div>
          <div className="row g-3">
            {[
              { emoji: '🔵', title: 'O. Vendu — Offre signée',  montant: fin.montantOffre,  jh: fin.jhVendu,  color: P.blue,   bg: '#eff6ff', border: '#bfdbfe', extra: null },
              { emoji: '🟣', title: 'O. Tech — Backlog Lead',   montant: fin.montantLead,   jh: fin.jhLead,   color: P.purple, bg: '#faf5ff', border: '#d8b4fe',
                extra: <div style={{ marginTop: 6, fontSize: '0.72rem' }}><span style={{ fontSize: '0.6rem', color: P.dim }}>Marge prévis. : </span><EcartBadge ecart={fin.margeCommercialeMontant} devise={fin.deviseAbr} inversed /></div> },
              { emoji: '🔷', title: 'Projet — Backlog Projet',  montant: fin.montantProjet, jh: fin.jhProjet, color: P.teal,
                bg: fin.ecartPlanifMontant > 0 ? '#fff7ed' : '#f0fdfa', border: fin.ecartPlanifMontant > 0 ? '#fed7aa' : '#99f6e4',
                extra: <div style={{ marginTop: 6, fontSize: '0.72rem' }}><EcartBadge ecart={fin.ecartPlanifMontant} devise={fin.deviseAbr} /><span style={{ fontSize: '0.62rem', color: P.dim, marginLeft: 4 }}>vs O.tech</span></div> },
              { emoji: fin.ecartRealiseMontant > 0 ? '🔴' : '🟢', title: 'Réalisé — Coût réel',
                montant: fin.coutRealise, jh: fin.jhRealise, color: fin.ecartRealiseMontant > 0 ? P.tomato : P.success,
                bg: fin.ecartRealiseMontant > 0 ? '#fef2f2' : '#ecfdf5', border: fin.ecartRealiseMontant > 0 ? '#fecaca' : '#a7f3d0',
                extra: <div style={{ marginTop: 6, fontSize: '0.72rem' }}><EcartBadge ecart={fin.ecartRealiseMontant} devise={fin.deviseAbr} /><span style={{ fontSize: '0.62rem', color: P.dim, marginLeft: 4 }}>vs Projet</span></div> },
            ].map(({ emoji, title, montant, jh, color, bg, border, extra }) => (
              <div key={title} className="col-md-3">
                <div style={{ ...cs, background: bg, border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{emoji} {title}</div>
                  <div style={{ fontWeight: 800, color, fontSize: '1.1rem' }}>{fmt(montant)} {fin.deviseAbr}</div>
                  <div style={{ fontSize: 12, color: P.dim, marginTop: 4 }}>{fmtJH(jh)} JH</div>
                  {extra}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', background: P.charcoal, display: 'inline-block', padding: '2px 10px', borderRadius: 6, letterSpacing: '0.05em', marginTop: 18, marginBottom: 10 }}>MARGES &amp; CHARGES</div>
          <div className="row g-3">
            <div className="col-md-3">
              <div style={{ ...cs, background: fin.margeCommercialeMontant >= 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${fin.margeCommercialeMontant >= 0 ? '#a7f3d0' : '#fecaca'}` }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Marge Prévisionnelle</div>
                <MargeBadge marge={fin.margeCommercialeMontant} devise={fin.deviseAbr} />
                <div style={{ fontSize: 11, color: fin.margeCommercialeMontant >= 0 ? P.success : P.tomato, marginTop: 2 }}>O.vendu − O.tech{fin.tauxMargeCommercialePct != null && <> · {Math.round(fin.tauxMargeCommercialePct)}%</>}</div>
                <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>{fin.margeCommercialeJH >= 0 ? '+' : ''}{fmtJH(fin.margeCommercialeJH)} JH</div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: fin.margeBudgetaireNette >= 0 ? '#ecfdf5' : '#fef2f2', border: `1px solid ${fin.margeBudgetaireNette >= 0 ? '#a7f3d0' : '#fecaca'}` }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Marge Budgétaire Nette</div>
                <MargeBadge marge={fin.margeBudgetaireNette} devise={fin.deviseAbr} />
                <div style={{ fontSize: 11, color: fin.margeBudgetaireNette >= 0 ? P.success : P.tomato, marginTop: 2 }}>O.vendu − (Projet + Charges){fin.tauxMargeBudgetairePct != null && <> · {Math.round(fin.tauxMargeBudgetairePct)}%</>}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: fin.chargesAnnexes > 0 ? '#fff7ed' : '#f8fafc', border: `1px solid ${fin.chargesAnnexes > 0 ? '#fed7aa' : '#e2e8f0'}` }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Charges Annexes</div>
                {fin.chargesAnnexes > 0 ? <ChargesAnnexesDetail total={fin.chargesAnnexes} transport={fin.chargesTransport} hebergement={fin.chargesHebergement} perDiem={fin.chargesPerDiem} autre={fin.chargesAutre} devise={fin.deviseAbr} /> : <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Aucune charge</span>}
              </div>
            </div>
            <div className="col-md-3">
              <div style={{ ...cs, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>CA Encaissé</div>
                {(() => {
                  const montantCa = fin.caEncaisse || av?.totalPaye || 0;
                  const pctCa = fin.montantOffre > 0 ? Math.min(100, (montantCa / fin.montantOffre) * 100) : 0;
                  return (<>
                    <div style={{ fontWeight: 800, color: P.blue, fontSize: '1rem' }}>{fmt(montantCa)} {fin.deviseAbr}</div>
                    <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>/ {fmt(fin.montantOffre)} {fin.deviseAbr} O.vendu</div>
                    {fin.montantOffre > 0 && (<><div className="avancement-bar-track" style={{ marginTop: 6 }}><div className="avancement-bar-fill" style={{ width: `${pctCa}%`, background: P.blue }} /></div><div style={{ fontSize: 10, color: P.dim, marginTop: 2 }}>{Math.round(pctCa)}% encaissé</div></>)}
                  </>);
                })()}
              </div>
            </div>
          </div>
        </>)}

        {av && av.tachesTotal > 0 && (
          <div className="row g-3 mt-2">
            <div className="col-md-4"><label className="expanded-label">Avancement tâches</label><p className="expanded-text">{av.tachesValidees} / {av.tachesTotal} validées ({av.avancementTaches?.toFixed(0) ?? 0}%)</p></div>
            {row.description && <div className="col-md-8"><label className="expanded-label">Description</label><p className="expanded-text">{row.description}</p></div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="liste-projet-layout">
      <Header />
      <div className="liste-projet-wrapper">
        <main className="liste-projet-main">
          <div className="container-fluid">

            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
              <div style={cardBase}>
                {cardHdr(P.teal, <FaHourglassHalf size={11} />, 'JH Consommés vs Vendus')}
                <div style={{ padding: '14px 16px' }}>
                  {loadBar(P.teal)}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: pctConsoColor, lineHeight: 1 }}>
                      {!stats.allDone && stats.projetsAvecFin === 0 ? skl() : fmtJH(stats.jhRealise)}
                    </span>
                    {stats.jhVendu > 0 && <span style={{ fontSize: 13, color: P.dim }}>/ {fmtJH(stats.jhVendu)} JH</span>}
                  </div>
                  {stats.pctConsoVendu !== null && (<>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pctConsoColor }}>{Math.round(stats.pctConsoVendu)}% consommés</span>
                    </div>
                    {progBar(stats.pctConsoVendu, pctConsoColor)}
                  </>)}
                </div>
              </div>
              <div style={cardBase}>
                {cardHdr(P.purple, <FaLayerGroup size={11} />, 'Reste à produire')}
                <div style={{ padding: '14px 16px' }}>
                  {loadBar(P.purple)}
                  <div style={{ fontSize: 26, fontWeight: 800, color: P.purple, lineHeight: 1, marginBottom: 4 }}>
                    {!stats.allDone && stats.projetsAvecFin === 0 ? skl() : fmtJH(stats.jhReste)}
                    <span style={{ fontSize: 14, fontWeight: 500, color: P.dim, marginLeft: 4 }}>JH</span>
                  </div>
                  {stats.jhVendu > 0 && stats.pctConsoVendu !== null && <div style={{ fontSize: 11, color: P.dim }}>{Math.round(100 - stats.pctConsoVendu)}% du volume vendu</div>}
                  {stats.jhProjet > 0 && <div style={{ fontSize: 11, color: P.dim, marginTop: 3 }}>{fmtJH(Math.max(0, stats.jhProjet - stats.jhRealise))} JH vs backlog projet</div>}
                </div>
              </div>
              <div style={cardBase}>
                {cardHdr(P.blue, <FaChartBar size={11} />, 'Valorisation réalisée')}
                <div style={{ padding: '14px 16px' }}>
                  {loadBar(P.blue)}
                  <div style={{ fontSize: stats.valorisation > 999999 ? 18 : 22, fontWeight: 800, color: P.blue, lineHeight: 1, marginBottom: 2, whiteSpace: 'nowrap' }}>
                    {!stats.allDone && stats.projetsAvecFin === 0 ? skl(100) : fmt(Math.round(stats.valorisation))}
                  </div>
                  {stats.deviseAbr && stats.deviseAbr !== 'multi' && <div style={{ fontSize: 12, fontWeight: 700, color: P.blue, marginBottom: 4 }}>{stats.deviseAbr}</div>}
                  <div style={{ fontSize: 11, color: P.dim }}>JH réalisés × TJM moyen vendu</div>
                  {stats.resteValeur > 0 && <div style={{ marginTop: 4, fontSize: 11, color: P.purple }}>+{fmt(Math.round(stats.resteValeur))} restant à valoriser</div>}
                </div>
              </div>
              <div style={cardBase}>
                {cardHdr(P.success, <FaCoins size={11} />, 'CA Encaissé')}
                <div style={{ padding: '14px 16px' }}>
                  {loadBar(P.success)}
                  <div style={{ fontSize: stats.caEncaisse > 999999 ? 18 : 22, fontWeight: 800, color: P.success, lineHeight: 1, marginBottom: 2, whiteSpace: 'nowrap' }}>
                    {!stats.allDone && stats.projetsAvecFin === 0 ? skl(100) : fmt(stats.caEncaisse)}
                  </div>
                  {stats.deviseAbr && stats.deviseAbr !== 'multi' && <div style={{ fontSize: 12, fontWeight: 700, color: P.success, marginBottom: 4 }}>{stats.deviseAbr}</div>}
                  {stats.montantOffre > 0 && (<>
                    <div style={{ fontSize: 11, color: P.dim, marginBottom: 3 }}>/ {fmt(stats.montantOffre)} offre · {Math.round((stats.caEncaisse / stats.montantOffre) * 100)}%</div>
                    {progBar((stats.caEncaisse / stats.montantOffre) * 100, P.success)}
                  </>)}
                </div>
              </div>
            </div>

            {/* Filtres + bouton créer */}
            <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
              <div style={{ flex: 1, minWidth: 220 }}>
                <FilterBar filters={[{ type: 'text', placeholder: 'Rechercher (projet, client, responsable, opportunité…)', onChange: setSearch }]} />
              </div>
              <select value={filtreStatutId} onChange={e => setFiltreStatutId(Number(e.target.value))} className="form-select form-select-sm" style={{ width: 155 }}>
                <option value={0}>Tous les statuts</option>
                {statutOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select value={filtreCp} onChange={e => setFiltreCp(e.target.value)} className="form-select form-select-sm" style={{ width: 155 }}>
                <option value="">Tous les responsables</option>
                {cpOptions.map(cp => <option key={cp} value={cp}>{cp}</option>)}
              </select>
              {clientOptions.length > 0 && (
                <select value={filtreClient} onChange={e => setFiltreClient(e.target.value)} className="form-select form-select-sm" style={{ width: 155 }}>
                  <option value="">Tous les clients</option>
                  {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {typeFactOptions.length > 0 && (
                <select value={filtreTypeFact} onChange={e => setFiltreTypeFact(e.target.value)} className="form-select form-select-sm" style={{ width: 160 }}>
                  <option value="">Tous les types</option>
                  {typeFactOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {activeFilters > 0 && (
                <>
                  <span style={{ fontSize: '0.78rem', color: '#6b7280', flexShrink: 0 }}><strong style={{ color: '#4338ca' }}>{filteredProjets.length}</strong> / {projets.length}</span>
                  <button onClick={() => { setSearch(''); setFiltreStatutId(0); setFiltreCp(''); setFiltreClient(''); setFiltreTypeFact(''); }} style={{ fontSize: 11, fontWeight: 600, color: P.tomato, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Réinitialiser</button>
                </>
              )}
              {hasPerm('PROJ_CREATE') ? (
                <Button label="Créer un projet" icon={<FaPlus />} onClick={() => { setSelectedProjet(null); setFormDirty(false); setShowFormProjet(true); }} />
              ) : (
                <span title="Vous n'avez pas l'autorisation de créer un projet">
                  <button className="custom-btn primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}>
                    Créer un projet <span className="btn-icon"><FaPlus /></span>
                  </button>
                </span>
              )}
            </div>

            <div className="table-responsive">
              <Table columns={columns} data={filteredProjets} expandedRowId={expandedRowId} expandedRow={renderExpandedRow} storageKey="liste_projet_columns" defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS} />
            </div>
          </div>
        </main>
      </div>

      <FormProjet show={showFormProjet} onClose={handleCloseFormProjet} projet={selectedProjet} onSubmit={async (_saved) => { setFormDirty(true); }} />
      <ProjetDetails show={showProjetDetails} onClose={() => { setShowProjetDetails(false); setSelectedProjet(null); }} projet={selectedProjet} />
      <BacklogProjetModal show={showBacklogModal} onClose={handleCloseBacklog} projetId={selectedProjetForBacklog?.idProjet ?? 0} projetNom={selectedProjetForBacklog?.nomProjet} leadId={selectedProjetForBacklog?.lead?.leadId ?? null} projectStartDate={selectedProjetForBacklog?.dateDebutPrevu ?? null} projectEndDate={selectedProjetForBacklog?.dateFinPrevu ?? null} />

      {/* ── Modal de confirmation d'archivage ── */}
      <ConfirmArchiveModal
        show={archiveTarget !== null}
        mode="archiver"
        nomProjet={archiveTarget?.nomProjet ?? ''}
        processing={archivingId !== null}
        onConfirm={handleArchiver}
        onCancel={() => setArchiveTarget(null)}
      />

      {/* ── Toast archivage ── */}
      {archiveToast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          background: '#223A46', color: '#fff', borderRadius: 10,
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.85rem', fontWeight: 500,
          boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
          animation: 'slideInToast 0.25s ease-out',
        }}>
          <FaArchive style={{ color: '#e9c97e' }} />
          <span>{archiveToast}</span>
        </div>
      )}
    </div>
  );
};

export default ListeProjet;