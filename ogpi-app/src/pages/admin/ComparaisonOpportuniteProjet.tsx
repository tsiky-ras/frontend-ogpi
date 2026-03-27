/**
 * ComparaisonOpportuniteProjet.tsx
 *
 * ══════════════════════════════════════════════════════════
 *  LES 4 NIVEAUX JH — SÉPARATION CLAIRE
 *
 *  Niveau 1 — volumeOffreCommerciale (= jhOffreVendu prorata)
 *    Source : lead_tech_fin_details.jh_vendu distribué au prorata par profil
 *    → "Offre tech/fin" — ce que le commercial a vendu globalement
 *    → Utilisé dans l'onglet "Marge Commerciale" (OngletMargeCommerciale)
 *
 *  Niveau 2 — volumeLead (= jhBacklogLead)
 *    Source : Σ backlog_line_profil.volume du backlog LEAD
 *    → "Backlog lead" — proposition équipe technique
 *    → Référence contractuelle technique, base facturation CA
 *
 *  Niveau 3 — volumeBacklogProjet (= jhBacklogProjet)
 *    Source : Σ backlog_line_profil.volume du backlog PROJET
 *    → "Planifié" — ce qui est planifié en cours d'exécution
 *
 *  Niveau 4 — volumeProjet (= jhRealise / time_spent)
 *    Source : Σ backlog_line_profil.time_spent
 *    → "Réalisé" — consommation réelle, indicatif uniquement
 *
 *  CET ONGLET (Comparaison) compare : Backlog lead ↔ Backlog projet ↔ Réalisé
 *  L'ONGLET "Marge Commerciale" compare : Offre tech/fin ↔ Backlog lead
 * ══════════════════════════════════════════════════════════
 */

import React, { useMemo, useState } from "react";
import {
  FaCalendarAlt, FaCalendarCheck, FaChartBar, FaChartLine,
  FaCheckCircle, FaExclamationTriangle, FaArrowRight,
  FaClock, FaLayerGroup, FaColumns, FaFileInvoiceDollar,
  FaUsers, FaCoins, FaTrophy, FaAngleRight, FaInfoCircle, FaTimes,
  FaBalanceScale,
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

/**
 * ProfilBudget — 4 niveaux JH explicitement séparés.
 *
 * IMPORTANT : le mapping depuis le backend (ComparaisonProjetGlobal) doit être :
 *   volumeOffreCommerciale ← detailProfils[i].jhOffreVendu     (offre tech prorata)
 *   volumeLead             ← detailProfils[i].jhBacklogLead    (backlog lead)
 *   volumeBacklogProjet    ← detailProfils[i].jhBacklogProjet  (backlog projet)
 *   volumeProjet           ← detailProfils[i].jhRealise        (time_spent)
 *   budgetBacklogLead      ← detailProfils[i].budgetBacklogLead (JH lead × TJM)
 */
export interface ProfilBudget {
  id: number;
  name: string;
  tjm: number;                        // TJM profil LEAD
  tjmProjet?: number;                 // TJM profil PROJET
  volumeOffreCommerciale?: number;    // Niveau 1 : JH offre tech/fin prorata
  volumeLead: number;                 // Niveau 2 : JH backlog lead (prop. tech)
  volumeBacklogProjet: number;        // Niveau 3 : JH backlog projet (planifié)
  volumeProjet: number;               // Niveau 4 : JH réalisés (time_spent)
  budgetBacklogLead?: number;         // JH lead × TJM = base facturation CA
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
  // Props pour OngletMargeCommerciale (depuis backend)
  detailProfils?: Array<{
    backlogProfilId: number; profilName: string; tjm: number;
    jhOffreVendu: number; jhBacklogLead: number; jhBacklogProjet: number; jhRealise: number;
    margeCommercialeJH: number; margePlanningJH: number; ecartRealiseJH: number;
    budgetBacklogLead: number; budgetPlanifie: number;
  }>;
  montantBacklogLead?: number;
  montantBacklogProjet?: number;
  margeCommercialeMontant?: number;
  /** Callback appelé une fois la marge nette calculée — utilisé par ListeProjet pour le dashboard */
  onMargeNette?: (margeNette: number, deviseAbr: string) => void;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  charcoal: "#223A46", tomato: "#C93C29", tuscan: "#EABF5B",
  dim: "#5F6F6E", linen: "#E8E5D7", bg: "#fafaf9", white: "#ffffff",
  success: "#2d8f47",
  lot:   "#5c6ac4",  // indigo  — backlog PROJET (planifié)
  phase: "#00848e",  // teal    — backlog LEAD (référence tech)
  offre: "#7c3aed",  // violet  — offre tech/fin commerciale
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

const BarBicolore: React.FC<{ pctConsomme: number; depassement: boolean; height?: number }> = ({ pctConsomme, depassement, height = 14 }) => {
  const c = Math.min(100, pctConsomme); const r = Math.max(0, 100 - c);
  return (
    <div style={{ background: P.linen, borderRadius: 999, height, overflow: "hidden", display: "flex" }}>
      <div style={{ width: `${c}%`, height: "100%", background: depassement ? P.tomato : P.lot, borderRadius: r > 0 ? "999px 0 0 999px" : 999, flexShrink: 0 }} />
      {!depassement && r > 0 && <div style={{ width: `${r}%`, height: "100%", background: P.success, opacity: 0.55, borderRadius: "0 999px 999px 0", flexShrink: 0 }} />}
    </div>
  );
};

const Delta: React.FC<{ value: number; unit: string; invert?: boolean; zeroLabel?: string; size?: "sm" | "md" }> = ({ value, unit, invert = false, zeroLabel = "✓", size = "md" }) => {
  const z = Math.abs(value) < 0.01;
  const bad = invert ? value > 0 : value < 0;
  const c = z ? P.success : bad ? P.tomato : P.success;
  const bg = z ? "#d1fae5" : bad ? "#fee2e2" : "#d1fae5";
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

const LegendePanneau: React.FC<{ deviseAbr: string }> = ({ deviseAbr: _ }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: `1px solid ${P.linen}`, borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: P.dim }}>
        <FaInfoCircle size={12} color={P.phase} /> Guide de lecture <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, padding: "18px 20px", boxShadow: "0 2px 8px rgba(34,58,70,.08)" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: P.dim }}><FaTimes size={13} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: P.dim, marginBottom: 8 }}>Les 4 niveaux (ordre décroissant)</div>
              {[
                { color: P.offre, label: "Offre tech/fin", sub: "JH vendus prorata · lead_tech_fin_details → onglet Marge Comm." },
                { color: P.phase, label: "Backlog lead",   sub: "JH proposition tech · référence contractuelle" },
                { color: P.lot,   label: "Backlog projet", sub: "JH planifiés en exécution → CET ONGLET" },
                { color: P.dim,   label: "Réalisé",        sub: "JH time_spent · indicatif → CET ONGLET", dashed: true },
              ].map(({ color, label, sub, dashed }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div style={{ flexShrink: 0, width: 12, height: 12, marginTop: 2, borderRadius: 3, background: color, border: dashed ? `1.5px dashed ${color}` : "none", opacity: dashed ? 0.7 : 1 }} />
                  <div><span style={{ fontSize: 12, fontWeight: 600, color: P.charcoal }}>{label}</span><span style={{ fontSize: 11, color: P.dim, marginLeft: 5 }}>{sub}</span></div>
                </div>
              ))}
              <div style={{ marginTop: 10, background: "#fffbeb", border: `1px solid ${P.tuscan}55`, borderLeft: `3px solid ${P.tuscan}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#92400e" }}>
                <strong>Cet onglet</strong> compare : Backlog lead ↔ Backlog projet ↔ Réalisé<br />
                <strong>Onglet Marge Comm.</strong> compare : Offre tech/fin ↔ Backlog lead
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: P.dim, marginBottom: 8 }}>Facturation CA</div>
              <div style={{ fontSize: 11, color: P.dim }}>Base = <strong>Budget backlog lead</strong> (JH lead × TJM lead). Référence contractuelle, indépendante du backlog projet.</div>
              <div style={{ marginTop: 8, background: P.linen, borderRadius: 7, padding: "10px 12px", fontSize: 11, color: P.dim }}>
                <strong>Marge brute</strong> = CA encaissé − Budget backlog lead − Charges annexes
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LegendeGantt: React.FC = () => (
  <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Légende du Gantt</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
      {[
        { color: P.phase, label: "Backlog lead (référence tech)", dashed: false, opacity: 0.85 },
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

const ConclusionPlanning: React.FC<{ margeOffre: number; decalageJours: number | null; ecartRealise: number }> = ({ margeOffre, decalageJours, ecartRealise }) => {
  const bad = margeOffre < 0 || ecartRealise > 0;
  const color = bad ? P.tomato : P.success;
  const Icon = bad ? FaExclamationTriangle : FaCheckCircle;
  return (
    <div style={{ background: bad ? "#fef2f2" : "#f0fdf4", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: 14, fontWeight: 700, color: P.charcoal }}>
          {bad ? "Dépassement planning détecté" : Math.abs(margeOffre) < 0.01 && Math.abs(ecartRealise) < 0.01 ? "Planning parfait" : "Planning optimal"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: margeOffre >= 0 ? "#d1fae5" : "#fee2e2", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, marginBottom: 2, textTransform: "uppercase" as const }}>Marge offre lead</div>
          <div style={{ fontSize: 11, color: P.dim, marginBottom: 6 }}>JH backlog lead − JH backlog projet</div>
          <span style={{ fontSize: 22, fontWeight: 900, color: margeOffre >= 0 ? P.success : P.tomato }}>{margeOffre >= 0 ? "+" : ""}{fmt(margeOffre, 1)} JH</span>
          <div style={{ fontSize: 10, color: P.dim, fontStyle: "italic", marginTop: 4 }}>{margeOffre >= 0 ? "✓ Planifié dans l'enveloppe" : "⚠ Planifié dépasse le backlog lead"}</div>
        </div>
        <div style={{ background: ecartRealise > 0 ? "#fee2e2" : "#d1fae5", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: P.dim, fontWeight: 700, marginBottom: 2, textTransform: "uppercase" as const }}>Écart réalisé</div>
          <div style={{ fontSize: 11, color: P.dim, marginBottom: 6 }}>JH réalisé − JH backlog projet</div>
          <span style={{ fontSize: 22, fontWeight: 900, color: ecartRealise > 0 ? P.tomato : P.success }}>{ecartRealise > 0 ? "+" : ""}{fmt(ecartRealise, 1)} JH</span>
          <div style={{ fontSize: 10, color: P.dim, fontStyle: "italic", marginTop: 4 }}>{ecartRealise < 0 ? `✓ En avance : ${fmt(Math.abs(ecartRealise),1)} JH` : ecartRealise > 0 ? `⚠ Retard : ${fmt(ecartRealise,1)} JH` : "✓ Dans le planifié"}</div>
        </div>
      </div>
      {decalageJours !== null && (
        <div style={{ marginTop: 10, fontSize: 12, color: P.dim, display: "flex", alignItems: "center", gap: 8 }}>
          <FaArrowRight size={11} color={color} /> Décalage dates : <Delta value={decalageJours} unit="j.ouv." size="sm" />
          <span style={{ fontSize: 10, fontStyle: "italic" }}>+ = avant échéance · − = retard</span>
        </div>
      )}
    </div>
  );
};

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

  // ══════════════════════════════════════════════════════════════════════
  //  LES 4 NIVEAUX JH — calculs agrégés avec SÉPARATION CLAIRE
  // ══════════════════════════════════════════════════════════════════════

  // Niveau 1 : Offre tech/fin (prorata par profil)
  const jhOffreTechFin = useMemo(() => profils.reduce((s, p) => s + (p.volumeOffreCommerciale ?? 0), 0), [profils]);
  const jhOffreComm = jhOffreCommerciale > 0 ? jhOffreCommerciale : jhOffreTechFin;

  // Niveau 2 : Backlog lead — RÉFÉRENCE de cet onglet Comparaison
  const jhLeadBacklog = useMemo(() => profils.reduce((s, p) => s + (p.volumeLead ?? 0), 0), [profils]);

  // Niveau 3 : Backlog projet — CE qu'on compare dans cet onglet
  const jhPlanifie = useMemo(() => profils.reduce((s, p) => s + (p.volumeBacklogProjet ?? 0), 0), [profils]);

  // Niveau 4 : Réalisé (indicatif)
  const jhRealise = useMemo(() => profils.reduce((s, p) => s + (p.volumeProjet ?? 0), 0), [profils]);

  // Écarts — chacun compare les bons niveaux
  const margeCommerciale = jhOffreComm - jhLeadBacklog;    // offre tech − backlog lead (→ Marge Comm.)
  const margeOffre       = jhLeadBacklog - jhPlanifie;     // backlog lead − backlog projet (→ CET ONGLET)
  const ecartRealise     = jhRealise - jhPlanifie;         // réalisé − backlog projet (→ CET ONGLET)

  // Planning
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

  // ══════════════════════════════════════════════════════════════════════
  //  BUDGET
  // ══════════════════════════════════════════════════════════════════════

  const budgetOffComm = montantOffreLead > 0 ? montantOffreLead
    : budgetOffreCommerciale > 0 ? budgetOffreCommerciale
    : profils.reduce((s, p) => s + (p.volumeOffreCommerciale ?? p.volumeLead ?? 0) * (p.tjm ?? 0), 0);

  // Budget backlog LEAD = base facturation CA
  const budgetLeadCalc = useMemo(
    () => profils.reduce((s, p) => s + (p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0)), 0),
    [profils]
  );
  const budgetLeadTotal = budgetLeadCalc + chargesAnnexes;

  // Budget backlog PROJET
  const factProjet = useMemo(
    () => profils.reduce((s, p) => s + (p.volumeBacklogProjet ?? 0) * (p.tjmProjet ?? p.tjm ?? 0), 0),
    [profils]
  );

  const margeCommBudget   = budgetOffComm - budgetLeadTotal;
  const margeTechBudget   = budgetLeadCalc - (factProjet + chargesAnnexes);
  const coutTotalProjet   = factProjet + chargesAnnexes;
  const depassementBudget = coutTotalProjet - budgetOffComm;
  const margeBudget       = budgetOffComm - coutTotalProjet;
  const pctBudgetCons     = pct(coutTotalProjet, budgetOffComm || 1);

  // ══════════════════════════════════════════════════════════════════════
  //  CA — basé sur budget backlog LEAD (référence contractuelle)
  // ══════════════════════════════════════════════════════════════════════

  const factLeadTotal = budgetLeadCalc; // ← base facturation = JH lead × TJM

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

  // ── Marge nette Signé ↔ Projet après charges (exposée via callback pour ListeProjet) ──
  const margeNetteSvsP = budgetOffComm - factProjet - chargesAnnexes;
  const tauxMargeNetteSvsP = budgetOffComm > 0 ? (margeNetteSvsP / budgetOffComm) * 100 : 0;

  // Notification au parent dès que la valeur est disponible
  React.useEffect(() => {
    if (onMargeNette && budgetOffComm > 0) {
      onMargeNette(margeNetteSvsP, deviseAbr);
    }
  }, [margeNetteSvsP, deviseAbr, onMargeNette, budgetOffComm]);

  // Styles
  const card: React.CSSProperties = { background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(34,58,70,.07)" };
  const sh: React.CSSProperties = { background: P.charcoal, color: P.white, padding: "10px 16px", fontSize: 12, fontWeight: 700, borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", gap: 8 };
  const th: React.CSSProperties = { padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: P.dim, textAlign: "left", borderBottom: `1px solid ${P.linen}` };
  const td = (i: number): React.CSSProperties => ({ padding: "9px 12px", fontSize: 12, background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}`, verticalAlign: "middle" });

  return (
    <div style={{ fontFamily: "inherit", background: P.bg, padding: "4px 0" }}>

      {/* ── En-tête ── */}
      <div style={{ background: P.charcoal, borderRadius: 10, padding: "18px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, boxShadow: "0 2px 8px rgba(34,58,70,.15)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.white }}>Comparaison Backlog Lead ↔ Backlog Projet ↔ Réalisé</h2>
          <p style={{ margin: "5px 0 0", fontSize: 12, color: "rgba(232,229,215,.7)" }}>Marge offre lead · Écart réalisé · Facturation (JH lead × TJM) · CA encaissé</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill color={P.offre} bg="#ede9fe">Offre tech/fin → Marge Comm.</Pill>
          <FaAngleRight size={12} color="rgba(232,229,215,.5)" />
          <Pill color={P.phase} bg="#e0f5f7">Backlog lead</Pill>
          <FaAngleRight size={12} color="rgba(232,229,215,.5)" />
          <Pill color="#5c6ac4" bg="#eef0fc">Backlog projet</Pill>
          <FaAngleRight size={12} color="rgba(232,229,215,.5)" />
          <Pill color={P.dim} bg={P.linen}>Réalisé</Pill>
        </div>
      </div>

      <LegendePanneau deviseAbr={deviseAbr} />

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "MARGE OFFRE LEAD", sub: `Backlog lead (${fmt(jhLeadBacklog,1)}) − Planifié (${fmt(jhPlanifie,1)})`, hint: "+ = planifié dans l'enveloppe · − = dépassement", accentColor: margeOffre >= 0 ? P.success : P.tomato, content: <Delta value={margeOffre} unit="JH" zeroLabel="✓ Conforme" />, icon: <FaClock size={11} /> },
          { label: "ÉCART RÉALISÉ", sub: `Réalisé (${fmt(jhRealise,1)}) − Planifié (${fmt(jhPlanifie,1)})`, hint: "− = en avance · + = retard", accentColor: ecartRealise > 0 ? P.tomato : P.success, content: <Delta value={ecartRealise} unit="JH" invert zeroLabel="✓ Dans le planifié" />, icon: <FaCalendarCheck size={11} /> },
          { label: "MARGE COMM. (JH)", sub: `Offre tech (${fmt(jhOffreComm,1)}) − Backlog lead (${fmt(jhLeadBacklog,1)})`, hint: "+ = favorable · voir onglet Marge Comm.", accentColor: margeCommerciale >= 0 ? P.offre : P.tomato, content: <Delta value={margeCommerciale} unit="JH" zeroLabel="✓ Exact" />, icon: <FaUsers size={11} /> },
          { label: "MARGE COMM. BUDGET", sub: `Offre (${fmt(budgetOffComm,0)}) − Lead+charges (${fmt(budgetLeadTotal,0)})`, hint: "+ = marge commerciale", accentColor: margeCommBudget >= 0 ? P.offre : P.tomato, content: <Delta value={margeCommBudget} unit={deviseAbr} zeroLabel="✓ Exact" />, icon: <FaFileInvoiceDollar size={11} /> },
          { label: "MARGE BRUTE", sub: "CA encaissé − Fact. lead − Charges", hint: "+ = projet rentable · − = déficitaire", accentColor: marge >= 0 ? P.success : P.tomato, content: <span style={{ fontSize: 20, fontWeight: 800, color: marge >= 0 ? P.success : P.tomato }}>{marge >= 0 ? "+" : ""}{fmt(marge, 0)} {deviseAbr}</span>, icon: <FaTrophy size={11} /> },
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
          ["marge_planning", "Planning", <FaCalendarAlt size={12} />],
          ["budget",         "Budget",         <FaChartBar size={12} />],
          ["ca",             "CA & Marge",     <FaChartLine size={12} />],
        ] as const).map(([key, label, icon]) => (
          <button key={key} onClick={() => setActiveTab(key as any)} style={{ background: activeTab === key ? P.charcoal : "transparent", color: activeTab === key ? P.white : P.dim, border: "none", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ═══════════ PLANNING ═══════════ */}
      {activeTab === "planning" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ConclusionPlanning margeOffre={margeOffre} decalageJours={decalageJours} ecartRealise={ecartRealise} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <KpiCard title="Volume JH" icon={<FaUsers size={12} />}
              leadLabel={`Backlog lead (${fmt(jhLeadBacklog,1)} JH)`}
              projetLabel={`Backlog projet (${fmt(jhPlanifie,1)} JH)`}
              leadValue={<>{fmt(jhLeadBacklog,1)} <span style={{ fontSize: 11, color: P.dim }}>JH</span></>}
              projetValue={<>{fmt(jhPlanifie,1)} <span style={{ fontSize: 11, color: P.dim }}>JH</span></>}
              footer={
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: P.dim, minWidth: 140 }}>Offre tech/fin (prorata) :</span><span style={{ fontSize: 13, fontWeight: 800, color: P.offre }}>{fmt(jhOffreComm,1)} JH</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: P.dim, minWidth: 140 }}>Réalisé (indicatif) :</span><span style={{ fontSize: 13, fontWeight: 800, color: P.dim }}>{fmt(jhRealise,1)} JH</span></div>
                  <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span style={{ fontSize: 11, color: P.dim, minWidth: 140 }}>Marge offre lead <span style={{ fontSize: 9 }}>(+=bien)</span> :</span><Delta value={margeOffre} unit="JH" zeroLabel="✓" size="sm" /></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: P.dim, minWidth: 140 }}>Écart réalisé <span style={{ fontSize: 9 }}>(−=bien)</span> :</span><Delta value={ecartRealise} unit="JH" invert zeroLabel="✓" size="sm" /></div>
                  </div>
                </div>
              }
            />
            <KpiCard title="Date de fin" icon={<FaCalendarCheck size={12} />}
              leadLabel="Backlog lead" projetLabel="Backlog projet"
              leadValue={<span style={{ fontSize: 13 }}>{fmtDate(leadDateFin)}</span>}
              projetValue={<span style={{ fontSize: 13 }}>{fmtDate(projetDateFin)}</span>}
              footer={<div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, color: P.dim }}>Décalage :</span>{decalageJours !== null ? <Delta value={decalageJours} unit="j.ouv." zeroLabel="✓" /> : <span style={{ color: P.dim }}>—</span>}</div>}
            />
            <KpiCard title="Date de début" icon={<FaCalendarAlt size={12} />}
              leadLabel="Backlog lead" projetLabel="Backlog projet"
              leadValue={<span style={{ fontSize: 13 }}>{fmtDate(leadDateDebut)}</span>}
              projetValue={<span style={{ fontSize: 13 }}>{fmtDate(projetDateDebut)}</span>}
            />
          </div>

          {/* Gantt */}
          <div style={card}>
            <div style={sh}><FaCalendarAlt size={13} /> Chronologie comparative — Backlog lead vs Backlog projet</div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {leadLots.length > 0 && <GanttRiche globalStart={ganttStart} globalEnd={ganttEnd} lots={leadLots} compareLots={projetLots} barColor={P.phase} compareColor={P.lot} label="Backlog lead — référence contractuelle tech" labelColor={P.phase} />}
              {projetLots.length > 0 && <GanttRiche globalStart={ganttStart} globalEnd={ganttEnd} lots={projetLots} compareLots={leadLots} barColor={P.lot} compareColor={P.phase} label="Backlog projet — planification en cours" labelColor={P.lot} />}
              {leadLots.length === 0 && projetLots.length === 0 && <div style={{ color: P.dim, fontSize: 12, textAlign: "center", padding: 20, fontStyle: "italic" }}>Aucune donnée de planning disponible.</div>}
              <LegendeGantt />
            </div>
          </div>

          {/* Tableau planning — BACKLOG LEAD vs BACKLOG PROJET */}
          {profils.length > 0 && (
            <div style={card}>
              <div style={sh}><FaUsers size={13} /> Détail JH par profil — Backlog lead vs Backlog projet</div>
              <div style={{ margin: "12px 16px 0", background: "#f0f9ff", border: "1px solid #bae6fd", borderLeft: `3px solid ${P.phase}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#0369a1" }}>
                Ce tableau compare le <strong>backlog lead</strong> (proposition tech, niveau 2) avec le <strong>backlog projet</strong> (planification, niveau 3). Pour la comparaison Offre tech/fin ↔ Backlog lead, voir l'onglet <strong>Marge Commerciale</strong>.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Profil</th>
                      <th style={{ ...th, textAlign: "right", color: P.phase }}>JH backlog lead<br /><span style={{ fontWeight: 400, fontSize: 9 }}>proposition tech · réf. contractuelle</span></th>
                      <th style={{ ...th, textAlign: "right", color: P.lot }}>JH backlog projet<br /><span style={{ fontWeight: 400, fontSize: 9 }}>planifié en exécution</span></th>
                      <th style={{ ...th, textAlign: "center" }}>Marge offre lead<br /><span style={{ fontWeight: 400, fontSize: 9, fontStyle: "italic" }}>lead−projet · +=bien</span></th>
                      <th style={{ ...th, textAlign: "right", color: P.dim }}>JH réalisé<br /><span style={{ fontWeight: 400, fontSize: 9 }}>time_spent · indicatif</span></th>
                      <th style={{ ...th, textAlign: "center" }}>Écart réalisé<br /><span style={{ fontWeight: 400, fontSize: 9, fontStyle: "italic" }}>réalisé−planifié · −=bien</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {profils.map((p, i) => {
                      const vLead = p.volumeLead ?? 0;
                      const vPlan = p.volumeBacklogProjet ?? 0;
                      const vReal = p.volumeProjet ?? 0;
                      return (
                        <tr key={p.id}>
                          <td style={{ ...td(i), fontWeight: 700, color: P.charcoal }}>{p.name}</td>
                          <td style={{ ...td(i), textAlign: "right", color: P.phase, fontWeight: 600 }}>{fmt(vLead,1)} JH</td>
                          <td style={{ ...td(i), textAlign: "right", color: P.lot, fontWeight: 600 }}>{fmt(vPlan,1)} JH</td>
                          <td style={{ ...td(i), textAlign: "center" }}><Delta value={vLead - vPlan} unit="JH" zeroLabel="✓" size="sm" /></td>
                          <td style={{ ...td(i), textAlign: "right", color: P.dim }}>{fmt(vReal,1)} JH</td>
                          <td style={{ ...td(i), textAlign: "center" }}><Delta value={vReal - vPlan} unit="JH" invert zeroLabel="✓" size="sm" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: P.phase, fontWeight: 700, fontSize: 12 }}>{fmt(jhLeadBacklog,1)} JH</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: P.lot, fontWeight: 700, fontSize: 12 }}>{fmt(jhPlanifie,1)} JH</td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}><Delta value={margeOffre} unit="JH" zeroLabel="✓" size="sm" /></td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: P.dim, fontWeight: 700, fontSize: 12 }}>{fmt(jhRealise,1)} JH</td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}><Delta value={ecartRealise} unit="JH" invert zeroLabel="✓" size="sm" /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MARGE PLANNING ═══════════ */}
      {activeTab === "marge_planning" && (() => {
        // ── Calculs des 3 comparaisons ────────────────────────────────────
        // 1. Signé ↔ Offre tech  (lead_tech_fin_details ↔ backlog LEAD)
        const jh_S_vs_O   = jhOffreComm - jhLeadBacklog;
        const mnt_S_vs_O  = budgetOffComm - budgetLeadCalc;
        const taux_S_vs_O = budgetOffComm > 0 ? (mnt_S_vs_O / budgetOffComm) * 100 : 0;

        // 2. Offre tech ↔ Projet  (backlog LEAD ↔ backlog PROJET)
        const jh_O_vs_P   = jhLeadBacklog - jhPlanifie;
        const mnt_O_vs_P  = budgetLeadCalc - factProjet;
        const taux_O_vs_P = budgetLeadCalc > 0 ? (mnt_O_vs_P / budgetLeadCalc) * 100 : 0;

        // 3. Signé ↔ Projet  (lead_tech_fin_details ↔ backlog PROJET)
        const jh_S_vs_P   = jhOffreComm - jhPlanifie;
        const mnt_S_vs_P  = budgetOffComm - factProjet;
        const taux_S_vs_P = budgetOffComm > 0 ? (mnt_S_vs_P / budgetOffComm) * 100 : 0;

        const sections = [
          {
            key: "s_vs_o",
            title: "Signé ↔ Offre technique",
            subtitle: "lead_tech_fin_details vs backlog LEAD",
            desc: "Ce que le commercial a vendu au client vs ce que l'équipe technique a proposé.",
            color: P.offre,
            bg: "#ede9fe",
            border: "#7c3aed44",
            gauche: { label: "Montant signé",    jh: jhOffreComm,    mnt: budgetOffComm,  src: "lead_tech_fin_details" },
            droite: { label: "Budget offre tech", jh: jhLeadBacklog,  mnt: budgetLeadCalc, src: "backlog lead (Σ JH×TJM)" },
            deltaJH: jh_S_vs_O,
            deltaMnt: mnt_S_vs_O,
            tauxPct: taux_S_vs_O,
            positifBon: true,
            hint: "+ = marge commerciale favorable · − = l'offre tech coûte plus que vendu",
            profils: (profils as any[]).map(p => ({
              name: p.name,
              tjm:  p.tjm,
              jhG:  p.volumeOffreCommerciale ?? 0,
              jhD:  p.volumeLead ?? 0,
              mntG: (p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0),
              mntD: p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0),
              deltaJH:  (p.volumeOffreCommerciale ?? 0) - (p.volumeLead ?? 0),
              deltaMnt: ((p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0)) - (p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0)),
            })),
          },
          {
            key: "o_vs_p",
            title: "Offre technique ↔ Projet",
            subtitle: "backlog LEAD vs backlog PROJET",
            desc: "Ce que l'équipe a proposé dans l'offre vs ce qui est réellement planifié en exécution.",
            color: P.phase,
            bg: "#e0f5f7",
            border: "#00848e44",
            gauche: { label: "Budget offre tech",    jh: jhLeadBacklog, mnt: budgetLeadCalc, src: "backlog lead" },
            droite: { label: "Budget backlog projet", jh: jhPlanifie,   mnt: factProjet,     src: "backlog projet (Σ JH×TJM)" },
            deltaJH: jh_O_vs_P,
            deltaMnt: mnt_O_vs_P,
            tauxPct: taux_O_vs_P,
            positifBon: true,
            hint: "+ = projet optimisé vs l'offre technique · − = dépassement planifié",
            profils: (profils as any[]).map(p => ({
              name: p.name,
              tjm:  p.tjm,
              jhG:  p.volumeLead ?? 0,
              jhD:  p.volumeBacklogProjet ?? 0,
              mntG: p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0),
              mntD: (p.volumeBacklogProjet ?? 0) * (p.tjm ?? 0),
              deltaJH:  (p.volumeLead ?? 0) - (p.volumeBacklogProjet ?? 0),
              deltaMnt: (p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0)) - (p.volumeBacklogProjet ?? 0) * (p.tjm ?? 0),
            })),
          },
          {
            key: "s_vs_p",
            title: "Signé ↔ Projet",
            subtitle: "lead_tech_fin_details vs backlog PROJET",
            desc: "Vision globale : ce que le client a payé vs ce que le projet consomme réellement. Marge nette hors charges.",
            color: "#5c6ac4",
            bg: "#eef0fc",
            border: "#5c6ac444",
            gauche: { label: "Montant signé",        jh: jhOffreComm,  mnt: budgetOffComm, src: "lead_tech_fin_details" },
            droite: { label: "Budget backlog projet", jh: jhPlanifie,   mnt: factProjet,    src: "backlog projet (Σ JH×TJM)" },
            deltaJH: jh_S_vs_P,
            deltaMnt: mnt_S_vs_P,
            tauxPct: taux_S_vs_P,
            positifBon: true,
            hint: "+ = marge brute avant charges annexes · − = projet déficitaire",
            profils: (profils as any[]).map(p => ({
              name: p.name,
              tjm:  p.tjm,
              jhG:  p.volumeOffreCommerciale ?? 0,
              jhD:  p.volumeBacklogProjet ?? 0,
              mntG: (p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0),
              mntD: (p.volumeBacklogProjet ?? 0) * (p.tjm ?? 0),
              deltaJH:  (p.volumeOffreCommerciale ?? 0) - (p.volumeBacklogProjet ?? 0),
              deltaMnt: ((p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0)) - (p.volumeBacklogProjet ?? 0) * (p.tjm ?? 0),
            })),
          },
        ];

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Bandeau récap des 3 marges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {sections.map(s => (
                <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 6 }}>
                    {s.title}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>ΔJH</div>
                      <Delta value={s.deltaJH} unit="JH" zeroLabel="✓" />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Δ Montant</div>
                      <Delta value={s.deltaMnt} unit={deviseAbr} zeroLabel="✓" />
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "5px 8px", fontSize: 10, color: "#6b7280", fontStyle: "italic" }}>
                    {s.tauxPct > 0 ? "+" : ""}{fmt(s.tauxPct, 1)} % · {s.hint.split("·")[0].trim()}
                  </div>
                </div>
              ))}
            </div>

            {/* Détail de chaque comparaison */}
            {sections.map(s => (
              <div key={s.key} style={{ background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(34,58,70,.07)", overflow: "hidden" }}>
                {/* En-tête section */}
                <div style={{ background: s.color, color: P.white, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                  <FaBalanceScale size={14} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.desc}</div>
                  </div>
                </div>

                {/* Bandeau synthèse côte-à-côte */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, borderBottom: `1px solid ${P.linen}` }}>
                  {/* Gauche */}
                  <div style={{ padding: "16px 20px", background: s.bg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 }}>{s.gauche.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{s.gauche.src}</div>
                    <div style={{ display: "flex", gap: 24 }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: P.charcoal }}>{fmt(s.gauche.jh, 1)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>JH</span></div>
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{fmt(s.gauche.mnt, 0)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Centre — delta */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 24px", borderLeft: `1px solid ${P.linen}`, borderRight: `1px solid ${P.linen}`, minWidth: 160 }}>
                    <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>Écart</div>
                    <div style={{ marginBottom: 8 }}>
                      <Delta value={s.deltaJH} unit="JH" />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <Delta value={s.deltaMnt} unit={deviseAbr} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: s.tauxPct >= 0 ? P.success : P.tomato }}>
                      {s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %
                    </div>
                    <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center", marginTop: 4, fontStyle: "italic" }}>taux de marge</div>
                  </div>

                  {/* Droite */}
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#5c6ac4", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 }}>{s.droite.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{s.droite.src}</div>
                    <div style={{ display: "flex", gap: 24 }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: P.charcoal }}>{fmt(s.droite.jh, 1)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>JH</span></div>
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#5c6ac4" }}>{fmt(s.droite.mnt, 0)} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barre visuelle de progression */}
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${P.linen}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 5 }}>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.gauche.label}</span>
                    <span style={{ color: "#5c6ac4", fontWeight: 600 }}>{s.droite.label}</span>
                  </div>
                  <div style={{ background: P.linen, borderRadius: 999, height: 12, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      width: `${Math.min(100, s.gauche.mnt > 0 ? (s.droite.mnt / s.gauche.mnt) * 100 : 0)}%`,
                      height: "100%",
                      background: s.deltaMnt >= 0 ? "#5c6ac4" : P.tomato,
                      borderRadius: 999,
                      transition: "width 0.5s",
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, fontStyle: "italic" }}>{s.hint}</div>
                </div>

                {/* Tableau détail par profil */}
                {s.profils.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "left", borderBottom: `1px solid ${P.linen}` }}>Profil</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>TJM</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: s.color, textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>
                            JH {s.gauche.label}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>volume</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: s.color, textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>
                            Montant {s.gauche.label}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>JH × TJM</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5c6ac4", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>
                            JH {s.droite.label}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>volume</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5c6ac4", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>
                            Montant {s.droite.label}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>JH × TJM</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>
                            ΔJH<br /><span style={{ fontWeight: 400, fontSize: 9 }}>+=bien</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>
                            Δ Montant<br /><span style={{ fontWeight: 400, fontSize: 9 }}>+=bien</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>
                            % marge
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.profils.map((p: any, i: number) => {
                          const tauxProfil = p.mntG > 0 ? (p.deltaMnt / p.mntG) * 100 : 0;
                          return (
                            <tr key={i}>
                              <td style={{ padding: "9px 16px", fontSize: 12, fontWeight: 700, color: P.charcoal, background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{p.name}</td>
                              <td style={{ padding: "9px 12px", fontSize: 11, color: "#6b7280", textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.tjm, 0)} {deviseAbr}</td>
                              <td style={{ padding: "9px 12px", fontSize: 12, color: s.color, fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.jhG, 1)}</td>
                              <td style={{ padding: "9px 12px", fontSize: 12, color: s.color, fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.mntG, 0)} {deviseAbr}</td>
                              <td style={{ padding: "9px 12px", fontSize: 12, color: "#5c6ac4", fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.jhD, 1)}</td>
                              <td style={{ padding: "9px 12px", fontSize: 12, color: "#5c6ac4", fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.mntD, 0)} {deviseAbr}</td>
                              <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}><Delta value={p.deltaJH} unit="JH" zeroLabel="✓" size="sm" /></td>
                              <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}><Delta value={p.deltaMnt} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                              <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: tauxProfil >= 0 ? P.success : P.tomato }}>
                                  {tauxProfil >= 0 ? "+" : ""}{fmt(tauxProfil, 1)} %
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                          <td style={{ padding: "10px 16px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL</td>
                          <td />
                          <td style={{ padding: "10px 12px", textAlign: "right", color: s.color, fontWeight: 700 }}>{fmt(s.gauche.jh, 1)} JH</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: s.color, fontWeight: 700 }}>{fmt(s.gauche.mnt, 0)} {deviseAbr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#5c6ac4", fontWeight: 700 }}>{fmt(s.droite.jh, 1)} JH</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#5c6ac4", fontWeight: 700 }}>{fmt(s.droite.mnt, 0)} {deviseAbr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={s.deltaJH} unit="JH" zeroLabel="✓" size="sm" /></td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={s.deltaMnt} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: s.tauxPct >= 0 ? P.success : P.tomato }}>
                              {s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* Note charges annexes pour la 3e comparaison */}
            {chargesAnnexes > 0 && (
              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d55", borderLeft: "4px solid #d97706", borderRadius: 8, padding: "12px 16px", fontSize: 12, color: "#92400e" }}>
                <strong>Note — Charges annexes ({fmt(chargesAnnexes, 0)} {deviseAbr}) :</strong> non incluses dans les budgets JH×TJM ci-dessus.
                La marge nette réelle (Signé ↔ Projet) après charges = <strong style={{ color: mnt_S_vs_P - chargesAnnexes >= 0 ? P.success : P.tomato }}>{fmt(mnt_S_vs_P - chargesAnnexes, 0)} {deviseAbr}</strong> ({fmt(budgetOffComm > 0 ? (mnt_S_vs_P - chargesAnnexes) / budgetOffComm * 100 : 0, 1)} %).
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════ BUDGET ═══════════ */}
      {activeTab === "budget" && (() => {
        // ── Les 3 comparaisons budgétaires (montants) ────────────────────
        // 1. Signé ↔ Offre tech  (lead_tech_fin_details ↔ backlog LEAD)
        const mnt_S_vs_O   = budgetOffComm - budgetLeadCalc;
        const mnt_S_vs_O_c = budgetOffComm - budgetLeadTotal; // avec charges
        const taux_S_vs_O  = budgetOffComm > 0 ? (mnt_S_vs_O_c / budgetOffComm) * 100 : 0;

        // 2. Offre tech ↔ Projet  (backlog LEAD ↔ backlog PROJET)
        const mnt_O_vs_P   = budgetLeadCalc - factProjet;
        const mnt_O_vs_P_c = budgetLeadTotal - coutTotalProjet; // avec charges des deux côtés
        const taux_O_vs_P  = budgetLeadCalc > 0 ? (mnt_O_vs_P / budgetLeadCalc) * 100 : 0;

        // 3. Signé ↔ Projet  (lead_tech_fin_details ↔ backlog PROJET)
        const mnt_S_vs_P   = budgetOffComm - factProjet;
        const mnt_S_vs_P_c = budgetOffComm - coutTotalProjet; // avec charges annexes
        const taux_S_vs_P  = budgetOffComm > 0 ? (mnt_S_vs_P_c / budgetOffComm) * 100 : 0;

        const budgetSections = [
          {
            key: "s_vs_o_b",
            title: "Signé ↔ Offre technique",
            subtitle: "Marge commerciale — lead_tech_fin_details vs budget backlog LEAD",
            desc: "Ce que le commercial a facturé vs le coût de la proposition technique.",
            color: P.offre,
            bg: "#ede9fe",
            border: "#7c3aed44",
            gauche:   { label: "Montant signé",    mnt: budgetOffComm,  jh: jhOffreComm,   src: "lead_tech_fin_details" },
            droite:   { label: "Budget offre tech", mnt: budgetLeadCalc, jh: jhLeadBacklog, src: "Σ JH×TJM backlog lead" },
            deltaHT:  mnt_S_vs_O,
            deltaTTC: mnt_S_vs_O_c,
            charges:  0,
            tauxPct:  taux_S_vs_O,
            hint:     "+ = marge commerciale · − = l'offre tech coûte plus que le contrat",
            profils: profils.map((p: any) => {
              const bLead = p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0);
              const bOffre = (p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0);
              return { name: p.name, tjm: p.tjm, mntG: bOffre, mntD: bLead, delta: bOffre - bLead, taux: bOffre > 0 ? (bOffre - bLead) / bOffre * 100 : 0 };
            }),
          },
          {
            key: "o_vs_p_b",
            title: "Offre technique ↔ Projet",
            subtitle: "Marge de planification — budget backlog LEAD vs budget backlog PROJET",
            desc: "Budget prévu dans l'offre vs coût réellement planifié en exécution.",
            color: P.phase,
            bg: "#e0f5f7",
            border: "#00848e44",
            gauche:   { label: "Budget offre tech",    mnt: budgetLeadCalc,  jh: jhLeadBacklog, src: "Σ JH×TJM backlog lead" },
            droite:   { label: "Budget backlog projet", mnt: factProjet,      jh: jhPlanifie,    src: "Σ JH×TJM backlog projet" },
            deltaHT:  mnt_O_vs_P,
            deltaTTC: mnt_O_vs_P_c,
            charges:  chargesAnnexes,
            tauxPct:  taux_O_vs_P,
            hint:     "+ = projet moins coûteux que prévu · − = dépassement de budget planifié",
            profils: profils.map((p: any) => {
              const bLead = p.budgetBacklogLead ?? (p.volumeLead ?? 0) * (p.tjm ?? 0);
              const bProj = (p.volumeBacklogProjet ?? 0) * (p.tjmProjet ?? p.tjm ?? 0);
              return { name: p.name, tjm: p.tjm, mntG: bLead, mntD: bProj, delta: bLead - bProj, taux: bLead > 0 ? (bLead - bProj) / bLead * 100 : 0 };
            }),
          },
          {
            key: "s_vs_p_b",
            title: "Signé ↔ Projet",
            subtitle: "Marge nette — Montant signé vs coût total projet (JH+charges)",
            desc: "Vision financière complète : ce que rapporte le contrat vs ce qu'il coûte (planifié + charges).",
            color: "#5c6ac4",
            bg: "#eef0fc",
            border: "#5c6ac444",
            gauche:   { label: "Montant signé",        mnt: budgetOffComm,   jh: jhOffreComm, src: "lead_tech_fin_details" },
            droite:   { label: "Coût total projet",     mnt: coutTotalProjet, jh: jhPlanifie,  src: "Σ JH×TJM projet + charges annexes" },
            deltaHT:  mnt_S_vs_P,
            deltaTTC: mnt_S_vs_P_c,
            charges:  chargesAnnexes,
            tauxPct:  taux_S_vs_P,
            hint:     "+ = projet rentable · − = projet déficitaire",
            profils: profils.map((p: any) => {
              const bOffre = (p.volumeOffreCommerciale ?? 0) * (p.tjm ?? 0);
              const bProj  = (p.volumeBacklogProjet ?? 0) * (p.tjmProjet ?? p.tjm ?? 0);
              return { name: p.name, tjm: p.tjm, mntG: bOffre, mntD: bProj, delta: bOffre - bProj, taux: bOffre > 0 ? (bOffre - bProj) / bOffre * 100 : 0 };
            }),
          },
        ];

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Bandeau info */}
            <div style={{ background: "#eff6ff", border: "1px solid #bee3f8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1e40af", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <FaFileInvoiceDollar size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong>3 comparaisons budgétaires</strong> en montants : Signé↔Offre tech (marge commerciale), Offre tech↔Projet (marge de planification), Signé↔Projet (marge nette).
                Les charges annexes ({fmt(chargesAnnexes, 0)} {deviseAbr}) s'ajoutent au coût projet dans les colonnes "avec charges".
              </span>
            </div>

            {/* Récap 3 marges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {budgetSections.map(s => (
                <div key={s.key} style={{ background: s.bg, border: `1px solid ${s.border}`, borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Δ hors charges</div>
                      <Delta value={s.deltaHT} unit={deviseAbr} zeroLabel="✓" />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>Δ avec charges</div>
                      <Delta value={s.deltaTTC} unit={deviseAbr} zeroLabel="✓" />
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 6, padding: "5px 8px", fontSize: 11, fontWeight: 700, color: s.tauxPct >= 0 ? P.success : P.tomato }}>
                    {s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} % · <span style={{ fontWeight: 400, fontSize: 10, color: "#6b7280" }}>{s.hint.split("·")[0].trim()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Analyse visuelle globale (4 niveaux empilés) */}
            <div style={card}>
              <div style={sh}><FaChartBar size={12} /> Cascade budgétaire — 4 niveaux</div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Montant signé (offre commerciale)", value: budgetOffComm, color: P.offre, jh: jhOffreComm, badge: null },
                  { label: "Budget offre tech (backlog lead)", value: budgetLeadCalc, color: P.phase, jh: jhLeadBacklog,
                    badge: { val: mnt_S_vs_O, label: `marge comm. ${mnt_S_vs_O >= 0 ? "+" : ""}${fmt(mnt_S_vs_O, 0)} ${deviseAbr}`, ok: mnt_S_vs_O >= 0 } },
                  { label: "Budget backlog projet (planifié)", value: factProjet, color: P.lot, jh: jhPlanifie,
                    badge: { val: mnt_O_vs_P, label: `marge planif. ${mnt_O_vs_P >= 0 ? "+" : ""}${fmt(mnt_O_vs_P, 0)} ${deviseAbr}`, ok: mnt_O_vs_P >= 0 } },
                  { label: `Charges annexes`, value: chargesAnnexes, color: "#d97706", jh: 0,
                    badge: { val: mnt_S_vs_P_c, label: `marge nette ${mnt_S_vs_P_c >= 0 ? "+" : ""}${fmt(mnt_S_vs_P_c, 0)} ${deviseAbr}`, ok: mnt_S_vs_P_c >= 0 } },
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
                ))}
                {/* Résumé 3 marges */}
                <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Marge commerciale", sub: "Signé − Budget lead", value: mnt_S_vs_O, valueC: mnt_S_vs_O_c, bg: "#ede9fe", color: P.offre },
                    { label: "Marge de planification", sub: "Lead − Budget projet", value: mnt_O_vs_P, valueC: mnt_O_vs_P_c, bg: mnt_O_vs_P >= 0 ? "#f0fdf4" : "#fef2f2", color: mnt_O_vs_P >= 0 ? P.success : P.tomato },
                    { label: "Marge nette", sub: "Signé − (Projet + Charges)", value: mnt_S_vs_P_c, valueC: mnt_S_vs_P_c, bg: mnt_S_vs_P_c >= 0 ? "#f0fdf4" : "#fef2f2", color: mnt_S_vs_P_c >= 0 ? P.success : P.tomato },
                  ].map((m, idx) => (
                    <div key={idx} style={{ background: m.bg, borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 9, color: m.color, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 3 }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: P.dim, marginBottom: 6 }}>{m.sub}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.value >= 0 ? "+" : ""}{fmt(m.value, 0)} {deviseAbr}</div>
                      {m.value !== m.valueC && <div style={{ fontSize: 10, color: P.dim, marginTop: 3 }}>avec charges : <strong style={{ color: m.valueC >= 0 ? P.success : P.tomato }}>{m.valueC >= 0 ? "+" : ""}{fmt(m.valueC, 0)}</strong></div>}
                      <div style={{ fontSize: 10, color: m.color, marginTop: 4, fontWeight: 700 }}>
                        {budgetOffComm > 0 ? `${(m.value / budgetOffComm * 100) >= 0 ? "+" : ""}${fmt(m.value / budgetOffComm * 100, 1)} %` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Détail de chaque comparaison budgétaire */}
            {budgetSections.map(s => (
              <div key={s.key} style={{ background: P.white, border: `1px solid ${P.linen}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(34,58,70,.07)", overflow: "hidden" }}>
                <div style={{ background: s.color, color: P.white, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                  <FaFileInvoiceDollar size={14} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.desc}</div>
                  </div>
                </div>

                {/* Synthèse côte-à-côte */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, borderBottom: `1px solid ${P.linen}` }}>
                  <div style={{ padding: "16px 20px", background: s.bg }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{s.gauche.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{s.gauche.src}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{fmt(s.gauche.mnt, 0)} <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span></div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{fmt(s.gauche.jh, 1)} JH</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 28px", borderLeft: `1px solid ${P.linen}`, borderRight: `1px solid ${P.linen}`, minWidth: 180, gap: 6 }}>
                    <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 4 }}>Écart</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Hors charges</div>
                    <Delta value={s.deltaHT} unit={deviseAbr} />
                    {s.charges > 0 && <>
                      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, marginBottom: 2 }}>Avec charges ({fmt(s.charges, 0)} {deviseAbr})</div>
                      <Delta value={s.deltaTTC} unit={deviseAbr} />
                    </>}
                    <div style={{ fontSize: 13, fontWeight: 800, color: s.tauxPct >= 0 ? P.success : P.tomato, marginTop: 6 }}>
                      {s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %
                    </div>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#5c6ac4", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>{s.droite.label}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{s.droite.src}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#5c6ac4" }}>{fmt(s.droite.mnt, 0)} <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280" }}>{deviseAbr}</span></div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{fmt(s.droite.jh, 1)} JH</div>
                  </div>
                </div>

                {/* Barre visuelle */}
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${P.linen}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginBottom: 5 }}>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.gauche.label} — {fmt(s.gauche.mnt, 0)} {deviseAbr}</span>
                    <span style={{ color: "#5c6ac4", fontWeight: 600 }}>{s.droite.label} — {fmt(s.droite.mnt, 0)} {deviseAbr}</span>
                  </div>
                  <div style={{ background: P.linen, borderRadius: 999, height: 14, overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, width: `${Math.min(100, s.gauche.mnt > 0 ? (s.droite.mnt / s.gauche.mnt) * 100 : 0)}%`, height: "100%", background: s.deltaTTC >= 0 ? "#5c6ac4" : P.tomato, borderRadius: 999, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, fontStyle: "italic" }}>{s.hint}</div>
                </div>

                {/* Tableau par profil */}
                {s.profils.length > 0 && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "left", borderBottom: `1px solid ${P.linen}` }}>Profil</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>TJM</th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: s.color, textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>
                            {s.gauche.label}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>JH×TJM</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5c6ac4", textAlign: "right", borderBottom: `1px solid ${P.linen}` }}>
                            {s.droite.label}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>JH×TJM</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>
                            Δ Montant<br /><span style={{ fontWeight: 400, fontSize: 9 }}>+=bien</span>
                          </th>
                          <th style={{ padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: "#5F6F6E", textAlign: "center", borderBottom: `1px solid ${P.linen}` }}>% marge</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.profils.map((p: any, i: number) => (
                          <tr key={i}>
                            <td style={{ padding: "9px 16px", fontSize: 12, fontWeight: 700, color: P.charcoal, background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{p.name}</td>
                            <td style={{ padding: "9px 12px", fontSize: 11, color: "#6b7280", textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.tjm, 0)} {deviseAbr}</td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: s.color, fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.mntG, 0)} {deviseAbr}</td>
                            <td style={{ padding: "9px 12px", fontSize: 12, color: "#5c6ac4", fontWeight: 600, textAlign: "right", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>{fmt(p.mntD, 0)} {deviseAbr}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}><Delta value={p.delta} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                            <td style={{ padding: "9px 12px", textAlign: "center", background: i % 2 === 0 ? P.white : "#fafbfc", borderBottom: `1px solid ${P.linen}` }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: p.taux >= 0 ? P.success : P.tomato }}>{p.taux >= 0 ? "+" : ""}{fmt(p.taux, 1)} %</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                          <td style={{ padding: "10px 16px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL</td>
                          <td />
                          <td style={{ padding: "10px 12px", textAlign: "right", color: s.color, fontWeight: 700 }}>{fmt(s.gauche.mnt, 0)} {deviseAbr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#5c6ac4", fontWeight: 700 }}>{fmt(s.droite.mnt, 0)} {deviseAbr}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={s.deltaHT} unit={deviseAbr} zeroLabel="✓" size="sm" /></td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: s.tauxPct >= 0 ? P.success : P.tomato }}>{s.tauxPct >= 0 ? "+" : ""}{fmt(s.tauxPct, 1)} %</span>
                          </td>
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
          <div style={{ background: "#eff6ff", border: "1px solid #bee3f8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1e40af", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <FaCoins size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Facturation</strong> = Budget backlog lead ({fmt(factLeadTotal,0)} {deviseAbr} = {fmt(jhLeadBacklog,1)} JH × TJM) — référence contractuelle, indépendante du backlog projet.{" "}
              <strong>Marge brute</strong> = CA encaissé − Facturation lead − Charges annexes.
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={card}>
              <div style={sh}><FaChartLine size={13} /> Progression CA client</div>
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
                  <span style={{ fontSize: 12, color: P.dim }}>Offre signée (objectif)</span>
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
              <div style={sh}><FaTrophy size={13} /> Analyse de marge — CA encaissé</div>
              <div style={{ padding: 18 }}>
                {[
                  { label: "CA encaissé (client)",                                 value: caEncaisse,      color: P.success, bold: false },
                  { label: `− Facturation lead (${fmt(jhLeadBacklog,1)} JH × TJM)`, value: -factLeadTotal, color: P.tomato,  bold: false },
                  { label: "− Charges annexes",                                    value: -chargesAnnexes, color: "#b45309", bold: false },
                  { label: "= Marge brute encaissée",                             value: marge,            color: marge >= 0 ? P.success : P.tomato, bold: true },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${row.bold ? "10px" : "0"} 0 8px`, borderBottom: row.bold ? "none" : `1px solid ${P.linen}`, borderTop: row.bold ? `2px solid ${P.linen}` : "none" }}>
                    <span style={{ fontSize: 12, color: row.bold ? P.charcoal : P.dim, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                    <span style={{ fontSize: row.bold ? 18 : 13, fontWeight: row.bold ? 800 : 600, color: row.color }}>{row.value >= 0 ? "+" : ""}{fmt(row.value,0)} {deviseAbr}</span>
                  </div>
                ))}
                {caEncaisse > 0 && <div style={{ marginTop: 8, fontSize: 12, color: P.dim }}>Taux de marge : <strong style={{ color: marge >= 0 ? P.success : P.tomato }}>{fmt(tauxMarge,1)} %</strong></div>}
              </div>
            </div>
          </div>

          {/* ── Conclusion : Marge nette Signé ↔ Projet (chiffre clé pour ListeProjet) ── */}
          <div style={{
            background: margeNetteSvsP >= 0 ? "#f0fdf4" : "#fef2f2",
            border: `2px solid ${margeNetteSvsP >= 0 ? P.success : P.tomato}`,
            borderRadius: 12, padding: "20px 24px",
            boxShadow: "0 2px 8px rgba(34,58,70,.10)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <FaTrophy size={20} color={margeNetteSvsP >= 0 ? P.success : P.tomato} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: P.charcoal }}>Marge nette réelle — Signé ↔ Projet après charges</div>
                <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>Montant signé − Budget backlog projet − Charges annexes · Référence CA tableau de bord</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Montant signé", value: budgetOffComm, color: P.offre, sub: "lead_tech_fin_details" },
                { label: "− Budget projet", value: -factProjet, color: P.lot, sub: `${fmt(jhPlanifie, 1)} JH × TJM` },
                { label: "− Charges annexes", value: -chargesAnnexes, color: "#d97706", sub: "transport, hébergement…" },
                { label: "= Marge nette", value: margeNetteSvsP, color: margeNetteSvsP >= 0 ? P.success : P.tomato, sub: `${fmt(tauxMargeNetteSvsP, 1)} % du montant signé`, bold: true },
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

            {/* Comparaison avec marge brute encaissée */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderTop: `1px solid ${margeNetteSvsP >= 0 ? "#bbf7d0" : "#fecaca"}`, paddingTop: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: P.dim, fontWeight: 600, marginBottom: 8 }}>Comparaison marge brute vs marge nette</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Marge brute (CA encaissé)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: marge >= 0 ? P.success : P.tomato }}>{marge >= 0 ? "+" : ""}{fmt(marge, 0)} {deviseAbr}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Marge nette (Signé ↔ Projet)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: margeNetteSvsP >= 0 ? P.success : P.tomato }}>{margeNetteSvsP >= 0 ? "+" : ""}{fmt(margeNetteSvsP, 0)} {deviseAbr}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Reste à encaisser</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: resteAEnc > 0 ? "#b45309" : P.success }}>{fmt(resteAEnc, 0)} {deviseAbr}</span>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: P.dim, fontWeight: 600, marginBottom: 8 }}>Indicateurs de rentabilité</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Taux marge nette</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: tauxMargeNetteSvsP >= 0 ? P.success : P.tomato }}>{tauxMargeNetteSvsP >= 0 ? "+" : ""}{fmt(tauxMargeNetteSvsP, 1)} %</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Taux marge brute</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: marge >= 0 ? P.success : P.tomato }}>{caEncaisse > 0 ? `${fmt(tauxMarge, 1)} %` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Taux encaissement</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: tauxEnc >= 100 ? P.success : "#b45309" }}>{fmt(tauxEnc, 1)} %</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, background: "rgba(0,0,0,0.04)", borderRadius: 7, padding: "8px 12px", fontSize: 11, color: P.dim, fontStyle: "italic" }}>
              💡 Ce chiffre (<strong style={{ color: margeNetteSvsP >= 0 ? P.success : P.tomato }}>{margeNetteSvsP >= 0 ? "+" : ""}{fmt(margeNetteSvsP, 0)} {deviseAbr}</strong>) est utilisé comme indicateur de rentabilité dans le tableau de bord ListeProjet (colonne "Rentabilité").
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