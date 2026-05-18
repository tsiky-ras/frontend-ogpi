import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FaProjectDiagram, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaChartBar, FaCalendarAlt, FaTrophy, FaMoneyBillWave, FaBalanceScale,
  FaReceipt, FaUserTie, FaFilter, FaChevronDown, FaChevronUp,
  FaArrowUp, FaArrowDown, FaMinus, FaLayerGroup, FaTasks,
  FaCircle, FaBullseye, FaHourglassHalf,
} from 'react-icons/fa';
import { Projet } from '../../../../types/projet/Projet.tsx';
import { ProjetAvancement } from '../../../../services/projet/ProjetAvancementService.tsx';
import { useComparaisonService } from '../../../../services/projet/comparaison/ComparaisonService.tsx';
import { useLeadTechFinDetailsService } from '../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx';
import { useDeviseService } from '../../../../services/lead/tech-fin/DeviseService.tsx';
import { Devise } from '../../../../types/lead/tech-fin/LeadTechFin.tsx';

// ─── Palette cohérente avec le reste de l'app ────────────────────────────────
const P = {
  charcoal: '#223A46', tomato: '#C93C29', success: '#2d8f47', warning: '#d97706',
  dim: '#5F6F6E', linen: '#E8E5D7', white: '#ffffff', blue: '#3b82f6',
  purple: '#7c3aed', teal: '#0ea5e9', orange: '#f97316', slate: '#64748b',
  bg: '#f8f9fa',
};

// ─── Statuts Kanban ──────────────────────────────────────────────────────────
const STATUT_META: Record<number, { label: string; color: string; bg: string }> = {
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

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProjetFin {
  montantOffre: number; jhVendu: number;
  montantLead: number;  jhLead: number;
  montantProjet: number; jhProjet: number;
  coutRealise: number;  jhRealise: number;
  chargesAnnexes: number;
  margeCommerciale: number; margeBudgetaireNette: number;
  tauxMargeComm: number | null; tauxMargeBud: number | null;
  ecartPlanifJH: number; ecartRealiseJH: number;
  tauxAvancement: number | null;
  caEncaisse: number; tauxChange: number; deviseAbr: string; loaded: boolean;
}
const EMPTY_FIN = (): ProjetFin => ({
  montantOffre: 0, jhVendu: 0, montantLead: 0, jhLead: 0,
  montantProjet: 0, jhProjet: 0, coutRealise: 0, jhRealise: 0,
  chargesAnnexes: 0, margeCommerciale: 0, margeBudgetaireNette: 0,
  tauxMargeComm: null, tauxMargeBud: null, ecartPlanifJH: 0, ecartRealiseJH: 0,
  tauxAvancement: null, caEncaisse: 0, tauxChange: 1, deviseAbr: '€', loaded: true,
});

interface DashboardProjetProps {
  projets: Projet[];
  statutMap: Map<number, number>;
  avancements: Map<number, ProjetAvancement>;
  loading: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt   = (n: number, d = '€') => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${d}`;
const fmtJH = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} JH`;
const fmtPct = (n: number | null) => n == null ? '—' : `${Math.round(n)}%`;

// ─── Sous-composants ─────────────────────────────────────────────────────────

const StatutBadge: React.FC<{ statutId: number | null }> = ({ statutId }) => {
  if (statutId === null) return (
    <span style={{ fontSize: 11, fontWeight: 600, color: P.slate, background: '#f1f5f9', borderRadius: 99, padding: '2px 8px' }}>
      Ouvert
    </span>
  );
  const m = STATUT_META[statutId];
  if (!m) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 99, padding: '2px 9px', border: `1px solid ${m.color}33`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

const ProgressBar: React.FC<{ pct: number; color: string; height?: number }> = ({ pct, color, height = 6 }) => (
  <div style={{ width: '100%', height, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
  </div>
);

const Delta: React.FC<{ val: number; unit?: string; inversed?: boolean; size?: number }> = ({ val, unit = '', inversed = false, size = 12 }) => {
  const good = inversed ? val > 0 : val < 0;
  const color = val === 0 ? P.warning : good ? P.success : P.tomato;
  const Icon = val === 0 ? FaMinus : val > 0 ? FaArrowUp : FaArrowDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: size, fontWeight: 700, color }}>
      <Icon size={9} />
      {Math.abs(val).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}{unit}
    </span>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
  icon: React.ReactNode; title: string; value: string | React.ReactNode;
  sub?: string; accent: string; trend?: React.ReactNode; loading?: boolean;
}> = ({ icon, title, value, sub, accent, trend, loading }) => (
  <div style={{
    background: P.white, borderRadius: 12, padding: '16px 18px',
    border: `1px solid ${P.linen}`, borderLeft: `4px solid ${accent}`,
    boxShadow: '0 1px 4px rgba(34,58,70,0.06)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
      <div style={{ color: accent, opacity: 0.7 }}>{icon}</div>
    </div>
    {loading
      ? <div style={{ height: 28, width: 100, background: '#e5e7eb', borderRadius: 6 }} />
      : <div style={{ fontSize: 26, fontWeight: 800, color: P.charcoal, lineHeight: 1 }}>{value}</div>
    }
    {sub && <div style={{ fontSize: 11, color: P.dim, marginTop: 5 }}>{sub}</div>}
    {trend && <div style={{ marginTop: 6 }}>{trend}</div>}
  </div>
);

// ─── Gauge circulaire SVG ────────────────────────────────────────────────────
const Gauge: React.FC<{ pct: number; color: string; size?: number; label?: string }> = ({ pct, color, size = 56, label }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(1, Math.max(0, pct / 100)) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color} fontSize={11} fontWeight={800}
          style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}>
          {Math.round(pct)}%
        </text>
      </svg>
      {label && <div style={{ fontSize: 10, color: P.dim, fontWeight: 600, textAlign: 'center', maxWidth: size }}>{label}</div>}
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────
const DashboardProjet: React.FC<DashboardProjetProps> = ({ projets, statutMap, avancements, loading }) => {
  const { getByProjetId }   = useComparaisonService();
  const leadTechFinService  = useLeadTechFinDetailsService();
  const [finMap, setFinMap] = useState<Map<number, ProjetFin>>(new Map());
  const [loadedCount, setLoadedCount] = useState(0);

  // ── Filtres récap ─────────────────────────────────────────────────────────
  const [filtreStatut,    setFiltreStatut]    = useState<number>(0);
  const [filtreCp,        setFiltreCp]        = useState<string>('');
  const [filtreClient,    setFiltreClient]    = useState<string>('');
  const [filtreSearch,    setFiltreSearch]    = useState<string>('');
  const [showFiltres,     setShowFiltres]     = useState(false);
  const [expandedIds,     setExpandedIds]     = useState<Set<number>>(new Set());
  const [triBudgetAlerte, setTriBudgetAlerte] = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const PAGE_SIZE = 8;

  // ── Filtres globaux date & devise ──────────────────────────────────────────
  const { getAll: getAllDevises } = useDeviseService();
  const [devises,      setDevises]      = useState<Devise[]>([]);
  const [filtreDevise, setFiltreDevise] = useState<string>('');
  const [dateDebut,    setDateDebut]    = useState<string>('');
  const [dateFin,      setDateFin]      = useState<string>('');
  const [datePreset,   setDatePreset]   = useState<'semaine' | 'mois' | 'annee' | ''>('');

  useEffect(() => { getAllDevises().then(setDevises).catch(() => {}); }, []);

  const applyPreset = (preset: 'semaine' | 'mois' | 'annee') => {
    const now = new Date();
    const toStr = (d: Date) => d.toISOString().slice(0, 10);
    let debut: Date, fin: Date;
    if (preset === 'semaine') {
      const day = now.getDay() || 7;
      debut = new Date(now); debut.setDate(now.getDate() - day + 1);
      fin   = new Date(debut); fin.setDate(debut.getDate() + 6);
    } else if (preset === 'mois') {
      debut = new Date(now.getFullYear(), now.getMonth(), 1);
      fin   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      debut = new Date(now.getFullYear(), 0, 1);
      fin   = new Date(now.getFullYear(), 11, 31);
    }
    setDateDebut(toStr(debut)); setDateFin(toStr(fin)); setDatePreset(preset);
  };

  const resetDateDevise = () => {
    setDateDebut(''); setDateFin(''); setDatePreset(''); setFiltreDevise('');
  };

  // Devise d'affichage : si filtre actif → devise sélectionnée, sinon MGA (tout converti)
  const deviseLabel = filtreDevise || 'MGA';

  const toggleExpand = (id: number) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Chargement données financières ────────────────────────────────────────
  const loadFin = useCallback(async (p: Projet) => {
    const pid = p.idProjet ?? 0;
    if (!pid || !p.lead?.leadId) {
      setFinMap(prev => new Map(prev).set(pid, EMPTY_FIN()));
      setLoadedCount(c => c + 1); return;
    }
    try {
      const d = await getByProjetId(pid);
      setFinMap(prev => new Map(prev).set(pid, {
        montantOffre: d.offreMontantSigne ?? 0, jhVendu: d.offreJhVendu ?? 0,
        montantLead: d.montantBacklogLead ?? 0, jhLead: d.jhBacklogLeadTotal ?? 0,
        montantProjet: d.montantBacklogProjet ?? 0, jhProjet: d.jhBacklogProjetTotal ?? 0,
        coutRealise: d.coutRealiseTotal ?? 0, jhRealise: d.jhRealiseTotal ?? 0,
        chargesAnnexes: d.totalChargesAnnexes ?? 0,
        margeCommerciale: d.margeCommercialeMontant ?? 0,
        margeBudgetaireNette: d.margeBudgetaireNette ?? 0,
        tauxMargeComm: d.tauxMargeCommercialePct ?? null,
        tauxMargeBud: d.tauxMargeBudgetairePct ?? null,
        ecartPlanifJH: d.ecartPlanificationJhTotal ?? 0,
        ecartRealiseJH: d.ecartRealiseJhTotal ?? 0,
        tauxAvancement: d.tauxAvancementGlobalPct ?? null,
        caEncaisse: d.caEncaisse ?? 0,
        tauxChange: d.tauxChange ?? 1, deviseAbr: d.deviseAbr ?? '€', loaded: true,
      }));
    } catch {
      setFinMap(prev => new Map(prev).set(pid, EMPTY_FIN()));
    } finally { setLoadedCount(c => c + 1); }
  }, [getByProjetId]);

  useEffect(() => {
    if (!projets.length) return;
    setFinMap(new Map()); setLoadedCount(0);
    projets.forEach(p => loadFin(p));
  }, [projets]);

  const finLoaded = loadedCount >= projets.length && projets.length > 0;

  // ── Filtre global date + devise (appliqué aux KPIs ET au récap) ───────────
  const projetsGlobalFiltres = useMemo(() => {
    let res = projets;
    if (dateDebut) {
      const d = new Date(dateDebut);
      res = res.filter(p => !p.dateFinPrevu || new Date(p.dateFinPrevu) >= d);
    }
    if (dateFin) {
      const d = new Date(dateFin);
      res = res.filter(p => !p.dateDebutPrevu || new Date(p.dateDebutPrevu) <= d);
    }
    if (filtreDevise) {
      res = res.filter(p => finMap.get(p.idProjet ?? 0)?.deviseAbr === filtreDevise);
    }
    return res;
  }, [projets, dateDebut, dateFin, filtreDevise, finMap, loadedCount]);

  // ── KPIs globaux ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const now = new Date();
    let enCours = 0, termines = 0, enRetard = 0;
    let tachesVal = 0, tachesTot = 0;
    let jhPlanifie = 0, jhRealise = 0, montantOffre = 0, caEncaisse = 0;
    let margeComm = 0, margeBud = 0;
    let alertesRed = 0, alertesOrange = 0;

    projetsGlobalFiltres.forEach(p => {
      const pid = p.idProjet ?? 0;
      const sid = statutMap.get(pid);
      if (sid === 9) termines++; else enCours++;
      if (p.dateFinPrevu && new Date(p.dateFinPrevu) < now && sid !== 9) enRetard++;
      const av = avancements.get(pid);
      if (av) { tachesVal += av.tachesValidees; tachesTot += av.tachesTotal; }
      const fin = finMap.get(pid);
      if (fin?.loaded) {
        // Sans filtre devise → convertir tout en MGA (montant × tauxChange)
        // Avec filtre devise → afficher dans la devise sélectionnée (montant brut)
        const taux = filtreDevise ? 1 : (fin.tauxChange ?? 1);
        jhPlanifie   += fin.jhProjet;   jhRealise  += fin.jhRealise;
        montantOffre += fin.montantOffre          * taux;
        caEncaisse   += fin.caEncaisse            * taux;
        margeComm    += fin.margeCommerciale      * taux;
        margeBud     += fin.margeBudgetaireNette  * taux;
        if (fin.jhProjet > 0) {
          const pct = (fin.jhRealise / fin.jhProjet) * 100;
          if (pct > 95) alertesRed++; else if (pct > 80) alertesOrange++;
        }
      }
    });

    const total           = projetsGlobalFiltres.length;
    const avancementTaches  = tachesTot > 0 ? (tachesVal / tachesTot) * 100 : 0;
    const consoJH           = jhPlanifie > 0 ? (jhRealise / jhPlanifie) * 100 : 0;
    const respectPlanning   = total > 0 ? ((total - enRetard) / total) * 100 : 100;
    const encaissePct       = montantOffre > 0 ? (caEncaisse / montantOffre) * 100 : 0;
    const tauxMargeComm     = montantOffre > 0 ? (margeComm / montantOffre) * 100 : null;
    const tauxMargeBud      = montantOffre > 0 ? (margeBud / montantOffre) * 100 : null;

    return {
      total, enCours, termines, enRetard,
      tachesVal, tachesTot, avancementTaches,
      jhPlanifie, jhRealise, consoJH,
      montantOffre, caEncaisse, encaissePct,
      margeComm, margeBud, tauxMargeComm, tauxMargeBud,
      respectPlanning, alertesRed, alertesOrange,
    };
  }, [projetsGlobalFiltres, statutMap, avancements, finMap, loadedCount, filtreDevise]);

  // ── Options filtres ───────────────────────────────────────────────────────
  const cpOptions = useMemo(() => {
    const s = new Set<string>();
    projetsGlobalFiltres.forEach(p => { if (p.userCp?.username) s.add(p.userCp.username); });
    return [...s].sort();
  }, [projetsGlobalFiltres]);

  const clientOptions = useMemo(() => {
    const s = new Set<string>();
    projetsGlobalFiltres.forEach(p => { if (p.lead?.client?.name) s.add(p.lead.client.name); });
    return [...s].sort();
  }, [projetsGlobalFiltres]);

  const statutOptions = useMemo(() => {
    const s = new Set<number>();
    statutMap.forEach(sid => s.add(sid));
    return [...s].sort().map(id => STATUT_META[id] ? { id, ...STATUT_META[id] } : null).filter(Boolean);
  }, [statutMap]);

  // ── Projets filtrés (récap) — part de projetsGlobalFiltres ───────────────
  const projetsFiltres = useMemo(() => {
    let res = projetsGlobalFiltres;
    if (filtreStatut !== 0) res = res.filter(p => statutMap.get(p.idProjet ?? 0) === filtreStatut);
    if (filtreCp)      res = res.filter(p => p.userCp?.username === filtreCp);
    if (filtreClient)  res = res.filter(p => p.lead?.client?.name === filtreClient);
    if (filtreSearch.trim()) {
      const q = filtreSearch.toLowerCase();
      res = res.filter(p =>
        p.nomProjet?.toLowerCase().includes(q) ||
        (p.lead?.leadName ?? '').toLowerCase().includes(q) ||
        (p.lead?.client?.name ?? '').toLowerCase().includes(q) ||
        (p.userCp?.username ?? '').toLowerCase().includes(q)
      );
    }
    if (triBudgetAlerte) {
      res = [...res].sort((a, b) => {
        const fa = finMap.get(a.idProjet ?? 0);
        const fb = finMap.get(b.idProjet ?? 0);
        const pa = fa?.jhProjet ? (fa.jhRealise / fa.jhProjet) * 100 : 0;
        const pb = fb?.jhProjet ? (fb.jhRealise / fb.jhProjet) * 100 : 0;
        return pb - pa;
      });
    }
    return res;
  }, [projetsGlobalFiltres, filtreStatut, filtreCp, filtreClient, filtreSearch, triBudgetAlerte, statutMap, finMap]);

  const activeFilters = [filtreStatut !== 0, filtreCp !== '', filtreClient !== '', filtreSearch !== ''].filter(Boolean).length;

  // Reset page quand les filtres changent
  React.useEffect(() => { setCurrentPage(1); }, [filtreStatut, filtreCp, filtreClient, filtreSearch, triBudgetAlerte]);

  // Découpage en page
  const totalPages   = Math.max(1, Math.ceil(projetsFiltres.length / PAGE_SIZE));
  const projetsPage  = projetsFiltres.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Répartition par statut (pour le mini chart) — basée sur le filtre global
  const repartitionStatut = useMemo(() => {
    const map = new Map<number, number>();
    projetsGlobalFiltres.forEach(p => {
      const sid = statutMap.get(p.idProjet ?? 0);
      if (sid != null) map.set(sid, (map.get(sid) ?? 0) + 1);
    });
    const total = projetsGlobalFiltres.length;
    return [...map.entries()].sort(([a], [b]) => a - b).map(([sid, count]) => ({
      sid, count, meta: STATUT_META[sid], pct: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [projetsGlobalFiltres, statutMap]);

  // ── Style helpers ─────────────────────────────────────────────────────────
  const section = (title: string, icon: React.ReactNode, color: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 3, height: 20, background: color, borderRadius: 2 }} />
      <span style={{ color, fontSize: 11 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: P.charcoal, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
    </div>
  );

  return (
    <div style={{ padding: '0 0 32px', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ════════════════════════════════════════════════════════
          FILTRES GLOBAUX — PÉRIODE & DEVISE
      ════════════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${P.linen}`, padding: '12px 16px', marginBottom: 20, boxShadow: '0 1px 4px rgba(34,58,70,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <FaCalendarAlt size={11} color={P.charcoal} />
          <span style={{ fontSize: 10, fontWeight: 800, color: P.charcoal, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Période & Devise</span>
          {(dateDebut || dateFin || filtreDevise) && (
            <button onClick={resetDateDevise} style={{ marginLeft: 'auto', fontSize: 11, border: 'none', background: 'transparent', color: P.tomato, cursor: 'pointer', fontWeight: 600 }}>
              Réinitialiser
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>

          {/* Boutons presets */}
          {(['semaine', 'mois', 'annee'] as const).map(preset => (
            <button key={preset} onClick={() => applyPreset(preset)} style={{
              fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s',
              border: `1px solid ${datePreset === preset ? P.charcoal : P.linen}`,
              background: datePreset === preset ? P.charcoal : 'transparent',
              color: datePreset === preset ? '#fff' : P.charcoal,
            }}>
              {preset === 'semaine' ? 'Semaine' : preset === 'mois' ? 'Mois' : 'Année'}
            </button>
          ))}

          <span style={{ width: 1, height: 20, background: P.linen, flexShrink: 0 }} />

          {/* Plage dates */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: P.dim, fontWeight: 500 }}>
            Du
            <input type="date" value={dateDebut}
              onChange={e => { setDateDebut(e.target.value); setDatePreset(''); }}
              style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${dateDebut ? P.charcoal : P.linen}`, fontSize: 12, color: P.charcoal, background: '#fff' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: P.dim, fontWeight: 500 }}>
            Au
            <input type="date" value={dateFin}
              onChange={e => { setDateFin(e.target.value); setDatePreset(''); }}
              style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${dateFin ? P.charcoal : P.linen}`, fontSize: 12, color: P.charcoal, background: '#fff' }}
            />
          </label>

          <span style={{ width: 1, height: 20, background: P.linen, flexShrink: 0 }} />

          {/* Sélecteur devise */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: P.dim, fontWeight: 500 }}>
            <FaMoneyBillWave size={10} />
            Devise
            <select value={filtreDevise} onChange={e => setFiltreDevise(e.target.value)}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 12, color: P.charcoal, background: '#fff', cursor: 'pointer',
                border: `1px solid ${filtreDevise ? P.charcoal : P.linen}`,
                fontWeight: filtreDevise ? 700 : 400,
              }}>
              <option value="">Toutes — MGA</option>
              {devises.map(d => (
                <option key={d.id} value={d.abrDevise}>{d.abrDevise} — {d.nomDevise}</option>
              ))}
            </select>
          </label>

          {/* Indicateur filtre actif */}
          {projetsGlobalFiltres.length < projets.length && (
            <span style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: P.teal,
              background: '#f0fdfa', borderRadius: 99, padding: '2px 10px', border: '1px solid #a7f3d0',
            }}>
              {projetsGlobalFiltres.length} / {projets.length} projets
            </span>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 1 — KPIs OPÉRATIONNELS
      ════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 28 }}>
        {section('Indicateurs opérationnels', <FaBullseye size={12} />, P.charcoal)}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          {/* Projets */}
          <KpiCard
            icon={<FaProjectDiagram size={16} />}
            title="Projets actifs"
            accent={P.charcoal}
            loading={loading}
            value={<span>{kpis.enCours} <span style={{ fontSize: 16, color: P.dim }}>/ {kpis.total}</span></span>}
            sub={`${kpis.termines} terminé${kpis.termines > 1 ? 's' : ''}`}
            trend={kpis.enRetard > 0 ? (
              <span style={{ fontSize: 11, color: P.tomato, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FaExclamationTriangle size={9} /> {kpis.enRetard} en retard
              </span>
            ) : (
              <span style={{ fontSize: 11, color: P.success, fontWeight: 600 }}>✓ Tous dans les délais</span>
            )}
          />

          {/* Respect planning */}
          <div style={{ background: P.white, borderRadius: 12, padding: '16px 18px', border: `1px solid ${P.linen}`, borderLeft: `4px solid ${kpis.enRetard > 0 ? P.tomato : P.success}`, boxShadow: '0 1px 4px rgba(34,58,70,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Respect planning</div>
                {loading
                  ? <div style={{ height: 28, width: 80, background: '#e5e7eb', borderRadius: 6 }} />
                  : <div style={{ fontSize: 26, fontWeight: 800, color: kpis.enRetard > 0 ? P.tomato : P.success }}>{fmtPct(kpis.respectPlanning)}</div>
                }
                <div style={{ fontSize: 11, color: P.dim, marginTop: 5 }}>{kpis.total - kpis.enRetard} / {kpis.total} projets</div>
              </div>
              <Gauge pct={kpis.respectPlanning} color={kpis.enRetard > 0 ? P.tomato : P.success} size={60} />
            </div>
            <ProgressBar pct={kpis.respectPlanning} color={kpis.enRetard > 0 ? P.tomato : P.success} height={5} />
          </div>

          {/* Avancement tâches */}
          <div style={{ background: P.white, borderRadius: 12, padding: '16px 18px', border: `1px solid ${P.linen}`, borderLeft: `4px solid ${P.blue}`, boxShadow: '0 1px 4px rgba(34,58,70,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Avancement tâches</div>
                {loading
                  ? <div style={{ height: 28, width: 80, background: '#e5e7eb', borderRadius: 6 }} />
                  : <div style={{ fontSize: 26, fontWeight: 800, color: P.blue }}>{fmtPct(kpis.avancementTaches)}</div>
                }
                <div style={{ fontSize: 11, color: P.dim, marginTop: 5 }}>
                  {kpis.tachesVal} / {kpis.tachesTot} validées
                </div>
              </div>
              <Gauge pct={kpis.avancementTaches} color={P.blue} size={60} />
            </div>
            <ProgressBar pct={kpis.avancementTaches} color={P.blue} height={5} />
          </div>

          {/* Conso JH */}
          <div style={{ background: P.white, borderRadius: 12, padding: '16px 18px', border: `1px solid ${P.linen}`, borderLeft: `4px solid ${kpis.consoJH > 95 ? P.tomato : kpis.consoJH > 80 ? P.warning : P.teal}`, boxShadow: '0 1px 4px rgba(34,58,70,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Consommation JH</div>
                {loading || !finLoaded
                  ? <div style={{ height: 28, width: 80, background: '#e5e7eb', borderRadius: 6 }} />
                  : <div style={{ fontSize: 26, fontWeight: 800, color: kpis.consoJH > 95 ? P.tomato : kpis.consoJH > 80 ? P.warning : P.teal }}>{fmtPct(kpis.consoJH)}</div>
                }
                <div style={{ fontSize: 11, color: P.dim, marginTop: 5 }}>
                  {fmtJH(kpis.jhRealise)} / {fmtJH(kpis.jhPlanifie)}
                </div>
                {(kpis.alertesRed > 0 || kpis.alertesOrange > 0) && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    {kpis.alertesRed > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: P.tomato, background: '#fef2f2', borderRadius: 99, padding: '1px 7px' }}>🔴 {kpis.alertesRed}</span>}
                    {kpis.alertesOrange > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: P.warning, background: '#fffbeb', borderRadius: 99, padding: '1px 7px' }}>🟠 {kpis.alertesOrange}</span>}
                  </div>
                )}
              </div>
              <Gauge pct={kpis.consoJH} color={kpis.consoJH > 95 ? P.tomato : kpis.consoJH > 80 ? P.warning : P.teal} size={60} />
            </div>
            <ProgressBar pct={kpis.consoJH} color={kpis.consoJH > 95 ? P.tomato : kpis.consoJH > 80 ? P.warning : P.teal} height={5} />
          </div>
        </div>

        {/* Reste à produire + Répartition statuts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Reste à produire */}
          <div style={{ background: P.white, borderRadius: 12, padding: '16px 18px', border: `1px solid ${P.linen}`, boxShadow: '0 1px 4px rgba(34,58,70,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              <FaHourglassHalf size={10} style={{ marginRight: 5 }} />Reste à produire
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'JH restants', val: fmtJH(Math.max(0, kpis.jhPlanifie - kpis.jhRealise)), color: P.teal, sub: 'vs planifié' },
                { label: 'Tâches restantes', val: `${kpis.tachesTot - kpis.tachesVal}`, color: P.blue, sub: `sur ${kpis.tachesTot} total` },
                { label: 'CA restant', val: kpis.montantOffre > 0 ? `${((kpis.montantOffre - kpis.caEncaisse) / 1000).toFixed(0)}k` : '—', color: P.purple, sub: 'à encaisser' },
              ].map(({ label, val, color, sub }) => (
                <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>
                    {loading || !finLoaded ? <span style={{ fontSize: 14, color: '#e5e7eb' }}>—</span> : val}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: P.charcoal }}>{label}</div>
                  <div style={{ fontSize: 10, color: P.dim }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Répartition par statut */}
          <div style={{ background: P.white, borderRadius: 12, padding: '16px 18px', border: `1px solid ${P.linen}`, boxShadow: '0 1px 4px rgba(34,58,70,0.06)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              <FaLayerGroup size={10} style={{ marginRight: 5 }} />Répartition par statut
            </div>
            {loading ? (
              <div style={{ height: 60, background: '#f1f5f9', borderRadius: 8 }} />
            ) : repartitionStatut.length === 0 ? (
              <div style={{ fontSize: 12, color: P.dim, textAlign: 'center', padding: '16px 0' }}>
                Aucun projet trouvé pour cette période.
              </div>
            ) : (
              <>
                {/* Barre stacked */}
                <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                  {repartitionStatut.map(({ sid, pct, meta }) => (
                    <div key={sid} style={{ width: `${pct}%`, background: meta?.color ?? P.dim, transition: 'width 0.5s' }} title={`${meta?.label}: ${Math.round(pct)}%`} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
                  {repartitionStatut.map(({ sid, count, meta }) => (
                    <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta?.color ?? P.dim, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: P.dim }}>{meta?.label ?? `Statut ${sid}`}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: meta?.color ?? P.dim }}>{count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 2 — INDICATEURS FINANCIERS
      ════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 28 }}>
        {section('Indicateurs financiers', <FaMoneyBillWave size={12} />, P.blue)}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <KpiCard icon={<FaMoneyBillWave size={14} />} title="Offre signée totale" accent={P.blue} loading={!finLoaded}
            value={<span style={{ fontSize: 20 }}>{kpis.montantOffre > 1000 ? `${(kpis.montantOffre / 1000).toFixed(0)}k` : kpis.montantOffre.toLocaleString('fr-FR')} <span style={{ fontSize: 13, fontWeight: 600, color: P.blue }}>{deviseLabel}</span></span>}
            sub="Somme des offres vendues"
          />
          <KpiCard icon={<FaReceipt size={14} />} title="CA encaissé" accent={P.success} loading={!finLoaded}
            value={<span style={{ fontSize: 20 }}>{kpis.caEncaisse > 1000 ? `${(kpis.caEncaisse / 1000).toFixed(0)}k` : kpis.caEncaisse.toLocaleString('fr-FR')} <span style={{ fontSize: 13, fontWeight: 600, color: P.success }}>{deviseLabel}</span></span>}
            sub={`${fmtPct(kpis.encaissePct)} de l'offre`}
            trend={<ProgressBar pct={kpis.encaissePct} color={P.success} height={4} />}
          />
          <KpiCard icon={<FaTrophy size={14} />} title="Marge prévisionnelle" accent={kpis.margeComm >= 0 ? P.success : P.tomato} loading={!finLoaded}
            value={
              <span style={{ fontSize: 18, color: kpis.margeComm >= 0 ? P.success : P.tomato }}>
                {kpis.margeComm >= 0 ? '+' : ''}{kpis.margeComm > 1000 ? `${(kpis.margeComm / 1000).toFixed(0)}k` : kpis.margeComm.toLocaleString('fr-FR')} <span style={{ fontSize: 13 }}>{deviseLabel}</span>
              </span>
            }
            sub={`${fmtPct(kpis.tauxMargeComm)} · Offre − O.tech`}
          />
          <KpiCard icon={<FaBalanceScale size={14} />} title="Marge budgétaire nette" accent={kpis.margeBud >= 0 ? P.success : P.tomato} loading={!finLoaded}
            value={
              <span style={{ fontSize: 18, color: kpis.margeBud >= 0 ? P.success : P.tomato }}>
                {kpis.margeBud >= 0 ? '+' : ''}{kpis.margeBud > 1000 ? `${(kpis.margeBud / 1000).toFixed(0)}k` : kpis.margeBud.toLocaleString('fr-FR')} <span style={{ fontSize: 13 }}>{deviseLabel}</span>
              </span>
            }
            sub={`${fmtPct(kpis.tauxMargeBud)} · Offre − (Projet + Charges)`}
          />
          <KpiCard icon={<FaChartBar size={14} />} title="Alertes budget" accent={kpis.alertesRed > 0 ? P.tomato : kpis.alertesOrange > 0 ? P.warning : P.success} loading={!finLoaded}
            value={
              <span style={{ fontSize: 24, color: kpis.alertesRed > 0 ? P.tomato : kpis.alertesOrange > 0 ? P.warning : P.success }}>
                {kpis.alertesRed + kpis.alertesOrange}
              </span>
            }
            sub="Projets en dépassement JH"
            trend={
              <div style={{ display: 'flex', gap: 6 }}>
                {kpis.alertesRed > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: P.tomato, background: '#fef2f2', borderRadius: 99, padding: '1px 7px' }}>🔴 {kpis.alertesRed} critique{kpis.alertesRed > 1 ? 's' : ''}</span>}
                {kpis.alertesOrange > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: P.warning, background: '#fffbeb', borderRadius: 99, padding: '1px 7px' }}>🟠 {kpis.alertesOrange}</span>}
                {kpis.alertesRed + kpis.alertesOrange === 0 && <span style={{ fontSize: 10, color: P.success }}>✓ Aucune alerte</span>}
              </div>
            }
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 3 — RÉCAP PROJETS (vue générale + filtres)
      ════════════════════════════════════════════════════════ */}
      <div>
        {section('Récap projets', <FaTasks size={12} />, P.teal)}

        {/* Barre filtres */}
        <div style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.linen}`, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <FaFilter size={11} color={activeFilters > 0 ? P.teal : P.dim} />
              <input
                type="text" placeholder="Rechercher un projet, client, responsable…"
                value={filtreSearch} onChange={e => setFiltreSearch(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: P.charcoal, background: 'transparent' }}
              />
              {activeFilters > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: P.teal, background: '#f0fdfa', borderRadius: 99, padding: '1px 8px', border: '1px solid #a7f3d0' }}>
                  {activeFilters} filtre{activeFilters > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setTriBudgetAlerte(v => !v)}
                style={{ fontSize: 11, fontWeight: 600, border: `1px solid ${triBudgetAlerte ? P.tomato : P.linen}`, background: triBudgetAlerte ? '#fef2f2' : 'transparent', color: triBudgetAlerte ? P.tomato : P.dim, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
              >
                🔴 Tri alertes
              </button>
              {activeFilters > 0 && (
                <button onClick={() => { setFiltreStatut(0); setFiltreCp(''); setFiltreClient(''); setFiltreSearch(''); setTriBudgetAlerte(false); }}
                  style={{ fontSize: 11, border: 'none', background: 'transparent', color: P.tomato, cursor: 'pointer', fontWeight: 600 }}>
                  Réinitialiser
                </button>
              )}
              <button
                onClick={() => setShowFiltres(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, border: `1px solid ${P.linen}`, background: '#f8f9fa', color: P.charcoal, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
              >
                Filtres avancés {showFiltres ? <FaChevronUp size={9} /> : <FaChevronDown size={9} />}
              </button>
            </div>
          </div>

          {showFiltres && (
            <div style={{ borderTop: `1px solid ${P.linen}`, padding: '10px 14px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <select value={filtreStatut} onChange={e => setFiltreStatut(Number(e.target.value))}
                style={{ fontSize: 12, border: `1px solid ${P.linen}`, borderRadius: 6, padding: '4px 10px', color: P.charcoal, background: P.white }}>
                <option value={0}>Tous les statuts</option>
                {statutOptions.map(s => s && <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select value={filtreCp} onChange={e => setFiltreCp(e.target.value)}
                style={{ fontSize: 12, border: `1px solid ${P.linen}`, borderRadius: 6, padding: '4px 10px', color: P.charcoal, background: P.white }}>
                <option value="">Tous les responsables</option>
                {cpOptions.map(cp => <option key={cp} value={cp}>{cp}</option>)}
              </select>
              {clientOptions.length > 0 && (
                <select value={filtreClient} onChange={e => setFiltreClient(e.target.value)}
                  style={{ fontSize: 12, border: `1px solid ${P.linen}`, borderRadius: 6, padding: '4px 10px', color: P.charcoal, background: P.white }}>
                  <option value="">Tous les clients</option>
                  {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <span style={{ fontSize: 12, color: P.dim, alignSelf: 'center' }}>
                <strong style={{ color: P.charcoal }}>{projetsFiltres.length}</strong> / {projetsGlobalFiltres.length} projet{projetsGlobalFiltres.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Tableau récap */}
        <div style={{ background: P.white, borderRadius: 10, border: `1px solid ${P.linen}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(34,58,70,0.06)' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 28px', gap: 0, background: P.charcoal, padding: '8px 14px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <div>Projet</div>
            <div>Statut</div>
            <div>Responsable</div>
            <div>Avancement tâches</div>
            <div>Conso. JH</div>
            <div>Marge nette</div>
            <div />
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: '32px 14px', textAlign: 'center', color: P.dim, fontSize: 13 }}>
              Chargement des projets…
            </div>
          ) : projets.length === 0 ? (
            <div style={{ padding: '32px 14px', textAlign: 'center', color: P.dim, fontSize: 13 }}>
              Aucun projet trouvé.
            </div>
          ) : projetsFiltres.length === 0 ? (
            <div style={{ padding: '32px 14px', textAlign: 'center', color: P.dim, fontSize: 13 }}>
              Aucun projet ne correspond aux filtres sélectionnés.
            </div>
          ) : projetsPage.map(p => {
            const pid       = p.idProjet ?? 0;
            const sid       = statutMap.get(pid) ?? null;
            const av        = avancements.get(pid);
            const fin       = finMap.get(pid);
            const expanded  = expandedIds.has(pid);
            const avPct     = av ? av.avancementTaches : 0;
            const jhPct     = fin?.jhProjet ? (fin.jhRealise / fin.jhProjet) * 100 : 0;
            const enRetard  = p.dateFinPrevu && new Date(p.dateFinPrevu) < new Date() && sid !== 9;
            const jhAlerte  = jhPct > 95 ? 'rouge' : jhPct > 80 ? 'orange' : 'ok';

            return (
              <React.Fragment key={pid}>
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 28px',
                    gap: 0, padding: '10px 14px', borderTop: `1px solid ${P.linen}`,
                    alignItems: 'center', cursor: 'pointer',
                    background: expanded ? '#f8fafc' : P.white,
                    transition: 'background 0.15s',
                  }}
                  onClick={() => toggleExpand(pid)}
                  onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}
                  onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = P.white; }}
                >
                  {/* Projet */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.charcoal, marginBottom: 2 }}>{p.nomProjet}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {p.lead?.leadRef && <span style={{ fontSize: 10, color: P.dim }}>{p.lead.leadRef}</span>}
                      {p.lead?.client?.name && <span style={{ fontSize: 10, fontWeight: 600, color: P.blue }}>{p.lead.client.name}</span>}
                      {enRetard && <span style={{ fontSize: 10, fontWeight: 700, color: P.tomato, background: '#fef2f2', borderRadius: 4, padding: '0px 5px' }}>Retard</span>}
                    </div>
                    {p.dateFinPrevu && (
                      <div style={{ fontSize: 10, color: P.dim, marginTop: 2 }}>
                        <FaCalendarAlt size={8} style={{ marginRight: 3 }} />
                        {new Date(p.dateFinPrevu).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>

                  {/* Statut */}
                  <div><StatutBadge statutId={sid} /></div>

                  {/* Responsable */}
                  <div>
                    {p.userCp?.username
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: P.linen, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FaUserTie size={9} color={P.charcoal} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: P.charcoal }}>{p.userCp.username}</span>
                        </div>
                      : <span style={{ fontSize: 11, color: P.warning }}>Non assigné</span>
                    }
                  </div>

                  {/* Avancement tâches */}
                  <div>
                    {loading ? <div style={{ height: 14, width: 80, background: '#e5e7eb', borderRadius: 4 }} /> : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: P.dim }}>{av?.tachesValidees ?? 0}/{av?.tachesTotal ?? 0}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: P.blue }}>{Math.round(avPct)}%</span>
                        </div>
                        <ProgressBar pct={avPct} color={P.blue} height={5} />
                      </>
                    )}
                  </div>

                  {/* Conso JH */}
                  <div>
                    {!fin?.loaded ? <div style={{ height: 14, width: 80, background: '#e5e7eb', borderRadius: 4 }} /> : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: P.dim }}>{fmtJH(fin.jhRealise)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: jhAlerte === 'rouge' ? P.tomato : jhAlerte === 'orange' ? P.warning : P.teal }}>
                            {Math.round(jhPct)}%
                          </span>
                        </div>
                        <ProgressBar pct={jhPct} color={jhAlerte === 'rouge' ? P.tomato : jhAlerte === 'orange' ? P.warning : P.teal} height={5} />
                      </>
                    )}
                  </div>

                  {/* Marge nette */}
                  <div>
                    {!fin?.loaded ? <div style={{ height: 14, width: 70, background: '#e5e7eb', borderRadius: 4 }} /> : !p.lead?.leadId ? (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 800, color: fin.margeBudgetaireNette >= 0 ? P.success : P.tomato, marginBottom: 2 }}>
                          {fin.margeBudgetaireNette >= 0 ? '+' : ''}{fin.margeBudgetaireNette > 1000 ? `${(fin.margeBudgetaireNette / 1000).toFixed(0)}k` : fin.margeBudgetaireNette.toLocaleString('fr-FR')} {fin.deviseAbr}
                        </div>
                        <div style={{ fontSize: 10, color: P.dim }}>{fmtPct(fin.tauxMargeBud)} O.vendu</div>
                      </>
                    )}
                  </div>

                  {/* Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {expanded ? <FaChevronUp size={10} color={P.teal} /> : <FaChevronDown size={10} color={P.dim} />}
                  </div>
                </div>

                {/* Ligne détail expandée */}
                {expanded && (
                  <div style={{ background: '#f8fafc', borderTop: `1px dashed ${P.linen}`, padding: '14px 16px', borderBottom: `2px solid ${P.teal}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>

                      {/* Dates */}
                      <div style={{ background: P.white, borderRadius: 8, padding: '10px 12px', border: `1px solid ${P.linen}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', marginBottom: 8 }}>Planning</div>
                        <div style={{ fontSize: 11, color: P.dim, marginBottom: 4 }}>
                          Début : <strong style={{ color: P.charcoal }}>{p.dateDebutPrevu ? new Date(p.dateDebutPrevu).toLocaleDateString('fr-FR') : '—'}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: enRetard ? P.tomato : P.dim }}>
                          Fin : <strong style={{ color: enRetard ? P.tomato : P.charcoal }}>{p.dateFinPrevu ? new Date(p.dateFinPrevu).toLocaleDateString('fr-FR') : '—'}</strong>
                          {enRetard && <span style={{ marginLeft: 5, fontSize: 10, color: P.tomato, fontWeight: 700 }}>En retard</span>}
                        </div>
                        {p.userSuppleante?.username && (
                          <div style={{ fontSize: 11, color: P.dim, marginTop: 6 }}>
                            Suppléant : <strong style={{ color: P.charcoal }}>{p.userSuppleante.username}</strong>
                          </div>
                        )}
                      </div>

                      {/* JH 4 niveaux */}
                      {fin?.loaded && p.lead?.leadId ? (
                        <div style={{ background: P.white, borderRadius: 8, padding: '10px 12px', border: `1px solid ${P.linen}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', marginBottom: 8 }}>JH — 4 niveaux</div>
                          {[
                            { label: 'O. vendu', val: fmtJH(fin.jhVendu), color: P.blue },
                            { label: 'O. tech', val: fmtJH(fin.jhLead), color: P.purple },
                            { label: 'Projet', val: fmtJH(fin.jhProjet), color: P.teal },
                            { label: 'Réalisé', val: fmtJH(fin.jhRealise), color: fin.jhRealise > fin.jhProjet ? P.tomato : P.success },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: P.dim }}>{label}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      ) : <div />}

                      {/* Budget */}
                      {fin?.loaded && p.lead?.leadId ? (
                        <div style={{ background: P.white, borderRadius: 8, padding: '10px 12px', border: `1px solid ${P.linen}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', marginBottom: 8 }}>Budget</div>
                          {[
                            { label: 'O. vendu', val: fin.montantOffre, color: P.blue },
                            { label: 'O. tech', val: fin.montantLead, color: P.purple },
                            { label: 'Projet', val: fin.montantProjet, color: P.teal },
                            { label: 'Réalisé', val: fin.coutRealise, color: fin.coutRealise > fin.montantProjet ? P.tomato : P.success },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: P.dim }}>{label}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color }}>{fmt(val, fin.deviseAbr)}</span>
                            </div>
                          ))}
                          {fin.chargesAnnexes > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px dashed #e2e8f0' }}>
                              <span style={{ fontSize: 11, color: P.warning }}>Charges annexes</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: P.warning }}>{fmt(fin.chargesAnnexes, fin.deviseAbr)}</span>
                            </div>
                          )}
                        </div>
                      ) : <div />}

                      {/* Marges */}
                      {fin?.loaded && p.lead?.leadId ? (
                        <div style={{ background: P.white, borderRadius: 8, padding: '10px 12px', border: `1px solid ${P.linen}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', marginBottom: 8 }}>Marges & CA</div>
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 10, color: P.dim, marginBottom: 2 }}>Marge prévisionnelle</div>
                            <Delta val={fin.margeCommerciale} unit={` ${fin.deviseAbr}`} inversed size={13} />
                            <span style={{ fontSize: 10, color: P.dim, marginLeft: 5 }}>{fmtPct(fin.tauxMargeComm)}</span>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 10, color: P.dim, marginBottom: 2 }}>Marge budgétaire nette</div>
                            <Delta val={fin.margeBudgetaireNette} unit={` ${fin.deviseAbr}`} inversed size={13} />
                            <span style={{ fontSize: 10, color: P.dim, marginLeft: 5 }}>{fmtPct(fin.tauxMargeBud)}</span>
                          </div>
                          {fin.caEncaisse > 0 && (
                            <div>
                              <div style={{ fontSize: 10, color: P.dim, marginBottom: 2 }}>CA encaissé</div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: P.success }}>{fmt(fin.caEncaisse, fin.deviseAbr)}</span>
                            </div>
                          )}
                        </div>
                      ) : <div />}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Pagination ── */}
        {projetsFiltres.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>

            {/* Compteur */}
            <span style={{ fontSize: 11, color: P.dim }}>
              Page <strong style={{ color: P.charcoal }}>{currentPage}</strong> / {totalPages}
              &nbsp;·&nbsp;
              <strong style={{ color: P.charcoal }}>{projetsFiltres.length}</strong> projet{projetsFiltres.length > 1 ? 's' : ''}
              {activeFilters > 0 && <span style={{ color: P.teal }}> (filtrés sur {projetsGlobalFiltres.length})</span>}
            </span>

            {/* Boutons de page */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Première page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    border: `1px solid ${P.linen}`, borderRadius: 6,
                    background: currentPage === 1 ? '#f1f5f9' : P.white,
                    color: currentPage === 1 ? '#cbd5e1' : P.charcoal,
                    padding: '4px 8px', fontSize: 12, fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >«</button>

                {/* Précédent */}
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    border: `1px solid ${P.linen}`, borderRadius: 6,
                    background: currentPage === 1 ? '#f1f5f9' : P.white,
                    color: currentPage === 1 ? '#cbd5e1' : P.charcoal,
                    padding: '4px 10px', fontSize: 12, fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >‹</button>

                {/* Pages numérotées */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(pg => pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1)
                  .reduce<(number | 'ellipsis')[]>((acc, pg, idx, arr) => {
                    if (idx > 0 && pg - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                    acc.push(pg);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ell-${idx}`} style={{ fontSize: 12, color: P.dim, padding: '0 4px' }}>…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item as number)}
                        style={{
                          border: `1px solid ${currentPage === item ? P.teal : P.linen}`,
                          borderRadius: 6, minWidth: 30,
                          background: currentPage === item ? P.teal : P.white,
                          color: currentPage === item ? '#fff' : P.charcoal,
                          padding: '4px 8px', fontSize: 12, fontWeight: currentPage === item ? 800 : 500,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >{item}</button>
                    )
                  )
                }

                {/* Suivant */}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    border: `1px solid ${P.linen}`, borderRadius: 6,
                    background: currentPage === totalPages ? '#f1f5f9' : P.white,
                    color: currentPage === totalPages ? '#cbd5e1' : P.charcoal,
                    padding: '4px 10px', fontSize: 12, fontWeight: 600,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >›</button>

                {/* Dernière page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    border: `1px solid ${P.linen}`, borderRadius: 6,
                    background: currentPage === totalPages ? '#f1f5f9' : P.white,
                    color: currentPage === totalPages ? '#cbd5e1' : P.charcoal,
                    padding: '4px 8px', fontSize: 12, fontWeight: 600,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >»</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardProjet;