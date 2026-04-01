/**
 * ComparaisonOpportuniteProjet.tsx
 *
 * ══════════════════════════════════════════════════════════
 *  LES 4 NIVEAUX JH — SÉPARATION CLAIRE
 *
 *  Niveau 1 — volumeOffreCommerciale (= jhOffreVendu prorata)
 *    Source : lead_tech_fin_details.jh_vendu distribué au prorata par profil
 *    → "Offre technique vendue" — ce que le commercial a vendu globalement
 *    → Utilisé dans l'onglet "Marge Commerciale" (OngletMargeCommerciale)
 *
 *  Niveau 2 — volumeLead (= jhBacklogLead)
 *    Source : Σ backlog_line_profil.volume du backlog LEAD
 *    → "Backlog offre" — proposition équipe technique
 *    → Référence contractuelle technique, base facturation CA
 *
 *  Niveau 3 — volumeBacklogProjet (= jhBacklogProjet)
 *    Source : Σ backlog_line_profil.volume du backlog PROJET
 *    → "Backlog projet" — ce qui est planifié en cours d'exécution
 *
 *  Niveau 4 — volumeProjet (= jhRealise / time_spent)
 *    Source : Σ backlog_line_profil.time_spent
 *    → "Réalisé" — consommation réelle, indicatif uniquement
 *
 *  CET ONGLET (Comparaison) compare : Backlog offre ↔ Backlog projet ↔ Réalisé
 *  L'ONGLET "Marge Commerciale" compare : Offre technique vendue ↔ Backlog offre
 * ══════════════════════════════════════════════════════════
 */

import React, { useMemo, useState } from "react";
import {
  FaCalendarAlt, FaCalendarCheck, FaChartBar, FaChartLine,
  FaCheckCircle, FaExclamationTriangle, FaArrowRight,
  FaClock, FaLayerGroup, FaColumns, FaFileInvoiceDollar,
  FaUsers, FaCoins, FaTrophy, FaAngleRight, FaInfoCircle, FaTimes,
  FaBalanceScale, FaMoneyBillWave, FaPercentage,
} from "react-icons/fa";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhasePlan {
  id: number;
  name: string;
  order: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  heures?: number | null;
}

export interface LotPlan {
  id: number;
  name: string;
  order: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  phases: PhasePlan[];
}

export interface ProfilBudget {
  id: number;
  name: string;
  tjm: number;
  tjmProjet?: number;
  volumeOffreCommerciale?: number;
  volumeLead: number;
  volumeBacklogProjet: number;
  volumeProjet: number;
  budgetBacklogLead?: number;
}

export interface CalendrierItem {
  id: number;
  libelle: string;
  montantAPayer: number;
  statut: "EN_ATTENTE" | "PAYE" | "PARTIELLEMENT_PAYE" | "ANNULE";
  datePaiement?: string | null;
  typeReference: "LOT" | "PHASE" | "SPRINT" | "LIVRABLE";
}

export interface ComparaisonProps {
  leadLots: LotPlan[];
  leadDateDebut?: string | null;
  leadDateFin?: string | null;
  projetLots: LotPlan[];
  projetDateDebut?: string | null;
  projetDateFin?: string | null;
  profils: ProfilBudget[];
  chargesAnnexes?: number;
  budgetOffreCommerciale?: number;
  jhOffreCommerciale?: number;
  montantOffreLead?: number;
  deviseAbr?: string;
  calendrier: CalendrierItem[];
  caEncaisse?: number;
  detailProfils?: Array<{
    backlogProfilId: number; profilName: string; tjm: number;
    jhOffreVendu: number; jhBacklogLead: number; jhBacklogProjet: number; jhRealise: number;
    margeCommercialeJH: number; margePlanningJH: number; ecartRealiseJH: number;
    budgetBacklogLead: number; budgetPlanifie: number;
  }>;
  montantBacklogLead?: number;
  montantBacklogProjet?: number;
  margeCommercialeMontant?: number;
  onMargeNette?: (margeNette: number, deviseAbr: string) => void;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  charcoal: "#223A46", tomato: "#C93C29", tuscan: "#EABF5B",
  dim: "#5F6F6E", linen: "#E8E5D7", bg: "#fafaf9", white: "#ffffff",
  success: "#2d8f47",
  lot:   "#5c6ac4",
  phase: "#00848e",
  offre: "#7c3aed",
  charges: "#d97706",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function joursOuvresEntre(a: Date, b: Date): number {
  if (a >= b) return 0;
  let n = 0; const d = new Date(a);
  while (d < b) { if (d.getDay() !== 0 && d.getDay() !== 6) n++; d.setDate(d.getDate() + 1); }
  return n;
}
function fmt(n: number | null | undefined, dec = 0): string {
  const safe = n == null || isNaN(n as number) ? 0 : (n as number);
  return safe.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtDate(s?: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function pct(val: number, base: number) { return base === 0 ? 0 : (val / base) * 100; }

// ─── Composants réutilisables ─────────────────────────────────────────────────

const Pill: React.FC<{ color: string; bg: string; children: React.ReactNode }> = ({ color, bg, children }) => (
  <span style={{ background: bg, color, border: `1px solid ${color}33`, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>{children}</span>
);

const Bar: React.FC<{ value: number; max: number; color: string; height?: number }> = ({ value, max, color, height = 8 }) => (
  <div style={{ background: P.linen, borderRadius: 999, height, overflow: "hidden" }}>
    <div style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.5s" }} />
  </div>
);

/**
 * Delta — règle de couleur unifiée, sans invert :
 *   valeur > 0  → VERT  (marge positive, bonne situation)
 *   valeur < 0  → ROUGE (dépassement, mauvaise situation)
 *   valeur = 0  → VERT  (conforme)
 * Pour le planning : deltaJH = gauche − droite  (ex: offre − projet)
 *   +2 JH → offre > projet → marge → VERT
 *   −2 JH → offre < projet → dépassement → ROUGE
 */
const Delta: React.FC<{ value: number; unit: string; zeroLabel?: string; size?: "sm" | "md" }> = ({ value, unit, zeroLabel = "✓", size = "md" }) => {
  const z = Math.abs(value) < 0.01;
  const c  = z ? P.success : value > 0 ? P.success : P.tomato;
  const bg = z ? "#d1fae5" : value > 0 ? "#d1fae5" : "#fee2e2";
  return (
    <span style={{ background: bg, color: c, borderRadius: 99, padding: size === "sm" ? "2px 8px" : "3px 12px", fontSize: size === "sm" ? 11 : 13, fontWeight: 700, whiteSpace: "nowrap" }}>
      {z ? zeroLabel : `${value > 0 ? "+" : ""}${fmt(value, Math.abs(value) < 10 && value % 1 !== 0 ? 1 : 0)} ${unit}`}
    </span>
  );
};

const KpiCard: React.FC<{ title: string; icon: React.ReactNode; leadLabel: string; leadValue: React.ReactNode; projetLabel: string; projetValue: React.ReactNode; footer?: React.ReactNode }> = ({ title, icon, leadLabel, leadValue, projetLabel, projetValue, footer }) => (
  <div style={{ background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(34,58,70,.07)" }}>
    <div style={{ background: P.charcoal, color: P.white, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ opacity: 0.8 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>{title}</span>
    </div>
    <div style={{ padding: "14px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: footer ? 12 : 0 }}>
        <div><div style={{ fontSize: 9, color: P.phase, fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{leadLabel}</div><div style={{ fontSize: 18, fontWeight: 800, color: P.charcoal }}>{leadValue}</div></div>
        <div><div style={{ fontSize: 9, color: P.lot, fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{projetLabel}</div><div style={{ fontSize: 18, fontWeight: 800, color: P.charcoal }}>{projetValue}</div></div>
      </div>
      {footer && <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 10 }}>{footer}</div>}
    </div>
  </div>
);

const LegendeGantt: React.FC = () => (
  <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Légende du Gantt</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
      {[
        { color: P.phase, label: "Backlog offre (référence tech)", dashed: false, opacity: 0.85 },
        { color: P.lot,   label: "Backlog projet (planifié)",      dashed: false, opacity: 0.85 },
        { color: P.phase, label: "Référence croisée",              dashed: true,  opacity: 0.25 },
      ].map(({ color, label, dashed, opacity }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 22, height: 7, background: color, borderRadius: 2, opacity, border: dashed ? `1px dashed ${color}` : "none", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: P.dim }}>{label}</span>
        </div>
      ))}
    </div>
  </div>
);

const GanttRiche: React.FC<{ globalStart: Date; globalEnd: Date; lots: LotPlan[]; compareLots?: LotPlan[]; barColor: string; compareColor?: string; label: string; labelColor: string }> = ({ globalStart, globalEnd, lots, compareLots, barColor, compareColor, label, labelColor }) => {
  const totalMs = globalEnd.getTime() - globalStart.getTime();
  if (totalMs <= 0) return <div style={{ color: P.dim, fontSize: 12, fontStyle: "italic" }}>Pas de données.</div>;
  const calcBar = (start?: string | null, end?: string | null) => {
    const s = parseDate(start)?.getTime() ?? globalStart.getTime();
    const e = parseDate(end)?.getTime() ?? globalEnd.getTime();
    return { offset: Math.max(0, ((s - globalStart.getTime()) / totalMs) * 100), width: Math.max(1, ((Math.min(e, globalEnd.getTime()) - Math.max(s, globalStart.getTime())) / totalMs) * 100), oob: e > globalEnd.getTime() };
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: barColor, flexShrink: 0 }} />
        <div style={{ fontSize: 10, color: labelColor, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>{label}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[...lots].sort((a, b) => a.order - b.order).map((lot) => {
          const lb = calcBar(lot.dateDebut, lot.dateFin);
          const cLot = compareLots?.find(l => l.order === lot.order);
          let dj: number | null = null;
          if (lot.dateFin && cLot?.dateFin) {
            const pf = parseDate(lot.dateFin)!; const lf = parseDate(cLot.dateFin)!;
            const sign = pf <= lf ? 1 : -1; const [a, b] = pf <= lf ? [pf, lf] : [lf, pf];
            dj = sign * joursOuvresEntre(a, b);
          }
          return (
            <React.Fragment key={lot.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 120, fontSize: 11, color: P.charcoal, fontWeight: 700, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <FaLayerGroup size={9} color={barColor} style={{ marginRight: 5 }} />{lot.name}
                </div>
                <div style={{ flex: 1, height: 16, background: P.linen, borderRadius: 4, position: "relative", overflow: "visible", minWidth: 80 }}>
                  <div style={{ position: "absolute", left: `${lb.offset}%`, width: `${lb.width}%`, height: "100%", background: barColor, opacity: 0.85, borderRadius: 4, outline: lb.oob ? `2px solid ${P.tomato}` : "none" }} />
                  {cLot && (() => { const cb = calcBar(cLot.dateDebut, cLot.dateFin); return <div title="Référence croisée" style={{ position: "absolute", left: `${cb.offset}%`, width: `${cb.width}%`, height: "100%", background: compareColor ?? P.phase, opacity: 0.25, borderRadius: 4, border: `1px dashed ${compareColor ?? P.phase}`, cursor: "help" }} />; })()}
                </div>
                <div style={{ width: 180, flexShrink: 0 }}><span style={{ fontSize: 9, color: P.dim, whiteSpace: "nowrap" }}>{fmtDate(lot.dateDebut)} → {fmtDate(lot.dateFin)}</span></div>
                <div style={{ width: 80, flexShrink: 0, textAlign: "right" }}>
                  {dj !== null ? <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 7px", background: dj > 0 ? "#d1fae5" : dj < 0 ? "#fee2e2" : "#f0fdf4", color: dj > 0 ? P.success : dj < 0 ? P.tomato : P.success }}>{dj > 0 ? "+" : ""}{fmt(dj, 0)} j</span> : <span style={{ fontSize: 10, color: P.dim }}>—</span>}
                </div>
              </div>
              {lot.phases.map(ph => {
                const pb = calcBar(ph.dateDebut, ph.dateFin);
                const cPh = cLot?.phases.find(p => p.order === ph.order);
                let dp: number | null = null;
                if (ph.dateFin && cPh?.dateFin) {
                  const pf2 = parseDate(ph.dateFin)!; const lf2 = parseDate(cPh.dateFin)!;
                  const sign = pf2 <= lf2 ? 1 : -1; const [a, b] = pf2 <= lf2 ? [pf2, lf2] : [lf2, pf2];
                  dp = sign * joursOuvresEntre(a, b);
                }
                return (
                  <div key={ph.id} style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 14 }}>
                    <div style={{ width: 106, fontSize: 10, color: P.dim, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <FaColumns size={8} style={{ marginRight: 4, opacity: 0.5 }} />{ph.name}
                    </div>
                    <div style={{ flex: 1, height: 8, background: P.linen, borderRadius: 4, position: "relative", overflow: "visible", minWidth: 80 }}>
                      <div style={{ position: "absolute", left: `${pb.offset}%`, width: `${pb.width}%`, height: "100%", background: barColor, opacity: 0.5, borderRadius: 4 }} />
                      {cPh && (() => { const cpb = calcBar(cPh.dateDebut, cPh.dateFin); return <div title="Référence croisée" style={{ position: "absolute", left: `${cpb.offset}%`, width: `${cpb.width}%`, height: "100%", background: compareColor ?? P.phase, opacity: 0.2, borderRadius: 4, border: `1px dashed ${compareColor ?? P.phase}`, cursor: "help" }} />; })()}
                    </div>
                    <div style={{ width: 180, flexShrink: 0 }}><span style={{ fontSize: 9, color: P.dim, whiteSpace: "nowrap" }}>{fmtDate(ph.dateDebut)} → {fmtDate(ph.dateFin)}</span></div>
                    <div style={{ width: 80, flexShrink: 0, textAlign: "right" }}>
                      {dp !== null ? <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 7px", background: dp > 0 ? "#d1fae5" : dp < 0 ? "#fee2e2" : "#f0fdf4", color: dp > 0 ? P.success : dp < 0 ? P.tomato : P.success }}>{dp > 0 ? "+" : ""}{fmt(dp, 0)} j</span> : <span style={{ fontSize: 10, color: P.dim }}>—</span>}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingLeft: 128, paddingRight: 268 }}>
        <span style={{ fontSize: 9, color: P.dim }}>{fmtDate(globalStart.toISOString())}</span>
        <span style={{ fontSize: 9, color: P.dim }}>{fmtDate(globalEnd.toISOString())}</span>
      </div>
    </div>
  );
};

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

const ComparaisonOpportuniteProjet: React.FC<ComparaisonProps> = ({
  leadLots, leadDateDebut, leadDateFin,
  projetLots, projetDateDebut, projetDateFin,
  profils, chargesAnnexes = 0,
  budgetOffreCommerciale = 0, jhOffreCommerciale = 0,
  montantOffreLead = 0, deviseAbr = "€", calendrier, caEncaisse = 0,
  onMargeNette,
}) => {
  const [activeTab, setActiveTab] = useState<"planning" | "marge_planning" | "budget" | "ca">("planning");

  // ── JH ────────────────────────────────────────────────────────────────────
  const jhOffreTechFin = useMemo(() => profils.reduce((s, p) => s + (p.volumeOffreCommerciale ?? 0), 0), [profils]);
  const jhOffreComm = jhOffreCommerciale > 0 ? jhOffreCommerciale : jhOffreTechFin;
  const jhLeadBacklog = useMemo(() => profils.reduce((s, p) => s + (p.volumeLead ?? 0), 0), [profils]);
  const jhPlanifie = useMemo(() => profils.reduce((s, p) => s + (p.volumeBacklogProjet ?? 0), 0), [profils]);
  const jhRealise = useMemo(() => profils.reduce((s, p) => s + (p.volumeProjet ?? 0), 0), [profils]);

  const margeCommerciale = jhOffreComm - jhLeadBacklog;
  const margeOffre       = jhLeadBacklog - jhPlanifie;
  const ecartRealise     = jhRealise - jhPlanifie;

  // ── Dates ─────────────────────────────────────────────────────────────────
  const leadEndDate   = parseDate(leadDateFin);
  const projetEndDate = parseDate(projetDateFin);
  const decalageJours = useMemo<number | null>(() => {
    if (!leadEndDate || !projetEndDate) return null;
    const sign = projetEndDate <= leadEndDate ? 1 : -1;
    const [a, b] = projetEndDate <= leadEndDate ? [projetEndDate, leadEndDate] : [leadEndDate, projetEndDate];
    return sign * joursOuvresEntre(a, b);
  }, [leadEndDate, projetEndDate]);

  const allDates = [leadDateDebut, leadDateFin, projetDateDebut, projetDateFin,
    ...leadLots.flatMap(l => [l.dateDebut, l.dateFin, ...l.phases.flatMap(p => [p.dateDebut, p.dateFin])]),
    ...projetLots.flatMap(l => [l.dateDebut, l.dateFin, ...l.phases.flatMap(p => [p.dateDebut, p.dateFin])]),
  ].map(parseDate).filter(Boolean) as Date[];
  const ganttStart = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const ganttEnd   = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();

  // ── Budgets ───────────────────────────────────────────────────────────────
  const budgetOffComm = montantOffreLead > 0 ? montantOffreLead
    : budgetOffreCommerciale > 0 ? budgetOffreCommerciale
    : profils.reduce((s, p) => s + (p.volumeOffreCommerciale ?? p.volumeLead ?? 0) * (p.tjm ?? 0), 0);

  const budgetLeadCalc = useMemo(
    () => profils.reduce((s, p) => s + (p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0)), 0),
    [profils]
  );
  const budgetLeadTotal = budgetLeadCalc + chargesAnnexes;

  const factProjet = useMemo(
    () => profils.reduce((s, p) => s + (p.volumeBacklogProjet ?? 0) * (p.tjmProjet ?? p.tjm ?? 0), 0),
    [profils]
  );

  const coutTotalProjet = factProjet + chargesAnnexes;
  const margeBudget     = budgetOffComm - coutTotalProjet;

  // Marge nette offre ↔ projet (avec charges)
  const margeNetteSvsP = budgetOffComm - factProjet - chargesAnnexes;
  const tauxMargeNetteSvsP = budgetOffComm > 0 ? (margeNetteSvsP / budgetOffComm) * 100 : 0;

  // Marge offre vs (projet + charges) — pour KPI planning
  const margeOffreBudgetAvecCharges = budgetOffComm - coutTotalProjet;

  // Charges par profil (prorata JH backlog offre)
  const chargesParProfil = useMemo(() => {
    const totalJH = profils.reduce((s, p) => s + (p.volumeLead ?? 0), 0);
    return profils.map(p => totalJH > 0 ? ((p.volumeLead ?? 0) / totalJH) * chargesAnnexes : 0);
  }, [profils, chargesAnnexes]);

  // ── CA ────────────────────────────────────────────────────────────────────
  const factLeadTotal = budgetLeadCalc;
  const caPlanifie = useMemo(
    () => calendrier.filter(c => c.statut === "EN_ATTENTE" || c.statut === "PARTIELLEMENT_PAYE").reduce((s, c) => s + c.montantAPayer, 0),
    [calendrier]
  );
  const caPotentiel = caEncaisse + caPlanifie;
  const tauxEnc = pct(caEncaisse, montantOffreLead);
  const tauxCouv = pct(caPotentiel, montantOffreLead);
  const resteAEnc = Math.max(0, montantOffreLead - caEncaisse);
  const marge = caEncaisse - factLeadTotal - chargesAnnexes;
  const tauxMarge = pct(marge, caEncaisse);

  React.useEffect(() => {
    if (onMargeNette && budgetOffComm > 0) onMargeNette(margeNetteSvsP, deviseAbr);
  }, [margeNetteSvsP, deviseAbr, onMargeNette, budgetOffComm]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(34,58,70,.07)" };
  const sh: React.CSSProperties = { background: P.charcoal, color: P.white, padding: "10px 16px", fontSize: 12, fontWeight: 700, borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", gap: 8 };
  const th: React.CSSProperties = { padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: P.dim, textAlign: "left", borderBottom: `1px solid ${P.linen}` };
  const td = (i: number): React.CSSProperties => ({ padding: "9px 12px", fontSize: 12, background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}`, verticalAlign: "middle" });

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTIONS MARGES — partagées par Planning et Marge_Planning
  //  (JH pour planning · JH+budget pour marge_planning)
  // ══════════════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────────────────
  //  PLANNING COMPARISONS — règle unique : deltaJH = gauche − droite
  //    + = gauche > droite = marge = VERT
  //    − = gauche < droite = dépassement = ROUGE
  //  Pas d'invert, pas de signe négatif artificiel.
  // ──────────────────────────────────────────────────────────────────────────
  const planningComparisons = useMemo(() => [
    {
      key: "vendu_vs_offre",
      title: "JH vendu ↔ Backlog offre",
      desc: "JH de l'offre commerciale vendue vs JH proposés par l'équipe technique dans le backlog offre.",
      color: P.offre,
      bg: "#ede9fe",
      border: "#7c3aed44",
      gauche: { label: "JH vendu (offre tech.)", jh: jhOffreComm,    color: P.offre },
      droite: { label: "Backlog offre",           jh: jhLeadBacklog,  color: P.phase },
      // + = vendu > backlog offre → marge commerciale → VERT
      // − = backlog offre > vendu → dépassement commercial → ROUGE
      deltaJH: jhOffreComm - jhLeadBacklog,
      hint: "+ = marge commerciale (vendu > backlog) · − = backlog dépasse le vendu",
      profils: profils.map((p, i) => ({
        name: p.name, tjm: p.tjm,
        jhG: p.volumeOffreCommerciale ?? 0,
        jhD: p.volumeLead ?? 0,
        deltaJH: (p.volumeOffreCommerciale ?? 0) - (p.volumeLead ?? 0),
        charges: chargesParProfil[i],
      })),
    },
    {
      key: "offre_vs_projet",
      title: "Backlog offre ↔ Backlog projet",
      desc: "JH proposés dans l'offre technique vs JH planifiés en exécution.",
      color: P.phase,
      bg: "#e0f5f7",
      border: "#00848e44",
      gauche: { label: "Backlog offre",  jh: jhLeadBacklog, color: P.phase },
      droite: { label: "Backlog projet", jh: jhPlanifie,    color: P.lot },
      // + = offre > projet → planifié dans l'enveloppe → VERT
      // − = projet > offre → dépassement du backlog offre → ROUGE
      deltaJH: jhLeadBacklog - jhPlanifie,
      hint: "+ = planifié dans l'enveloppe (offre > projet) · − = dépassement backlog offre",
      profils: profils.map((p, i) => ({
        name: p.name, tjm: p.tjm,
        jhG: p.volumeLead ?? 0,
        jhD: p.volumeBacklogProjet ?? 0,
        deltaJH: (p.volumeLead ?? 0) - (p.volumeBacklogProjet ?? 0),
        charges: chargesParProfil[i],
      })),
    },
    {
      key: "projet_vs_realise",
      title: "Backlog projet ↔ Réalisé",
      desc: "JH planifiés en exécution vs JH réellement consommés (time_spent). Indicatif.",
      color: P.lot,
      bg: "#eef0fc",
      border: "#5c6ac444",
      gauche: { label: "Backlog projet", jh: jhPlanifie, color: P.lot },
      droite: { label: "Réalisé",        jh: jhRealise,  color: P.dim },
      // + = projet > réalisé → en avance, reste de la marge → VERT
      // − = réalisé > projet → retard, dépassement → ROUGE
      deltaJH: jhPlanifie - jhRealise,
      hint: "+ = en avance (réalisé < planifié) · − = retard (réalisé > planifié)",
      profils: profils.map((p, i) => ({
        name: p.name, tjm: p.tjm,
        jhG: p.volumeBacklogProjet ?? 0,
        jhD: p.volumeProjet ?? 0,
        deltaJH: (p.volumeBacklogProjet ?? 0) - (p.volumeProjet ?? 0),
        charges: chargesParProfil[i],
      })),
    },
    {
      key: "offre_vs_realise",
      title: "Backlog offre ↔ Réalisé",
      desc: "Vision globale : JH du backlog offre vs consommation réelle à date. Indicatif.",
      color: "#5c6ac4",
      bg: "#eef0fc",
      border: "#5c6ac444",
      gauche: { label: "Backlog offre", jh: jhLeadBacklog, color: P.phase },
      droite: { label: "Réalisé",       jh: jhRealise,     color: P.dim },
      // + = offre > réalisé → reste de la marge → VERT
      // − = réalisé > offre → consommation dépasse le backlog → ROUGE
      deltaJH: jhLeadBacklog - jhRealise,
      hint: "+ = marge restante (réalisé < offre) · − = consommation dépasse le backlog offre",
      profils: profils.map((p, i) => ({
        name: p.name, tjm: p.tjm,
        jhG: p.volumeLead ?? 0,
        jhD: p.volumeProjet ?? 0,
        deltaJH: (p.volumeLead ?? 0) - (p.volumeProjet ?? 0),
        charges: chargesParProfil[i],
      })),
    },
  ], [profils, jhOffreComm, jhLeadBacklog, jhPlanifie, jhRealise, margeCommerciale, margeOffre, ecartRealise, chargesParProfil]);

  return (
    <div style={{ fontFamily: "inherit", background: P.bg, padding: "4px 0" }}>

      {/* ── En-tête ── */}
      <div style={{ background: P.charcoal, borderRadius: 10, padding: "18px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, boxShadow: "0 2px 8px rgba(34,58,70,.15)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.white }}>Comparaison : Offre financière vendue  ↔ Backlog offre ↔ Backlog projet ↔ Réalisation</h2>
          <p style={{ margin: "5px 0 0", fontSize: 12, color: "rgba(232,229,215,.7)" }}>JH - Budget - CA & Marge</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill color={P.offre} bg="#ede9fe">Offre fin.</Pill>
          <FaAngleRight size={12} color="rgba(232,229,215,.5)" />
          <Pill color={P.phase} bg="#e0f5f7">Backlog offre</Pill>
          <FaAngleRight size={12} color="rgba(232,229,215,.5)" />
          <Pill color="#5c6ac4" bg="#eef0fc">Backlog projet</Pill>
          <FaAngleRight size={12} color="rgba(232,229,215,.5)" />
          <Pill color={P.dim} bg={P.linen}>Réalisé</Pill>
        </div>
      </div>
      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "JH VENDU vs JH BACKLOG OFFRE", sub: `Offre tech. (${fmt(jhOffreComm,1)}) − Backlog offre (${fmt(jhLeadBacklog,1)})`, hint: "+ = favorable · voir onglet Marge Comm.", accentColor: margeCommerciale >= 0 ? P.offre : P.tomato, content: <Delta value={margeCommerciale} unit="JH" zeroLabel="✓ Exact" />, icon: <FaUsers size={11} /> },
          { label: "JH BACKLOG OFFRE vs JH BACKLOG PROJET", sub: `JH OFFRE (${fmt(jhLeadBacklog,1)}) − JH PROJET (${fmt(jhPlanifie,1)})`, hint: "+ = planifié dans l'enveloppe · − = dépassement", accentColor: margeOffre >= 0 ? P.success : P.tomato, content: <Delta value={margeOffre} unit="JH" zeroLabel="✓ Conforme" />, icon: <FaClock size={11} /> },
          { label: "ÉCART PLANNING RÉALISÉ", sub: `JH PLANIFIE (${fmt(jhPlanifie,1)}) − JH PASSE (${fmt(jhRealise,1)})`, hint: "+ = en avance · − = retard (réalisé dépasse planifié)", accentColor: (jhPlanifie - jhRealise) < 0 ? P.tomato : P.success, content: <Delta value={jhPlanifie - jhRealise} unit="JH" zeroLabel="✓ Dans le planifié" />, icon: <FaCalendarCheck size={11} /> },
          { label: "BÉNÉFICE COMMERCIAL PRÉVISIONNEL", sub: "Offre fin. vendue − (Budget backlog offre + Charges)", hint: "+ = projet rentable · − = déficitaire", accentColor: marge >= 0 ? P.success : P.tomato, content: <span style={{ fontSize: 20, fontWeight: 800, color: marge >= 0 ? P.success : P.tomato }}>{marge >= 0 ? "+" : ""}{fmt(marge, 0)} {deviseAbr}</span>, icon: <FaTrophy size={11} /> },
          { label: "BÉNÉFICE COMMERCIAL RÉEL", sub: `Offre fin. vendue (${fmt(budgetOffComm,0)}) − (Budget projet + Charges)`, hint: "+ = rentable · − = déficitaire", accentColor: margeOffreBudgetAvecCharges >= 0 ? P.success : P.tomato, content: <Delta value={margeOffreBudgetAvecCharges} unit={deviseAbr} zeroLabel="✓ Équilibré" />, icon: <FaMoneyBillWave size={11} /> },
        ].map((k, i) => (
          <div key={i} style={{ ...card, padding: "14px 16px", borderLeft: `4px solid ${k.accentColor}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><span style={{ color: P.dim }}>{k.icon}</span><span style={{ fontSize: 10, fontWeight: 700, color: P.dim, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>{k.label}</span></div>
            <div style={{ fontSize: 10, color: P.dim, marginBottom: 6 }}>{k.sub}</div>
            {k.content}
            <div style={{ marginTop: 6, fontSize: 9, color: P.dim, fontStyle: "italic", opacity: 0.8 }}>{k.hint}</div>
          </div>
        ))}
      </div>

      {/* ── Onglets ── */}
      <div style={{ background: P.white, padding: "10px 12px", borderRadius: 8, border: `1px solid ${P.linen}`, marginBottom: 16, display: "flex", gap: 4, flexWrap: "wrap" }}>
        {([
          ["marge_planning","Comparaison générale",     <FaBalanceScale size={12} />],
          ["planning",      "Comparaison planning",   <FaCalendarAlt size={12} />],
          ["budget",        "Comparaison budgetaire",     <FaChartBar size={12} />],
          ["ca",            "CA & Marge", <FaChartLine size={12} />],
        ] as const).map(([key, label, icon]) => (
          <button key={key} onClick={() => setActiveTab(key as any)} style={{ background: activeTab === key ? P.charcoal : "transparent", color: activeTab === key ? P.white : P.dim, border: "none", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
           PLANNING — comparaisons JH style Marges (sans budgets) + Gantt
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "planning" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Bandeau statut global
          {(() => {
            const bad = margeOffre < 0 || (jhPlanifie - jhRealise) < 0 || margeOffreBudgetAvecCharges < 0;
            const color = bad ? P.tomato : P.success;
            const Icon = bad ? FaExclamationTriangle : FaCheckCircle;
            return (
              <div style={{ background: bad ? "#fef2f2" : "#f0fdf4", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <Icon size={18} color={color} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.charcoal, marginBottom: 4 }}>
                    {bad ? "Dépassement planning détecté" : "Planning optimal"}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Backlog offre↔projet : <Delta value={margeOffre} unit="JH" zeroLabel="✓" size="sm" /></span>
                    <span style={{ fontSize: 12, color: P.dim }}>Projet↔Réalisé : <Delta value={jhPlanifie - jhRealise} unit="JH" zeroLabel="✓" size="sm" /></span>
                    <span style={{ fontSize: 12, color: P.dim }}>Marge nette avec charges : <Delta value={margeOffreBudgetAvecCharges} unit={deviseAbr} zeroLabel="✓" size="sm" /></span>
                    {decalageJours !== null && <span style={{ fontSize: 12, color: P.dim }}>Décalage dates : <Delta value={decalageJours} unit="j.ouv." zeroLabel="✓" size="sm" /></span>}
                  </div>
                </div>
              </div>
            );
          })()} */}

          {/* KPIs dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <KpiCard title="Volume JH" icon={<FaUsers size={12} />}
              leadLabel={`Backlog offre (${fmt(jhLeadBacklog,1)} JH)`}
              projetLabel={`Backlog projet (${fmt(jhPlanifie,1)} JH)`}
              leadValue={<>{fmt(jhLeadBacklog,1)} <span style={{ fontSize: 11, color: P.dim }}>JH</span></>}
              projetValue={<>{fmt(jhPlanifie,1)} <span style={{ fontSize: 11, color: P.dim }}>JH</span></>}
              footer={
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: P.dim, minWidth: 140 }}>Offre tech. vendue :</span><span style={{ fontSize: 13, fontWeight: 800, color: P.offre }}>{fmt(jhOffreComm,1)} JH</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: P.dim, minWidth: 140 }}>Réalisé (indicatif) :</span><span style={{ fontSize: 13, fontWeight: 800, color: P.dim }}>{fmt(jhRealise,1)} JH</span></div>
                  <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span style={{ fontSize: 11, color: P.dim, minWidth: 140 }}>Marge offre↔projet (+=bien) :</span><Delta value={margeOffre} unit="JH" zeroLabel="✓" size="sm" /></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: P.dim, minWidth: 140 }}>Projet↔Réalisé (+=bien) :</span><Delta value={jhPlanifie - jhRealise} unit="JH" zeroLabel="✓" size="sm" /></div>
                  </div>
                </div>
              }
            />
            <KpiCard title="Date de début" icon={<FaCalendarAlt size={12} />}
              leadLabel="Backlog offre" projetLabel="Backlog projet"
              leadValue={<span style={{ fontSize: 13 }}>{fmtDate(leadDateDebut)}</span>}
              projetValue={<span style={{ fontSize: 13 }}>{fmtDate(projetDateDebut)}</span>}
            />
            <KpiCard title="Date de fin" icon={<FaCalendarCheck size={12} />}
              leadLabel="Backlog offre" projetLabel="Backlog projet"
              leadValue={<span style={{ fontSize: 13 }}>{fmtDate(leadDateFin)}</span>}
              projetValue={<span style={{ fontSize: 13 }}>{fmtDate(projetDateFin)}</span>}
              footer={<div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, color: P.dim }}>Décalage :</span>{decalageJours !== null ? <Delta value={decalageJours} unit="j.ouv." zeroLabel="✓" /> : <span style={{ color: P.dim }}>—</span>}</div>}
            />
          </div>

          {/* Charges annexes
          {chargesAnnexes > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d55", borderLeft: "4px solid #d97706", borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <FaMoneyBillWave size={13} color="#d97706" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>Impact des charges annexes sur le planning</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Charges annexes totales", value: chargesAnnexes, color: "#d97706", sub: "transport, hébergement, achats…" },
                  { label: "Budget backlog offre (hors charges)", value: budgetLeadCalc, color: P.phase, sub: `${fmt(jhLeadBacklog,1)} JH × TJM` },
                  { label: "Bénéfice réel (offre − projet − charges)", value: margeOffreBudgetAvecCharges, color: margeOffreBudgetAvecCharges >= 0 ? P.success : P.tomato, sub: "vision coût réel complet", signed: true },
                ].map((item: any) => (
                  <div key={item.label} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "10px 12px", border: "1px solid #fcd34d33" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: item.color, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>
                      {item.signed && item.value >= 0 ? "+" : ""}{fmt(item.value, 0)} {deviseAbr}
                    </div>
                    <div style={{ fontSize: 10, color: "#92400e", marginTop: 3 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          {/* ── 3 tableaux de comparaison JH par profil (style Marges, sans budgets) ── */}
          {planningComparisons.map(comp => (
            <div key={comp.key} style={{ background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(34,58,70,.07)", overflow: "hidden" }}>
              {/* En-tête section */}
              <div style={{ background: comp.color, color: P.white, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <FaUsers size={14} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{comp.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{comp.desc}</div>
                </div>
              </div>

              {/* Bandeau synthèse côte-à-côte */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", borderBottom: `1px solid ${P.linen}` }}>
                <div style={{ padding: "14px 20px", background: comp.bg }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: comp.color, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{comp.gauche.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: P.charcoal }}>{fmt(comp.gauche.jh, 1)} <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280" }}>JH</span></div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "14px 28px", borderLeft: `1px solid ${P.linen}`, borderRight: `1px solid ${P.linen}`, minWidth: 140, gap: 6 }}>
                  <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>Écart JH</div>
                  <Delta value={comp.deltaJH} unit="JH" />
                  <div style={{ fontSize: 9, color: "#6b7280", fontStyle: "italic", textAlign: "center" }}>{comp.hint.split("·")[0].trim()}</div>
                </div>
                <div style={{ padding: "14px 20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: comp.droite.color, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{comp.droite.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: P.charcoal }}>{fmt(comp.droite.jh, 1)} <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280" }}>JH</span></div>
                </div>
              </div>

              {/* Barre visuelle */}
              {/* <div style={{ padding: "10px 20px", borderBottom: `1px solid ${P.linen}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 4 }}>
                  <span style={{ color: comp.color, fontWeight: 600 }}>{comp.gauche.label} — {fmt(comp.gauche.jh,1)} JH</span>
                  <span style={{ color: comp.droite.color, fontWeight: 600 }}>{comp.droite.label} — {fmt(comp.droite.jh,1)} JH</span>
                </div>
                <div style={{ background: P.linen, borderRadius: 999, height: 10, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, comp.gauche.jh > 0 ? (comp.droite.jh / comp.gauche.jh) * 100 : 0)}%`, height: "100%", background: comp.deltaJH >= 0 ? comp.color : P.tomato, borderRadius: 999, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3, fontStyle: "italic" }}>{comp.hint}</div>
              </div> */}

              {/* Tableau par profil */}
              {comp.profils.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Profil</th>
                        <th style={{ ...th, textAlign: "right" }}>TJM</th>
                        <th style={{ ...th, textAlign: "right", color: comp.color }}>JH {comp.gauche.label}</th>
                        <th style={{ ...th, textAlign: "right", color: comp.droite.color }}>JH {comp.droite.label}</th>
                        <th style={{ ...th, textAlign: "center" }}>ΔJH<br /><span style={{ fontWeight: 400, fontSize: 9 }}>gauche − droite</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {comp.profils.map((p: any, i: number) => {
                        const pctUtil = p.jhG > 0 ? (p.jhD / p.jhG) * 100 : 0;
                        return (
                          <tr key={i}>
                            <td style={{ ...td(i), fontWeight: 700, color: P.charcoal }}>{p.name}</td>
                            <td style={{ ...td(i), textAlign: "right", color: P.dim }}>{fmt(p.tjm, 0)} {deviseAbr}</td>
                            <td style={{ ...td(i), textAlign: "right", color: comp.color, fontWeight: 600 }}>{fmt(p.jhG, 1)} JH</td>
                            <td style={{ ...td(i), textAlign: "right", color: comp.droite.color, fontWeight: 600 }}>{fmt(p.jhD, 1)} JH</td>
                            <td style={{ ...td(i), textAlign: "center" }}>
                              <Delta value={p.deltaJH} unit="JH" zeroLabel="✓" size="sm" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                        <td style={{ padding: "9px 12px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL</td>
                        <td />
                        <td style={{ padding: "9px 12px", textAlign: "right", color: comp.color, fontWeight: 700 }}>{fmt(comp.gauche.jh, 1)} JH</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", color: comp.droite.color, fontWeight: 700 }}>{fmt(comp.droite.jh, 1)} JH</td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          <Delta value={comp.deltaJH} unit="JH" zeroLabel="✓" size="sm" />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* Comparaison JH par lot/phase */}
          {(() => {
            // Fusionner les lots lead et projet par order pour comparer les JH
            const allLotOrders = Array.from(new Set([
              ...leadLots.map(l => l.order),
              ...projetLots.map(l => l.order),
            ])).sort((a, b) => a - b);

            if (allLotOrders.length === 0) return null;

            // Calculer le max JH global pour l'échelle des barres
            const allJH: number[] = [];
            allLotOrders.forEach(order => {
              const lLot = leadLots.find(l => l.order === order);
              const pLot = projetLots.find(l => l.order === order);
              const jhLead = lLot?.phases.reduce((s, ph) => s + (ph.heures ?? 0) / 8, 0) ?? 0;
              const jhProj = pLot?.phases.reduce((s, ph) => s + (ph.heures ?? 0) / 8, 0) ?? 0;
              if (jhLead > 0) allJH.push(jhLead);
              if (jhProj > 0) allJH.push(jhProj);
            });
            const maxJH = Math.max(...allJH, 1);
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           BUDGET — 3 comparaisons avec charges annexes explicites
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "budget" && (() => {
        // 1. Offre fin. vendue ↔ Backlog offre
        //    Marge commerciale = Offre − Backlog offre (hors charges)
        //    Marge commerciale nette = Offre − (Backlog offre + Charges)
        const mnt_1_ht  = budgetOffComm - budgetLeadCalc;
        const mnt_1_net = budgetOffComm - budgetLeadTotal;          // avec charges
        const taux_1    = budgetOffComm > 0 ? (mnt_1_net / budgetOffComm) * 100 : 0;

        // 2. Backlog offre ↔ Backlog projet
        //    Marge planification = Backlog offre − Backlog projet (hors charges)
        //    Marge planification nette = (Backlog offre − Charges) − Backlog projet
        //    → ou : Backlog offre − (Backlog projet + Charges)
        const mnt_2_ht  = budgetLeadCalc - factProjet;
        const mnt_2_net = budgetLeadCalc - (factProjet + chargesAnnexes);  // charges déduites côté projet
        const taux_2    = budgetLeadCalc > 0 ? (mnt_2_net / budgetLeadCalc) * 100 : 0;

        // 3. Offre fin. vendue ↔ Backlog projet
        //    Marge nette HT = Offre − Backlog projet
        //    Marge nette = Offre − (Backlog projet + Charges)
        const mnt_3_ht  = budgetOffComm - factProjet;
        const mnt_3_net = budgetOffComm - coutTotalProjet;          // inclut charges
        const taux_3    = budgetOffComm > 0 ? (mnt_3_net / budgetOffComm) * 100 : 0;

        const budgetSections = [
          {
            key: "s_vs_o_b",
            title: "Offre fin. vendue ↔ Backlog offre",
            subtitle: "Marge commerciale",
            desc: "Ce que le commercial a facturé vs le coût de la proposition technique. Charges déduites de l'offre.",
            color: P.offre, bg: "#ede9fe", border: "#7c3aed44",
            gauche:   { label: "Offre fin. vendue",   mnt: budgetOffComm,  jh: jhOffreComm,   src: "lead_tech_fin_details" },
            droite:   { label: "Budget backlog offre", mnt: budgetLeadCalc, jh: jhLeadBacklog, src: "Σ JH×TJM backlog offre" },
            deltaHT:  mnt_1_ht, deltaNet: mnt_1_net, charges: chargesAnnexes, tauxPct: taux_1,
            hint: "+ = marge commerciale · − = l'offre tech coûte plus que le contrat",
            // Marge nette = Offre − Backlog offre − Charges
            formulaNet: `Offre (${fmt(budgetOffComm,0)}) − Backlog offre (${fmt(budgetLeadCalc,0)}) − Charges (${fmt(chargesAnnexes,0)})`,
            profils: profils.map((p: any, i: number) => {
              const bLead  = p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0);
              const bOffre = (p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0);
              const ch     = chargesParProfil[i];
              return { name: p.name, tjm: p.tjm, mntG: bOffre, mntD: bLead, deltaHT: bOffre - bLead, deltaNet: bOffre - bLead - ch, charges: ch, taux: bOffre > 0 ? (bOffre - bLead - ch) / bOffre * 100 : 0 };
            }),
          },
          {
            key: "o_vs_p_b",
            title: "Backlog offre ↔ Backlog projet",
            subtitle: "Marge de planification",
            desc: "Budget prévu dans le backlog offre vs coût réellement planifié + charges annexes.",
            color: P.phase, bg: "#e0f5f7", border: "#00848e44",
            gauche:   { label: "Budget backlog offre",  mnt: budgetLeadCalc, jh: jhLeadBacklog, src: "Σ JH×TJM backlog offre" },
            droite:   { label: "Budget backlog projet", mnt: factProjet,     jh: jhPlanifie,    src: "Σ JH×TJM backlog projet" },
            deltaHT:  mnt_2_ht, deltaNet: mnt_2_net, charges: chargesAnnexes, tauxPct: taux_2,
            hint: "+ = projet moins coûteux que prévu · − = dépassement de budget planifié",
            formulaNet: `Backlog offre (${fmt(budgetLeadCalc,0)}) − Backlog projet (${fmt(factProjet,0)}) − Charges (${fmt(chargesAnnexes,0)})`,
            profils: profils.map((p: any, i: number) => {
              const bLead = p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0);
              const bProj = (p.volumeBacklogProjet ?? 0) * (p.tjmProjet ?? p.tjm ?? 0);
              const ch    = chargesParProfil[i];
              return { name: p.name, tjm: p.tjm, mntG: bLead, mntD: bProj, deltaHT: bLead - bProj, deltaNet: bLead - bProj - ch, charges: ch, taux: bLead > 0 ? (bLead - bProj - ch) / bLead * 100 : 0 };
            }),
          },
          {
            key: "s_vs_p_b",
            title: "Offre fin. vendue ↔ Backlog projet",
            subtitle: "Marge nette globale",
            desc: "Vision financière complète : ce que rapporte le contrat vs ce qu'il coûte (planifié + charges annexes).",
            color: "#5c6ac4", bg: "#eef0fc", border: "#5c6ac444",
            gauche:   { label: "Offre fin. vendue",  mnt: budgetOffComm,   jh: jhOffreComm, src: "lead_tech_fin_details" },
            droite:   { label: "Coût total projet",  mnt: coutTotalProjet, jh: jhPlanifie,  src: "Σ JH×TJM projet + charges annexes" },
            deltaHT:  mnt_3_ht, deltaNet: mnt_3_net, charges: chargesAnnexes, tauxPct: taux_3,
            hint: "+ = projet rentable · − = projet déficitaire",
            formulaNet: `Offre (${fmt(budgetOffComm,0)}) − Backlog projet (${fmt(factProjet,0)}) − Charges (${fmt(chargesAnnexes,0)})`,
            profils: profils.map((p: any, i: number) => {
              const bOffre = (p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0);
              const bProj  = (p.volumeBacklogProjet ?? 0) * (p.tjmProjet ?? p.tjm ?? 0);
              const ch     = chargesParProfil[i];
              return { name: p.name, tjm: p.tjm, mntG: bOffre, mntD: bProj, deltaHT: bOffre - bProj, deltaNet: bOffre - bProj - ch, charges: ch, taux: bOffre > 0 ? (bOffre - bProj - ch) / bOffre * 100 : 0 };
            }),
          },
        ];

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Bandeau info */}
            <div style={{ background: "#eff6ff", border: "1px solid #bee3f8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1e40af", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <FaFileInvoiceDollar size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong>3 comparaisons budgétaires avec charges annexes ({fmt(chargesAnnexes, 0)} {deviseAbr}) :</strong> Les charges sont déduites dans chaque marge nette. Δ HT = hors charges · Δ Net = après déduction des charges.
              </span>
            </div>

            {/* Récap 3 marges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {budgetSections.map(s => (
                <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 8, fontStyle: "italic" }}>{s.subtitle}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>hors charges annexes</div>
                      <Delta value={s.deltaHT} unit={deviseAbr} zeroLabel="✓" />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: P.charges, marginBottom: 2, fontWeight: 600 }}>avec charges annexes</div>
                      <Delta value={s.deltaNet} unit={deviseAbr} zeroLabel="✓" />
                    </div>
                  </div>
                  {/* <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.tauxPct >= 0 ? P.success : P.tomato }}>{s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %</span>
                    <span style={{ fontSize: 9, color: "#6b7280", fontStyle: "italic" }}>{s.hint.split("·")[0].trim()}</span>
                  </div> */}
                </div>
              ))}
            </div>

            {/* Cascade budgétaire */}
            <div style={card}>
              <div style={sh}><FaChartBar size={12} /> Comparaison budgétaire</div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* {[
                  { label: "Offre fin. vendue", value: budgetOffComm, color: P.offre, jh: jhOffreComm, badge: null },
                  { label: "Budget backlog offre", value: budgetLeadCalc, color: P.phase, jh: jhLeadBacklog,
                    badge: { val: mnt_1_ht, label: `marge comm. HT ${mnt_1_ht >= 0 ? "+" : ""}${fmt(mnt_1_ht, 0)} ${deviseAbr}`, ok: mnt_1_ht >= 0 } },
                  { label: "Budget backlog projet (planifié)", value: factProjet, color: P.lot, jh: jhPlanifie,
                    badge: { val: mnt_2_ht, label: `marge planif. HT ${mnt_2_ht >= 0 ? "+" : ""}${fmt(mnt_2_ht, 0)} ${deviseAbr}`, ok: mnt_2_ht >= 0 } },
                  { label: `Charges annexes`, value: chargesAnnexes, color: P.charges, jh: 0,
                    badge: { val: mnt_3_net, label: `marge nette ${mnt_3_net >= 0 ? "+" : ""}${fmt(mnt_3_net, 0)} ${deviseAbr}`, ok: mnt_3_net >= 0 } },
                ].map((row, idx) => (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                      <span style={{ color: row.color, fontWeight: 600 }}>{row.label}</span>
                      <span style={{ color: row.color, fontWeight: 700 }}>
                        {fmt(row.value, 0)} {deviseAbr}{row.jh > 0 ? ` — ${fmt(row.jh, 1)} JH` : ""}
                        {row.badge && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 7px", background: row.badge.ok ? "#d1fae5" : "#fee2e2", color: row.badge.ok ? P.success : P.tomato }}>{row.badge.label}</span>}
                      </span>
                    </div>
                    <div style={{ background: P.linen, borderRadius: 999, height: idx === 3 ? 8 : 12, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, budgetOffComm > 0 ? (row.value / budgetOffComm) * 100 : 0)}%`, height: "100%", background: row.color, opacity: idx === 3 ? 0.7 : 0.85, borderRadius: 999 }} />
                    </div>
                  </div>
                ))} */}
                {/* Récap des 3 marges */}
                <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Marge commerciale nette", sub: `Offre − Backlog offre − Charges`, ht: mnt_1_ht, net: mnt_1_net, bg: "#ede9fe", color: P.offre },
                    { label: "Marge de planification nette", sub: `Backlog offre − Backlog projet − Charges`, ht: mnt_2_ht, net: mnt_2_net, bg: mnt_2_net >= 0 ? "#f0fdf4" : "#fef2f2", color: mnt_2_net >= 0 ? P.success : P.tomato },
                    { label: "Marge nette globale", sub: `Offre − (Backlog projet + Charges)`, ht: mnt_3_ht, net: mnt_3_net, bg: mnt_3_net >= 0 ? "#f0fdf4" : "#fef2f2", color: mnt_3_net >= 0 ? P.success : P.tomato },
                  ].map((m, idx) => (
                    <div key={idx} style={{ background: m.bg, borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 9, color: m.color, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 3 }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: P.dim, marginBottom: 6 }}>{m.sub}</div>
                      <div style={{ fontSize: 10, color: P.dim, marginBottom: 2 }}>Hors charges : <strong style={{ color: m.ht >= 0 ? P.success : P.tomato }}>{m.ht >= 0 ? "+" : ""}{fmt(m.ht, 0)} {deviseAbr}</strong></div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: m.color, marginBottom: 2 }}>{m.net >= 0 ? "+" : ""}{fmt(m.net, 0)} <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7280" }}>{deviseAbr} net</span></div>
                      {/* <div style={{ fontSize: 10, color: m.color, fontWeight: 700 }}>
                        {budgetOffComm > 0 ? `${(m.net / budgetOffComm * 100) >= 0 ? "+" : ""}${fmt(m.net / budgetOffComm * 100, 1)} %` : "—"}
                      </div> */}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Détail de chaque section budgétaire */}
            {budgetSections.map(s => (
              <div key={s.key} style={{ background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(34,58,70,.07)", overflow: "hidden" }}>
                <div style={{ background: s.color, color: P.white, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                  <FaFileInvoiceDollar size={14} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.title} — {s.subtitle}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.desc}</div>
                  </div>
                </div>

                {/* Synthèse côte-à-côte */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", borderBottom: `1px solid ${P.linen}` }}>
                  <div style={{ padding: "16px 20px", background: s.bg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{s.gauche.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{s.gauche.src}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{fmt(s.gauche.mnt, 0)} <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span></div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{fmt(s.gauche.jh, 1)} JH</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 24px", borderLeft: `1px solid ${P.linen}`, borderRight: `1px solid ${P.linen}`, minWidth: 200, gap: 4 }}>
                    <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 4 }}>Écart</div>
                    <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Hors charges</div>
                    <Delta value={s.deltaHT} unit={deviseAbr} />
                    <div style={{ fontSize: 9, color: P.charges, fontWeight: 600, marginTop: 6, marginBottom: 2 }}>Charges : −{fmt(s.charges, 0)} {deviseAbr}</div>
                    <div style={{ fontSize: 9, color: P.charges, fontWeight: 600, marginBottom: 2 }}>Avec les charges</div>
                    <Delta value={s.deltaNet} unit={deviseAbr} />
                    {/* <div style={{ fontSize: 13, fontWeight: 800, color: s.tauxPct >= 0 ? P.success : P.tomato, marginTop: 6 }}>
                      {s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %
                    </div>
                    <div style={{ fontSize: 8, color: "#6b7280", textAlign: "center" }}>taux marge nette</div> */}
                  </div>

                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#5c6ac4", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{s.droite.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{s.droite.src}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#5c6ac4" }}>{fmt(s.droite.mnt, 0)} <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span></div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{fmt(s.droite.jh, 1)} JH</div>
                    {s.charges > 0 && (
                      <div style={{ marginTop: 8, background: "#fffbeb", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#92400e", fontWeight: 600 }}>
                        + Charges : {fmt(s.charges, 0)} {deviseAbr}
                        <div style={{ fontWeight: 700, marginTop: 2 }}>= {fmt(s.droite.mnt + s.charges, 0)} {deviseAbr} total</div>
                      </div>
                    )}
                    {/* Formule marge nette */}
                    <div style={{ marginTop: 8, background: s.bg, borderRadius: 6, padding: "6px 10px", fontSize: 10, color: "#6b7280" }}>
                      <strong>Marge nette :</strong> {s.formulaNet}
                    </div>
                  </div>
                </div>

                {/* Barre */}
                {/* <div style={{ padding: "10px 20px", borderBottom: `1px solid ${P.linen}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 4 }}>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.gauche.label} — {fmt(s.gauche.mnt, 0)} {deviseAbr}</span>
                    <span style={{ color: "#5c6ac4", fontWeight: 600 }}>Coût total (projet+charges) — {fmt(s.droite.mnt + s.charges, 0)} {deviseAbr}</span>
                  </div>
                  <div style={{ background: P.linen, borderRadius: 999, height: 14, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${Math.min(100, s.gauche.mnt > 0 ? (s.droite.mnt / s.gauche.mnt) * 100 : 0)}%`, height: "100%", background: "#5c6ac4", opacity: 0.85, borderRadius: s.charges > 0 ? "999px 0 0 999px" : 999 }} />
                    {s.charges > 0 && (
                      <div style={{ width: `${Math.min(100, s.gauche.mnt > 0 ? (s.charges / s.gauche.mnt) * 100 : 0)}%`, height: "100%", background: P.charges, opacity: 0.75, borderRadius: "0 999px 999px 0" }} />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 3, fontSize: 9, color: "#6b7280" }}>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, background: "#5c6ac4", borderRadius: 2, marginRight: 3 }} />Coût JH projet {fmt(s.droite.mnt, 0)}</span>
                    <span><span style={{ display: "inline-block", width: 8, height: 8, background: P.charges, borderRadius: 2, marginRight: 3 }} />Charges {fmt(s.charges, 0)}</span>
                    <span style={{ fontStyle: "italic" }}>{s.hint}</span>
                  </div>
                </div> */}

                {/* Tableau par profil avec charges */}
                {s.profils.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "left", borderBottom: `1px solid ${P.linen}` }}>Profil</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>TJM</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: s.color, textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>{s.gauche.label}</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5c6ac4", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>{s.droite.label}</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: P.charges, textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>Charges annexes</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>Δ HT</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: P.charges, textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>Δ Net (Avec les charges)</th>
                          {/* <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>% marge nette</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {s.profils.map((p: any, i: number) => (
                          <tr key={i}>
                            <td style={{ padding: "9px 16px", fontSize: 12, fontWeight: 700, color: P.charcoal, background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{p.name}</td>
                            <td style={{ padding: "9px 12px", fontSize: 11, color: "#6b7280", textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.tjm, 0)} {deviseAbr}</td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: s.color, fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.mntG, 0)} {deviseAbr}</td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: "#5c6ac4", fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.mntD, 0)} {deviseAbr}</td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: P.charges, fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}></td>
                            <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}><Delta value={p.deltaHT} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                            <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}><Delta value={p.deltaNet} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                            {/* <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: p.taux >= 0 ? P.success : P.tomato }}>{p.taux >= 0 ? "+" : ""}{fmt(p.taux, 1)} %</span>
                            </td> */}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                          <td style={{ padding: "10px 16px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL</td>
                          <td />
                          <td style={{ padding: "10px 12px", textAlign: "right", color: s.color, fontWeight: 700 }}>{fmt(s.gauche.mnt, 0)} {deviseAbr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#5c6ac4", fontWeight: 700 }}>{fmt(s.droite.mnt, 0)} {deviseAbr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: P.charges, fontWeight: 700 }}>{fmt(s.charges, 0)} {deviseAbr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={s.deltaHT} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={s.deltaNet} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                          {/* <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: s.tauxPct >= 0 ? P.success : P.tomato }}>{s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %</span>
                          </td> */}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
           MARGES — 3 comparaisons JH+budget avec charges annexes explicites
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "marge_planning" && (() => {
        const jh_1 = jhOffreComm - jhLeadBacklog;
        const mnt_1_ht = budgetOffComm - budgetLeadCalc;
        const mnt_1_net = budgetOffComm - budgetLeadTotal;
        const taux_1 = budgetOffComm > 0 ? (mnt_1_net / budgetOffComm) * 100 : 0;

        const jh_2 = jhLeadBacklog - jhPlanifie;
        const mnt_2_ht = budgetLeadCalc - factProjet;
        const mnt_2_net = budgetLeadCalc - (factProjet + chargesAnnexes);
        const taux_2 = budgetLeadCalc > 0 ? (mnt_2_net / budgetLeadCalc) * 100 : 0;

        const jh_3 = jhOffreComm - jhPlanifie;
        const mnt_3_ht = budgetOffComm - factProjet;
        const mnt_3_net = budgetOffComm - coutTotalProjet;
        const taux_3 = budgetOffComm > 0 ? (mnt_3_net / budgetOffComm) * 100 : 0;

        const sections = [
          {
            key: "s_vs_o",
            title: "Offre technique vendue ↔ Backlog offre",
            desc: "Ce que le commercial a vendu vs ce que l'équipe technique a proposé. Charges déduites de l'offre.",
            color: P.offre, bg: "#ede9fe", border: "#7c3aed44",
            gauche: { label: "Offre tech. vendue",  jh: jhOffreComm,    mnt: budgetOffComm,  src: "lead_tech_fin_details" },
            droite: { label: "Budget backlog offre", jh: jhLeadBacklog,  mnt: budgetLeadCalc, src: "backlog offre (Σ JH×TJM)" },
            deltaJH: jh_1, mnt_ht: mnt_1_ht, mnt_net: mnt_1_net, charges: chargesAnnexes, tauxPct: taux_1,
            hint: "+ = marge commerciale favorable · − = l'offre tech coûte plus que vendu",
            profils: profils.map((p: any, i: number) => {
              const bLead = p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0);
              const bOffre = (p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0);
              const ch = chargesParProfil[i];
              return { name: p.name, tjm: p.tjm, jhG: p.volumeOffreCommerciale ?? 0, jhD: p.volumeLead ?? 0, mntG: bOffre, mntD: bLead, charges: ch, dJH: (p.volumeOffreCommerciale ?? 0) - (p.volumeLead ?? 0), dHT: bOffre - bLead, dNet: bOffre - bLead - ch, taux: bOffre > 0 ? (bOffre - bLead - ch) / bOffre * 100 : 0 };
            }),
          },
          {
            key: "o_vs_p",
            title: "Backlog offre ↔ Backlog projet",
            desc: "Ce que l'équipe a proposé dans le backlog offre vs ce qui est réellement planifié. Charges déduites du backlog offre.",
            color: P.phase, bg: "#e0f5f7", border: "#00848e44",
            gauche: { label: "Budget backlog offre",   jh: jhLeadBacklog, mnt: budgetLeadCalc, src: "backlog offre" },
            droite: { label: "Budget backlog projet",  jh: jhPlanifie,    mnt: factProjet,     src: "backlog projet (Σ JH×TJM)" },
            deltaJH: jh_2, mnt_ht: mnt_2_ht, mnt_net: mnt_2_net, charges: chargesAnnexes, tauxPct: taux_2,
            hint: "+ = projet optimisé vs le backlog offre · − = dépassement planifié",
            profils: profils.map((p: any, i: number) => {
              const bLead = p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0);
              const bProj = (p.volumeBacklogProjet ?? 0) * (p.tjmProjet ?? p.tjm ?? 0);
              const ch = chargesParProfil[i];
              return { name: p.name, tjm: p.tjm, jhG: p.volumeLead ?? 0, jhD: p.volumeBacklogProjet ?? 0, mntG: bLead, mntD: bProj, charges: ch, dJH: (p.volumeLead ?? 0) - (p.volumeBacklogProjet ?? 0), dHT: bLead - bProj, dNet: bLead - bProj - ch, taux: bLead > 0 ? (bLead - bProj - ch) / bLead * 100 : 0 };
            }),
          },
          {
            key: "s_vs_p",
            title: "Offre technique vendue ↔ Backlog projet",
            desc: "Vision globale : ce que le client a payé vs ce que le projet coûte réellement (JH + charges annexes).",
            color: "#5c6ac4", bg: "#eef0fc", border: "#5c6ac444",
            gauche: { label: "Offre tech. vendue",     jh: jhOffreComm,  mnt: budgetOffComm, src: "lead_tech_fin_details" },
            droite: { label: "Budget backlog projet",  jh: jhPlanifie,   mnt: factProjet,    src: "backlog projet (Σ JH×TJM)" },
            deltaJH: jh_3, mnt_ht: mnt_3_ht, mnt_net: mnt_3_net, charges: chargesAnnexes, tauxPct: taux_3,
            hint: "+ = marge nette positive · − = projet déficitaire Avec les charges",
            profils: profils.map((p: any, i: number) => {
              const bOffre = (p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0);
              const bProj  = (p.volumeBacklogProjet ?? 0) * (p.tjmProjet ?? p.tjm ?? 0);
              const ch = chargesParProfil[i];
              return { name: p.name, tjm: p.tjm, jhG: p.volumeOffreCommerciale ?? 0, jhD: p.volumeBacklogProjet ?? 0, mntG: bOffre, mntD: bProj, charges: ch, dJH: (p.volumeOffreCommerciale ?? 0) - (p.volumeBacklogProjet ?? 0), dHT: bOffre - bProj, dNet: bOffre - bProj - ch, taux: bOffre > 0 ? (bOffre - bProj - ch) / bOffre * 100 : 0 };
            }),
          },
        ];

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Récap 3 marges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {sections.map(s => (
                <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>ΔJH</div>
                      <Delta value={s.deltaJH} unit="JH" zeroLabel="✓" />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Δ HT</div>
                      <Delta value={s.mnt_ht} unit={deviseAbr} zeroLabel="✓" />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: P.charges, fontWeight: 600, marginBottom: 2 }}>Δ Net</div>
                      <Delta value={s.mnt_net} unit={deviseAbr} zeroLabel="✓" />
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "5px 8px", display: "flex", justifyContent: "space-between" }}>
                    {/* <span style={{ fontSize: 11, fontWeight: 700, color: s.tauxPct >= 0 ? P.success : P.tomato }}>{s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} % net</span> */}
                    <span style={{ fontSize: 9, color: P.charges }}>charges : −{fmt(s.charges, 0)} {deviseAbr}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Détail de chaque comparaison */}
            {sections.map(s => (
              <div key={s.key} style={{ background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(34,58,70,.07)", overflow: "hidden" }}>
                <div style={{ background: s.color, color: P.white, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                  <FaBalanceScale size={14} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.desc}</div>
                  </div>
                </div>

                {/* Bandeau synthèse */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", borderBottom: `1px solid ${P.linen}` }}>
                  <div style={{ padding: "16px 20px", background: s.bg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{s.gauche.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{s.gauche.src}</div>
                    <div style={{ display: "flex", gap: 20 }}>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: P.charcoal }}>{fmt(s.gauche.jh, 1)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>JH</span></div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{fmt(s.gauche.mnt, 0)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span></div></div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 20px", borderLeft: `1px solid ${P.linen}`, borderRight: `1px solid ${P.linen}`, minWidth: 180, gap: 4 }}>
                    <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 4 }}>Écarts</div>
                    <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 1 }}>ΔJH</div>
                    <Delta value={s.deltaJH} unit="JH" />
                    <div style={{ fontSize: 9, color: "#6b7280", marginTop: 5, marginBottom: 1 }}>Δ Montant HT</div>
                    <Delta value={s.mnt_ht} unit={deviseAbr} />
                    {s.charges > 0 && <>
                      <div style={{ fontSize: 9, color: P.charges, fontWeight: 600, marginTop: 5, marginBottom: 1 }}>− Charges ({fmt(s.charges, 0)} {deviseAbr})</div>
                      <div style={{ fontSize: 9, color: P.charges, fontWeight: 600, marginBottom: 1 }}>Δ Net Avec les charges</div>
                      <Delta value={s.mnt_net} unit={deviseAbr} />
                    </>}
                    {/* <div style={{ fontSize: 13, fontWeight: 800, color: s.tauxPct >= 0 ? P.success : P.tomato, marginTop: 6 }}>
                      {s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %
                    </div>
                    <div style={{ fontSize: 9, color: "#6b7280", fontStyle: "italic" }}>taux marge nette</div> */}
                  </div>

                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#5c6ac4", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{s.droite.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{s.droite.src}</div>
                    <div style={{ display: "flex", gap: 20 }}>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: P.charcoal }}>{fmt(s.droite.jh, 1)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>JH</span></div></div>
                      <div><div style={{ fontSize: 22, fontWeight: 800, color: "#5c6ac4" }}>{fmt(s.droite.mnt, 0)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span></div></div>
                    </div>
                    {s.charges > 0 && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, background: "#fffbeb", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#92400e", fontWeight: 600 }}>
                        <FaMoneyBillWave size={11} color="#d97706" />
                        + Charges : {fmt(s.charges, 0)} {deviseAbr} → Total coût : {fmt(s.droite.mnt + s.charges, 0)} {deviseAbr}
                      </div>
                    )}
                  </div>
                </div>

                {/* Barres HT et nette */}
                {/* <div style={{ padding: "12px 20px", borderBottom: `1px solid ${P.linen}` }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 3 }}>
                      <span style={{ color: s.color, fontWeight: 600 }}>{s.gauche.label}</span>
                      <span style={{ color: "#5c6ac4", fontWeight: 600 }}>Coût JH — {fmt(s.droite.mnt, 0)} {deviseAbr}</span>
                    </div>
                    <div style={{ background: P.linen, borderRadius: 999, height: 10, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, s.gauche.mnt > 0 ? (s.droite.mnt / s.gauche.mnt) * 100 : 0)}%`, height: "100%", background: s.mnt_ht >= 0 ? "#5c6ac4" : P.tomato, borderRadius: 999 }} />
                    </div>
                    <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2, fontStyle: "italic" }}>Hors charges — {s.hint.split("·")[0].trim()}</div>
                  </div>
                  {s.charges > 0 && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 3 }}>
                        <span style={{ color: s.color, fontWeight: 600 }}>{s.gauche.label}</span>
                        <span style={{ color: P.charges, fontWeight: 600 }}>Coût JH + Charges — {fmt(s.droite.mnt + s.charges, 0)} {deviseAbr}</span>
                      </div>
                      <div style={{ background: P.linen, borderRadius: 999, height: 10, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${Math.min(100, s.gauche.mnt > 0 ? (s.droite.mnt / s.gauche.mnt) * 100 : 0)}%`, height: "100%", background: "#5c6ac4", opacity: 0.85, borderRadius: "999px 0 0 999px" }} />
                        <div style={{ width: `${Math.min(100, s.gauche.mnt > 0 ? (s.charges / s.gauche.mnt) * 100 : 0)}%`, height: "100%", background: P.charges, opacity: 0.8, borderRadius: "0 999px 999px 0" }} />
                      </div>
                      <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2, fontStyle: "italic" }}>Avec les charges — marge nette : {s.mnt_net >= 0 ? "+" : ""}{fmt(s.mnt_net, 0)} {deviseAbr}</div>
                    </div>
                  )}
                </div> */}

                {/* Tableau par profil */}
                {s.profils.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "left", borderBottom: `1px solid ${P.linen}` }}>Profil</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>TJM</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: s.color, textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>JH / {deviseAbr} gauche</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5c6ac4", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>JH / {deviseAbr} droite</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: P.charges, textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>Charges annexes</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>ΔJH</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>Δ HT</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: P.charges, textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>Δ Net</th>
                          {/* <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>% net</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {s.profils.map((p: any, i: number) => (
                          <tr key={i}>
                            <td style={{ padding: "9px 16px", fontSize: 12, fontWeight: 700, color: P.charcoal, background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{p.name}</td>
                            <td style={{ padding: "9px 12px", fontSize: 11, color: "#6b7280", textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.tjm, 0)} {deviseAbr}</td>
                            <td style={{ padding: "9px 12px", fontSize: 11, color: s.color, fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>
                              {fmt(p.jhG, 1)} JH<br /><span style={{ fontSize: 10, color: P.dim }}>{fmt(p.mntG, 0)} {deviseAbr}</span>
                            </td>
                            <td style={{ padding: "9px 12px", fontSize: 11, color: "#5c6ac4", fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>
                              {fmt(p.jhD, 1)} JH<br /><span style={{ fontSize: 10, color: P.dim }}>{fmt(p.mntD, 0)} {deviseAbr}</span>
                            </td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: P.charges, fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}></td>
                            <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}><Delta value={p.dJH} unit="JH" zeroLabel="✓" size="sm" /></td>
                            <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}><Delta value={p.dHT} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                            <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}><Delta value={p.dNet} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                            {/* <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: p.taux >= 0 ? P.success : P.tomato }}>{p.taux >= 0 ? "+" : ""}{fmt(p.taux, 1)} %</span>
                            </td> */}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                          <td style={{ padding: "10px 16px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL</td>
                          <td />
                          <td style={{ padding: "10px 12px", textAlign: "right", color: s.color, fontWeight: 700 }}>
                            {fmt(s.gauche.jh, 1)} JH<br /><span style={{ fontSize: 10 }}>{fmt(s.gauche.mnt, 0)} {deviseAbr}</span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#5c6ac4", fontWeight: 700 }}>
                            {fmt(s.droite.jh, 1)} JH<br /><span style={{ fontSize: 10 }}>{fmt(s.droite.mnt, 0)} {deviseAbr}</span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: P.charges, fontWeight: 700 }}>{fmt(s.charges, 0)} {deviseAbr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={s.deltaJH} unit="JH" zeroLabel="✓" size="sm" /></td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={s.mnt_ht} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={s.mnt_net} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                          {/* <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: s.tauxPct >= 0 ? P.success : P.tomato }}>{s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %</span>
                          </td> */}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ═══════════ CA & MARGE ═══════════ */}
      {activeTab === "ca" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* <div style={{ background: "#eff6ff", border: "1px solid #bee3f8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1e40af", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <FaCoins size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Facturation</strong> = Budget backlog offre ({fmt(factLeadTotal,0)} {deviseAbr} = {fmt(jhLeadBacklog,1)} JH × TJM) — référence contractuelle.{" "}
              <strong>Marge brute</strong> = CA encaissé − Facturation backlog offre − Charges annexes.
            </span>
          </div> */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={card}>
              <div style={sh}><FaChartLine size={13} /> Progression du paiment client</div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: P.success, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><FaCheckCircle size={11} /> Encaissé</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: P.success }}>{fmt(caEncaisse,0)} {deviseAbr}</span>
                  </div>
                  <Bar value={caEncaisse} max={montantOffreLead || 1} color={P.success} height={12} />
                  <div style={{ fontSize: 10, color: P.dim, marginTop: 4 }}>{fmt(tauxEnc,1)} % de l'offre encaissé</div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#b45309", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><FaClock size={11} /> + Planifié non encaissé</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>{fmt(caPlanifie,0)} {deviseAbr}</span>
                  </div>
                  <Bar value={caPotentiel} max={montantOffreLead || 1} color={P.tuscan} height={8} />
                  <div style={{ fontSize: 10, color: P.dim, marginTop: 4 }}>{fmt(tauxCouv,1)} % couverture totale attendue</div>
                </div>
                <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: P.dim }}>Offre tech. vendue</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: P.charcoal }}>{fmt(montantOffreLead,0)} {deviseAbr}</span>
                </div>
                {resteAEnc > 0
                  ? <div style={{ background: "#fffbeb", border: `1px solid ${P.tuscan}55`, borderLeft: `3px solid ${P.tuscan}`, borderRadius: 6, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><FaCoins size={11} color="#b45309" /><span style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>Reste à encaisser</span></div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#b45309" }}>{fmt(resteAEnc,0)} {deviseAbr}</span>
                    </div>
                  : <div style={{ background: "#f0fdf4", border: `1px solid ${P.success}44`, borderLeft: `3px solid ${P.success}`, borderRadius: 6, padding: "10px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                      <FaCheckCircle size={11} color={P.success} /><span style={{ fontSize: 12, color: P.success, fontWeight: 600 }}>Intégralement encaissé</span>
                    </div>
                }
              </div>
            </div>

            <div style={card}>
              <div style={sh}><FaTrophy size={13} /> Marge prévisionnelle</div>
              <div style={{ padding: 18 }}>
                {[
                  { label: "Paiement client encaissé", value: caEncaisse,      color: P.success, bold: false },
                  { label: `− Facturation des ressources prévisionnelle (backlog offre) (${fmt(jhLeadBacklog,1)} JH × TJM)`, value: -factLeadTotal, color: P.tomato, bold: false },
                  { label: "− Charges annexes",                                       value: -chargesAnnexes, color: "#b45309", bold: false },
                  { label: "= Marge prévisionnelle",                                value: marge,            color: marge >= 0 ? P.success : P.tomato, bold: true },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${row.bold ? "10px" : "0"} 0 8px`, borderBottom: row.bold ? "none" : `1px solid ${P.linen}`, borderTop: row.bold ? `2px solid ${P.linen}` : "none" }}>
                    <span style={{ fontSize: 12, color: row.bold ? P.charcoal : P.dim, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                    <span style={{ fontSize: row.bold ? 18 : 13, fontWeight: row.bold ? 800 : 600, color: row.color }}>{row.value >= 0 ? "+" : ""}{fmt(row.value,0)} {deviseAbr}</span>
                  </div>
                ))}
                {/* {caEncaisse > 0 && <div style={{ marginTop: 8, fontSize: 12, color: P.dim }}>Taux de marge : <strong style={{ color: marge >= 0 ? P.success : P.tomato }}>{fmt(tauxMarge,1)} %</strong></div>} */}
              </div>
            </div>
          </div>

          {/* Marge nette */}
          <div style={{ background: margeNetteSvsP >= 0 ? "#f0fdf4" : "#fef2f2", border: `2px solid ${margeNetteSvsP >= 0 ? P.success : P.tomato}`, borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 8px rgba(34,58,70,.10)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <FaTrophy size={20} color={margeNetteSvsP >= 0 ? P.success : P.tomato} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: P.charcoal }}>Marge nette réelle — Offre tech. vendue ↔ Backlog projet avec charges annexes</div>
                <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>Offre tech. vendue − (Budget backlog projet + Charges annexes)</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Offre tech. vendue",      value: budgetOffComm,    color: P.offre, sub: "Budget dans l'offre financière" },
                { label: "− Budget backlog projet",  value: -factProjet,      color: P.lot,   sub: `${fmt(jhPlanifie, 1)} JH × TJM` },
                { label: "− Charges annexes",        value: -chargesAnnexes,  color: P.charges, sub: "transport, hébergement…" },
                { label: "= Marge réelle",            value: margeNetteSvsP,   color: margeNetteSvsP >= 0 ? P.success : P.tomato, sub: `Marge réelle (projet)`, bold: true },
              ].map((item: any, i) => (
                <div key={i} style={{ background: i === 3 ? (margeNetteSvsP >= 0 ? "#dcfce7" : "#fee2e2") : P.white, borderRadius: 8, padding: "12px 14px", border: i === 3 ? `2px solid ${item.color}44` : `1px solid ${P.linen}` }}>
                  <div style={{ fontSize: 10, color: item.color, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: i === 3 ? 24 : 20, fontWeight: 800, color: item.color }}>
                    {item.value >= 0 ? "+" : ""}{fmt(item.value, 0)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>{item.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderTop: `1px solid ${margeNetteSvsP >= 0 ? "#bbf7d0" : "#fecaca"}`, paddingTop: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: P.dim, fontWeight: 600, marginBottom: 8 }}>Comparaison marge prévisionnelle vs marge réelle</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Marge prévisionnelle", value: marge, color: marge >= 0 ? P.success : P.tomato },
                    { label: "Marge réelle",  value: margeNetteSvsP,  color: margeNetteSvsP >= 0 ? P.success : P.tomato },
                    { label: "Reste à encaisser",                   value: resteAEnc,       color: resteAEnc > 0 ? "#b45309" : P.success },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: P.dim }}>{r.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.value >= 0 && i < 2 ? "+" : ""}{fmt(r.value, 0)} {deviseAbr}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* <div>
                <div style={{ fontSize: 11, color: P.dim, fontWeight: 600, marginBottom: 8 }}>Indicateurs de rentabilité</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Taux marge nette",    value: `${tauxMargeNetteSvsP >= 0 ? "+" : ""}${fmt(tauxMargeNetteSvsP, 1)} %`,     color: tauxMargeNetteSvsP >= 0 ? P.success : P.tomato },
                    { label: "Taux marge brute",    value: caEncaisse > 0 ? `${fmt(tauxMarge, 1)} %` : "—",                             color: marge >= 0 ? P.success : P.tomato },
                    { label: "Taux encaissement",   value: `${fmt(tauxEnc, 1)} %`,                                                      color: tauxEnc >= 100 ? P.success : "#b45309" },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: P.dim }}>{r.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>
          </div>

          {calendrier.length > 0 && (
            <div style={card}>
              <div style={sh}><FaFileInvoiceDollar size={13} /> Calendrier paiements client</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Libellé</th><th style={th}>Référence</th>
                    <th style={{ ...th, textAlign: "center" }}>Montant</th>
                    <th style={{ ...th, textAlign: "center" }}>Échéance</th>
                    <th style={{ ...th, textAlign: "center" }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {calendrier.map((c, i) => {
                    const sc: Record<string,string> = { PAYE: P.success, EN_ATTENTE: "#b45309", PARTIELLEMENT_PAYE: "#1d4ed8", ANNULE: P.tomato };
                    const sbg: Record<string,string> = { PAYE: "#d1fae5", EN_ATTENTE: "#fffbeb", PARTIELLEMENT_PAYE: "#eff6ff", ANNULE: "#fee2e2" };
                    const sl: Record<string,string> = { PAYE: "✓ Payé", EN_ATTENTE: "⏳ Attente", PARTIELLEMENT_PAYE: "◑ Partiel", ANNULE: "✗ Annulé" };
                    return (
                      <tr key={c.id}>
                        <td style={{ ...td(i), color: P.charcoal }}>{c.libelle}</td>
                        <td style={{ ...td(i), color: P.dim, fontSize: 11 }}>{c.typeReference}</td>
                        <td style={{ ...td(i), textAlign: "center", fontWeight: 700, color: c.statut === "PAYE" ? P.success : P.charcoal }}>{fmt(c.montantAPayer,0)} {deviseAbr}</td>
                        <td style={{ ...td(i), textAlign: "center", color: P.dim, fontSize: 11 }}>{fmtDate(c.datePaiement)}</td>
                        <td style={{ ...td(i), textAlign: "center" }}><Pill color={sc[c.statut] ?? P.dim} bg={sbg[c.statut] ?? P.linen}>{sl[c.statut] ?? c.statut}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                    <td colSpan={2} style={{ padding: "10px 12px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL ENCAISSÉ</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: P.success, fontSize: 13 }}>{fmt(caEncaisse,0)} {deviseAbr}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComparaisonOpportuniteProjet;