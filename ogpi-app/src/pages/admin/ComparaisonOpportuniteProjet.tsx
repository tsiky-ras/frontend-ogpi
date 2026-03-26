/**
 * ComparaisonOpportuniteProjet.tsx
 *
 * ══════════════════════════════════════════════════════════
 *  Palette projet :
 *    Charcoal Blue  #223A46  — headers, titres
 *    Tomato Jam     #C93C29  — danger, accent rouge
 *    Tuscan Sun     #EABF5B  — warn, doré
 *    Dim Grey       #5F6F6E  — texte secondaire
 *    Soft Linen     #E8E5D7  — fond clair, surfaces
 *    Blanc cassé    #fafaf9  — fond app
 *
 *  Icons : react-icons/fa (cohérent avec le reste du projet)
 *
 *  LOGIQUE MÉTIER :
 *    Offre (Lead)  : JH vendus au client (volumeLead)
 *    Planifié      : JH définis dans le backlog projet (volumeBacklogProjet)
 *    Réalisé       : JH effectivement consommés (volumeProjet / time_spent)
 *
 *    Planning  : Marge offre   = JH offre − JH planifié
 *                  > 0 → marge (planifié dans l'enveloppe), < 0 → dépassement offre
 *                Écart réalisé = JH réalisé − JH planifié
 *                  > 0 → retard (surconsommation), < 0 → en avance
 *    Budget    : Facturation = JH planifié projet × TJM (pas le time_spent)
 *                Barre budget = DÉCROISSANTE : part de 100 % (marge pleine)
 *                  et descend vers 0 % à mesure que le planifié consomme l'offre.
 *                  Segment gauche (violet) = planifié consommé
 *                  Segment droit  (vert)   = marge restante
 *    CA        : Paiements reçus du client (projet_ca_encaisse)
 *    Marge     : CA encaissé − Facturation planifiée − Charges annexes
 * ══════════════════════════════════════════════════════════
 */

import React, { useMemo, useState } from "react";
import {
  FaCalendarAlt, FaCalendarCheck, FaChartBar, FaChartLine,
  FaCheckCircle, FaExclamationTriangle, FaArrowRight,
  FaClock, FaLayerGroup, FaColumns, FaFileInvoiceDollar,
  FaUsers, FaCoins, FaTrophy, FaAngleRight, FaInfoCircle, FaTimes,
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
  volumeLead: number;            // JH offre (vendus au client)
  volumeBacklogProjet: number;   // JH planifiés dans le backlog projet
  volumeProjet: number;          // JH réalisés (time_spent)
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
  montantOffreLead?: number;
  deviseAbr?: string;
  calendrier: CalendrierItem[];
  caEncaisse?: number;
}

// ─── Palette projet ───────────────────────────────────────────────────────────

const P = {
  charcoal: "#223A46",
  tomato:   "#C93C29",
  tuscan:   "#EABF5B",
  dim:      "#5F6F6E",
  linen:    "#E8E5D7",
  bg:       "#fafaf9",
  white:    "#ffffff",
  success:  "#2d8f47",
  lot:      "#5c6ac4",
  phase:    "#00848e",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function joursOuvresEntre(a: Date, b: Date): number {
  if (a >= b) return 0;
  let n = 0;
  const d = new Date(a);
  while (d < b) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(s?: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function pct(val: number, base: number): number {
  if (base === 0) return 0;
  return (val / base) * 100;
}

// ─── Légende globale (panneau collapsible) ────────────────────────────────────

const LegendePanneau: React.FC<{ deviseAbr: string }> = ({ deviseAbr }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          border: `1px solid ${P.linen}`,
          borderRadius: 7,
          padding: "6px 14px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          color: P.dim,
        }}
      >
        <FaInfoCircle size={12} color={P.phase} />
        Guide de lecture
        <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            background: P.white,
            border: `1px solid ${P.linen}`,
            borderRadius: 10,
            padding: "18px 20px",
            boxShadow: "0 2px 8px rgba(34,58,70,0.08)",
          }}
        >
          {/* Bouton fermer */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: P.dim,
                padding: 0,
              }}
            >
              <FaTimes size={13} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* ── Col 1 : Les 3 niveaux + les 2 écarts ── */}
            <div>
              {/* Section : 3 niveaux */}
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
                letterSpacing: "0.06em", color: P.dim, marginBottom: 8,
              }}>
                Les 3 niveaux de volume (JH)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                {[
                  { color: P.phase, label: "Offre vendue", sub: "JH vendus au client · périmètre contractuel" },
                  { color: P.lot,   label: "Planifié projet", sub: "JH du backlog · ce qu'on prévoit de faire" },
                  { color: P.dim,   label: "Réalisé (indicatif)", sub: "JH consommés · time_spent · hors facturation", dashed: true },
                ].map(({ color, label, sub, dashed }) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{
                      flexShrink: 0, width: 13, height: 13, marginTop: 2, borderRadius: 3,
                      background: color,
                      border: dashed ? `1.5px dashed ${color}` : "none",
                      opacity: dashed ? 0.7 : 1,
                    }} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: P.charcoal }}>{label}</span>
                      <span style={{ fontSize: 11, color: P.dim, marginLeft: 5 }}>{sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section : 2 écarts */}
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
                letterSpacing: "0.06em", color: P.dim, marginBottom: 8,
              }}>
                Les 2 écarts à surveiller
              </div>

              {/* Marge offre */}
              <div style={{
                border: `1px solid ${P.linen}`, borderRadius: 7,
                overflow: "hidden", marginBottom: 8,
              }}>
                <div style={{
                  background: "#f4f6f7", padding: "7px 11px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: P.charcoal }}>Marge offre</span>
                  <code style={{
                    fontSize: 10, background: P.linen, padding: "1px 6px",
                    borderRadius: 4, color: P.dim,
                  }}>JH offre − JH planifié</code>
                </div>
                <div style={{ padding: "8px 11px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      background: "#d1fae5", color: P.success,
                      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 700,
                    }}>+ X JH</span>
                    <span style={{ fontSize: 11, color: P.dim }}>Dans l'enveloppe → confort</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      background: "#fee2e2", color: P.tomato,
                      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 700,
                    }}>− X JH</span>
                    <span style={{ fontSize: 11, color: P.dim }}>Planifié dépasse l'offre → risque client</span>
                  </div>
                </div>
              </div>

              {/* Écart réalisé */}
              <div style={{
                border: `1px solid ${P.linen}`, borderRadius: 7, overflow: "hidden",
              }}>
                <div style={{
                  background: "#f4f6f7", padding: "7px 11px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: P.charcoal }}>Écart réalisé</span>
                  <code style={{
                    fontSize: 10, background: P.linen, padding: "1px 6px",
                    borderRadius: 4, color: P.dim,
                  }}>JH réalisé − JH planifié</code>
                </div>
                <div style={{ padding: "8px 11px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      background: "#d1fae5", color: P.success,
                      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 700,
                    }}>− X JH</span>
                    <span style={{ fontSize: 11, color: P.dim }}>En avance sur le planifié → économie</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      background: "#fee2e2", color: P.tomato,
                      borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 700,
                    }}>+ X JH</span>
                    <span style={{ fontSize: 11, color: P.dim }}>Surconsommation → retard en cours</span>
                  </div>
                </div>
              </div>

              {/* Note sémantique importante */}
              <div style={{
                marginTop: 10, background: "#fffbeb", border: `1px solid ${P.tuscan}55`,
                borderLeft: `3px solid ${P.tuscan}`, borderRadius: 6, padding: "8px 12px",
                fontSize: 11, color: "#92400e",
              }}>
                <strong>⚠ Attention aux signes :</strong> Un <strong>+</strong> est bon pour la Marge offre,
                mais mauvais pour l'Écart réalisé — et inversement pour le <strong>−</strong>.
                Les chips de couleur (vert / rouge) reflètent toujours la bonne interprétation.
              </div>
            </div>

            {/* ── Col 2 : Barre budget + Gantt + CA ── */}
            <div>
              {/* Section : Barre budget */}
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
                letterSpacing: "0.06em", color: P.dim, marginBottom: 8,
              }}>
                Barre de marge budget (décroissante)
              </div>
              <div style={{ fontSize: 11, color: P.dim, marginBottom: 8 }}>
                Part de 100 % (enveloppe pleine) et descend à mesure que le planifié consomme l'offre.
              </div>

              {/* Exemple barre normale */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: P.dim, marginBottom: 4 }}>
                  Exemple : 60 % planifié, 40 % de marge restante
                </div>
                <div style={{
                  background: P.linen, borderRadius: 999, height: 12,
                  overflow: "hidden", display: "flex",
                }}>
                  <div style={{ width: "60%", background: P.lot, borderRadius: "999px 0 0 999px" }} />
                  <div style={{ width: "40%", background: P.success, opacity: 0.55, borderRadius: "0 999px 999px 0" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: P.lot }} />
                    <span style={{ fontSize: 10, color: P.dim }}>Planifié consommé</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: P.success, opacity: 0.7 }} />
                    <span style={{ fontSize: 10, color: P.dim }}>Marge restante</span>
                  </div>
                </div>
              </div>

              {/* Exemple barre dépassement */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: P.dim, marginBottom: 4 }}>
                  Exemple : dépassement (planifié &gt; offre)
                </div>
                <div style={{
                  background: P.linen, borderRadius: 999, height: 12,
                  overflow: "hidden",
                }}>
                  <div style={{ width: "100%", background: P.tomato, borderRadius: 999 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: P.tomato }} />
                  <span style={{ fontSize: 10, color: P.dim }}>Planifié dépasse l'offre — plus de marge</span>
                </div>
              </div>

              {/* Section : Chronologie Gantt */}
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
                letterSpacing: "0.06em", color: P.dim, marginBottom: 8,
              }}>
                Chronologie Gantt
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {[
                  { color: P.phase, label: "Barre pleine teal", sub: "Planning de l'offre (référence contractuelle)", dashed: false },
                  { color: P.lot,   label: "Barre pleine indigo", sub: "Planning projet réalisé", dashed: false },
                  { color: P.phase, label: "Barre tiretée transparente", sub: "Référence croisée (comparaison)", dashed: true },
                ].map(({ color, label, sub, dashed }) => (
                  <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{
                      flexShrink: 0, marginTop: 4, width: 28, height: 7,
                      background: color, borderRadius: 2,
                      opacity: dashed ? 0.25 : 0.9,
                      border: dashed ? `1px dashed ${color}` : "none",
                    }} />
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: P.charcoal }}>{label}</span>
                      <span style={{ fontSize: 11, color: P.dim, marginLeft: 5 }}>— {sub}</span>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{
                      background: "#d1fae5", color: P.success,
                      borderRadius: 99, padding: "1px 8px", fontSize: 10, fontWeight: 700,
                    }}>+ X j</span>
                    <span style={{ fontSize: 11, color: P.dim }}>Terminé avant la date offre</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{
                      background: "#fee2e2", color: P.tomato,
                      borderRadius: 99, padding: "1px 8px", fontSize: 10, fontWeight: 700,
                    }}>− X j</span>
                    <span style={{ fontSize: 11, color: P.dim }}>Terminé après la date offre (retard)</span>
                  </div>
                </div>
              </div>

              {/* Section : CA & Marge */}
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
                letterSpacing: "0.06em", color: P.dim, marginBottom: 8,
              }}>
                CA & Marge brute
              </div>
              <div style={{
                border: `1px solid ${P.linen}`, borderRadius: 7, overflow: "hidden",
              }}>
                {[
                  {
                    label: "Facturation",
                    formula: "JH planifié × TJM",
                    note: "Base de facturation client — pas le réalisé",
                  },
                  {
                    label: "CA encaissé",
                    formula: "projet_ca_encaisse",
                    note: "Paiements effectivement reçus",
                  },
                  {
                    label: "Marge brute",
                    formula: "CA encaissé − Facturation − Charges",
                    note: "Rentabilité nette du projet",
                  },
                ].map(({ label, formula, note }, i) => (
                  <div
                    key={label}
                    style={{
                      padding: "7px 11px",
                      borderBottom: i < 2 ? `1px solid ${P.linen}` : "none",
                      background: i % 2 === 0 ? P.white : "#fafbfc",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: P.charcoal }}>{label}</span>
                      <code style={{
                        fontSize: 10, background: P.linen, padding: "1px 6px",
                        borderRadius: 4, color: P.dim,
                      }}>{formula}</code>
                    </div>
                    <div style={{ fontSize: 11, color: P.dim, marginTop: 2 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Composants réutilisables ─────────────────────────────────────────────────

const Pill: React.FC<{ color: string; bg: string; children: React.ReactNode }> = ({ color, bg, children }) => (
  <span style={{
    background: bg, color, border: `1px solid ${color}33`,
    borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600,
    display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  }}>{children}</span>
);

const Bar: React.FC<{
  value: number;
  max: number;
  color: string;
  height?: number;
  reversed?: boolean;
}> = ({ value, max, color, height = 8, reversed = false }) => {
  const raw = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const w = reversed ? Math.min(100, Math.max(0, 100 - raw)) : raw;
  return (
    <div style={{ background: P.linen, borderRadius: 999, height, overflow: "hidden" }}>
      <div
        style={{
          width: `${w}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 0.5s ease",
          marginLeft: reversed ? "auto" : 0,
        }}
      />
    </div>
  );
};

const BarBudgetBicolore: React.FC<{
  pctConsomme: number;
  depassement: boolean;
  height?: number;
}> = ({ pctConsomme, depassement, height = 14 }) => {
  const consumed = Math.min(100, pctConsomme);
  const remaining = Math.max(0, 100 - consumed);
  const consumedColor = depassement ? P.tomato : P.lot;

  return (
    <div
      style={{
        background: P.linen,
        borderRadius: 999,
        height,
        overflow: "hidden",
        position: "relative",
        display: "flex",
      }}
    >
      <div
        style={{
          width: `${consumed}%`,
          height: "100%",
          background: consumedColor,
          borderRadius: remaining > 0 ? "999px 0 0 999px" : 999,
          transition: "width 0.5s ease",
          flexShrink: 0,
        }}
      />
      {!depassement && remaining > 0 && (
        <div
          style={{
            width: `${remaining}%`,
            height: "100%",
            background: P.success,
            opacity: 0.55,
            borderRadius: consumed > 0 ? "0 999px 999px 0" : 999,
            transition: "width 0.5s ease",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
};

/**
 * Chip de décalage coloré.
 *
 * Sémantique Planning  (invert=false) :
 *   > 0 → vert  (marge, en avance)
 *   < 0 → rouge (dépassement)
 *
 * Sémantique Budget/Écart réalisé (invert=true) :
 *   > 0 → rouge (retard, surconsommation, dépassement)
 *   < 0 → vert  (économie)
 */
const Delta: React.FC<{
  value: number;
  unit: string;
  invert?: boolean;
  zeroLabel?: string;
  size?: "sm" | "md";
}> = ({ value, unit, invert = false, zeroLabel = "✓ Parfait", size = "md" }) => {
  const isZero = Math.abs(value) < 0.01;
  const isBad  = invert ? value > 0 : value < 0;
  const color  = isZero ? P.success : isBad ? P.tomato : P.success;
  const bg     = isZero ? "#d1fae5" : isBad ? "#fee2e2" : "#d1fae5";
  const sign   = value > 0 ? "+" : "";
  return (
    <span
      title={
        isZero
          ? "Valeur exactement à l'objectif"
          : invert
          ? value > 0
            ? "Dépassement ou retard — valeur supérieure au planifié"
            : "Économie ou avance — valeur inférieure au planifié"
          : value > 0
          ? "Marge disponible — valeur supérieure à l'objectif"
          : "Dépassement — valeur inférieure à l'objectif"
      }
      style={{
        background: bg,
        color,
        borderRadius: 99,
        padding: size === "sm" ? "2px 8px" : "3px 12px",
        fontSize: size === "sm" ? 11 : 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: "default",
      }}
    >
      {isZero
        ? zeroLabel
        : `${sign}${fmt(value, Math.abs(value) < 10 && value % 1 !== 0 ? 1 : 0)} ${unit}`}
    </span>
  );
};

/**
 * Barre de réalisation vs planifié.
 * - Verte si réalisé ≤ planifié (progression normale)
 * - Orange entre 80 % et 100 %
 * - Rouge si réalisé > planifié (retard / dépassement)
 * La barre est capped à 100 % visuellement mais le texte indique le vrai %.
 */
const BarRealisation: React.FC<{
  realise: number;
  planifie: number;
  height?: number;
}> = ({ realise, planifie, height = 8 }) => {
  if (planifie <= 0) return null;
  const ratio = realise / planifie;
  const pctDisplay = Math.min(100, ratio * 100);
  const color =
    ratio > 1 ? P.tomato : ratio >= 0.8 ? P.tuscan : P.success;
  return (
    <div style={{ background: P.linen, borderRadius: 999, height, overflow: "hidden", position: "relative" }}>
      <div
        style={{
          width: `${pctDisplay}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
};

const KpiCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  leadLabel: string;
  leadValue: React.ReactNode;
  projetLabel: string;
  projetValue: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, icon, leadLabel, leadValue, projetLabel, projetValue, footer }) => (
  <div
    style={{
      background: P.white,
      border: `1px solid ${P.linen}`,
      borderRadius: 10,
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(34,58,70,0.07)",
    }}
  >
    <div
      style={{
        background: P.charcoal,
        color: P.white,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ opacity: 0.8 }}>{icon}</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase" as const,
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: "14px 16px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: footer ? 12 : 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              color: P.phase,
              fontWeight: 700,
              marginBottom: 4,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
            }}
          >
            {leadLabel}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: P.charcoal }}>{leadValue}</div>
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              color: P.lot,
              fontWeight: 700,
              marginBottom: 4,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
            }}
          >
            {projetLabel}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: P.charcoal }}>{projetValue}</div>
        </div>
      </div>
      {footer && (
        <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 10 }}>{footer}</div>
      )}
    </div>
  </div>
);

// ─── Légende Gantt inline (remplace l'ancienne légende minimaliste) ───────────

const LegendeGantt: React.FC = () => (
  <div
    style={{
      borderTop: `1px solid ${P.linen}`,
      paddingTop: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}
  >
    {/* Titre section */}
    <div style={{
      fontSize: 10, fontWeight: 700, color: P.dim,
      textTransform: "uppercase" as const, letterSpacing: "0.06em",
    }}>
      Légende du Gantt
    </div>

    {/* Barres */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
      {[
        { color: P.phase,   label: "Offre (planning vendu)",       dashed: false, opacity: 0.85 },
        { color: P.lot,     label: "Projet (planning réalisé)",     dashed: false, opacity: 0.85 },
        { color: P.phase,   label: "Référence croisée (comparaison)", dashed: true, opacity: 0.25 },
      ].map(({ color, label, dashed, opacity }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 22, height: 7, background: color, borderRadius: 2, opacity,
            border: dashed ? `1px dashed ${color}` : "none",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 10, color: P.dim }}>{label}</span>
        </div>
      ))}
    </div>

    {/* Décalages */}
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{
          background: "#d1fae5", color: P.success, borderRadius: 99,
          padding: "1px 7px", fontSize: 10, fontWeight: 700,
        }}>+ X j</span>
        <span style={{ fontSize: 10, color: P.dim }}>Terminé avant la date offre (avance)</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{
          background: "#fee2e2", color: P.tomato, borderRadius: 99,
          padding: "1px 7px", fontSize: 10, fontWeight: 700,
        }}>− X j</span>
        <span style={{ fontSize: 10, color: P.dim }}>Terminé après la date offre (retard)</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: P.tomato, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: P.dim }}>Barre hors période — dépassement de dates</span>
      </div>
    </div>
  </div>
);

// ─── Conclusion Planning ──────────────────────────────────────────────────────

const ConclusionPlanning: React.FC<{
  margeOffre: number;
  decalageJours: number | null;
  ecartRealise: number;
}> = ({ margeOffre, decalageJours, ecartRealise }) => {
  const isParfait = Math.abs(margeOffre) < 0.01 && Math.abs(ecartRealise) < 0.01;
  const enAvance  = ecartRealise < 0;
  const enRetard  = ecartRealise > 0;
  const offreOk   = margeOffre >= 0;

  const isOptimal = !isParfait && offreOk && !enRetard;
  const isRetard  = !offreOk || enRetard;

  const color       = isRetard ? P.tomato : P.success;
  const bgColor     = isRetard ? "#fef2f2" : "#f0fdf4";
  const borderColor = color;

  const jhAbs = fmt(Math.abs(margeOffre), 1);
  const jAbs  = decalageJours !== null ? ` (${fmt(Math.abs(decalageJours), 0)} j.ouv.)` : "";
  const pjAbs = fmt(Math.abs(ecartRealise), 1);

  const titre = isParfait
    ? "Planning parfait — offre, planifié et réalisé alignés"
    : isOptimal
    ? "Planning optimal — dans l'offre et réalisé en avance"
    : "Dépassement planning détecté";

  let corps = "";
  if (isParfait) {
    corps =
      "Le projet a été planifié exactement dans le périmètre de l'offre, et réalisé exactement selon le planifié. Pilotage parfait.";
  } else if (isOptimal) {
    const parts: string[] = [];
    if (margeOffre > 0)
      parts.push(`marge de ${jhAbs} JH entre l'offre et le planifié${jAbs}`);
    if (enAvance)
      parts.push(`${pjAbs} JH économisés vs le planifié (réalisation plus rapide)`);
    corps = `Situation favorable : ${parts.join(", ")}.`;
  } else {
    const parts: string[] = [];
    if (margeOffre < 0)
      parts.push(
        `le planifié dépasse l'offre de ${jhAbs} JH${jAbs} — risque de facturation client`
      );
    if (enRetard)
      parts.push(`la réalisation dépasse le planifié de ${pjAbs} JH — retard en cours`);
    corps = `Dépassement détecté : ${parts.join(" · ")}.`;
  }

  const recommandation = isRetard
    ? "Revoir l'estimation pour les prochains projets. Si le planifié dépasse l'offre, en informer le client et ajuster la facturation."
    : "Capitaliser sur les bonnes pratiques. Le gain de JH peut être réalloué à d'autres phases ou à l'amélioration qualité.";

  const Icon = isRetard ? FaExclamationTriangle : FaCheckCircle;

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}33`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 8,
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: 14, fontWeight: 700, color: P.charcoal }}>{titre}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* ── Marge offre ── */}
        <div
          style={{
            background: margeOffre >= 0 ? "#d1fae5" : "#fee2e2",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div style={{
            fontSize: 10, color: P.dim, fontWeight: 700, marginBottom: 2,
            textTransform: "uppercase" as const, letterSpacing: "0.05em",
          }}>
            Marge offre
          </div>
          <div style={{ fontSize: 11, color: P.dim, marginBottom: 6 }}>
            JH offre − JH planifié projet
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: margeOffre >= 0 ? P.success : P.tomato }}>
              {margeOffre >= 0 ? "+" : ""}
              {fmt(margeOffre, 1)}
            </span>
            <span style={{ fontSize: 12, color: P.dim }}>JH</span>
            {decalageJours !== null && (
              <span style={{ fontSize: 11, color: P.dim, marginLeft: 4 }}>
                ({decalageJours >= 0 ? "+" : ""}{fmt(decalageJours, 0)} j.ouv.)
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: P.dim, marginTop: 4 }}>
            {margeOffre >= 0
              ? "✓ Planifié dans l'enveloppe de l'offre"
              : "⚠ Planifié dépasse l'offre vendue"}
          </div>
          {/* Sous-note sémantique */}
          <div style={{
            marginTop: 6, fontSize: 10, color: margeOffre >= 0 ? "#166534" : "#7f1d1d",
            fontStyle: "italic",
          }}>
            {margeOffre >= 0
              ? "Un + est favorable : il reste de la marge dans l'enveloppe."
              : "Un − est défavorable : le planifié déborde l'offre signée."}
          </div>
        </div>

        {/* ── Écart réalisé ── */}
        <div
          style={{
            background: ecartRealise > 0 ? "#fee2e2" : "#d1fae5",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div style={{
            fontSize: 10, color: P.dim, fontWeight: 700, marginBottom: 2,
            textTransform: "uppercase" as const, letterSpacing: "0.05em",
          }}>
            Écart réalisé
          </div>
          <div style={{ fontSize: 11, color: P.dim, marginBottom: 6 }}>
            JH réalisé − JH planifié
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: ecartRealise > 0 ? P.tomato : P.success }}>
              {ecartRealise > 0 ? "+" : ""}
              {fmt(ecartRealise, 1)}
            </span>
            <span style={{ fontSize: 12, color: P.dim }}>JH</span>
          </div>
          <div style={{ fontSize: 11, color: P.dim, marginTop: 4 }}>
            {ecartRealise < 0
              ? `✓ En avance : ${fmt(Math.abs(ecartRealise), 1)} JH économisés`
              : ecartRealise > 0
              ? `⚠ Retard : ${fmt(ecartRealise, 1)} JH au-delà du planifié`
              : "✓ Exactement dans le planifié"}
          </div>
          {/* Sous-note sémantique inversée */}
          <div style={{
            marginTop: 6, fontSize: 10,
            color: ecartRealise > 0 ? "#7f1d1d" : "#166534",
            fontStyle: "italic",
          }}>
            {ecartRealise > 0
              ? "Un + est défavorable ici : le réalisé dépasse le planifié."
              : ecartRealise < 0
              ? "Un − est favorable ici : le réalisé est inférieur au planifié."
              : "Réalisé exactement conforme au planifié."}
          </div>
        </div>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: 13, color: P.dim, lineHeight: 1.65 }}>{corps}</p>
      <div
        style={{
          borderTop: `1px solid ${borderColor}22`,
          paddingTop: 10,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontSize: 12,
          color: P.dim,
        }}
      >
        <FaArrowRight size={11} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{recommandation}</span>
      </div>
    </div>
  );
};

// ─── GanttRiche ───────────────────────────────────────────────────────────────

const GanttRiche: React.FC<{
  globalStart: Date;
  globalEnd: Date;
  lots: LotPlan[];
  compareLots?: LotPlan[];
  barColor: string;
  compareColor?: string;
  label: string;
  labelColor: string;
}> = ({ globalStart, globalEnd, lots, compareLots, barColor, compareColor, label, labelColor }) => {
  const totalMs = globalEnd.getTime() - globalStart.getTime();
  if (totalMs <= 0)
    return (
      <div style={{ color: P.dim, fontSize: 12, fontStyle: "italic" }}>Pas de données.</div>
    );

  const calcBar = (start?: string | null, end?: string | null) => {
    const s = parseDate(start)?.getTime() ?? globalStart.getTime();
    const e = parseDate(end)?.getTime() ?? globalEnd.getTime();
    const offset = Math.max(0, ((s - globalStart.getTime()) / totalMs) * 100);
    const width = Math.max(
      1,
      ((Math.min(e, globalEnd.getTime()) - Math.max(s, globalStart.getTime())) / totalMs) * 100
    );
    return { offset, width, oob: e > globalEnd.getTime() };
  };

  const sortedLots = [...lots].sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* Label de section avec pastille couleur */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: 2, background: barColor, flexShrink: 0,
        }} />
        <div style={{
          fontSize: 10, color: labelColor, fontWeight: 700,
          letterSpacing: "0.07em", textTransform: "uppercase" as const,
        }}>
          {label}
        </div>
        {compareLots && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 8 }}>
            <div style={{
              width: 14, height: 5, background: compareColor ?? P.phase,
              opacity: 0.3, borderRadius: 2, border: `1px dashed ${compareColor ?? P.phase}`,
            }} />
            <span style={{ fontSize: 9, color: P.dim }}>= référence croisée</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sortedLots.map((lot) => {
          const lb = calcBar(lot.dateDebut, lot.dateFin);
          const compareLot = compareLots?.find((l) => l.order === lot.order);

          let decalJours: number | null = null;
          if (lot.dateFin && compareLot?.dateFin) {
            const pf = parseDate(lot.dateFin)!;
            const lf = parseDate(compareLot.dateFin)!;
            const sign = pf <= lf ? 1 : -1;
            const [a, b] = pf <= lf ? [pf, lf] : [lf, pf];
            decalJours = sign * joursOuvresEntre(a, b);
          }

          return (
            <React.Fragment key={lot.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 120,
                    fontSize: 11,
                    color: P.charcoal,
                    fontWeight: 700,
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <FaLayerGroup size={9} color={barColor} style={{ marginRight: 5 }} />
                  {lot.name}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 16,
                    background: P.linen,
                    borderRadius: 4,
                    position: "relative",
                    overflow: "visible",
                    minWidth: 80,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: `${lb.offset}%`,
                      width: `${lb.width}%`,
                      height: "100%",
                      background: barColor,
                      opacity: 0.85,
                      borderRadius: 4,
                      outline: lb.oob ? `2px solid ${P.tomato}` : "none",
                    }}
                  />
                  {compareLot &&
                    (() => {
                      const cb = calcBar(compareLot.dateDebut, compareLot.dateFin);
                      return (
                        <div
                          title="Référence croisée — planning de l'autre source"
                          style={{
                            position: "absolute",
                            left: `${cb.offset}%`,
                            width: `${cb.width}%`,
                            height: "100%",
                            background: compareColor ?? P.phase,
                            opacity: 0.25,
                            borderRadius: 4,
                            border: `1px dashed ${compareColor ?? P.phase}`,
                            cursor: "help",
                          }}
                        />
                      );
                    })()}
                </div>
                <div style={{ width: 180, display: "flex", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: P.dim, whiteSpace: "nowrap" }}>
                    {fmtDate(lot.dateDebut)} → {fmtDate(lot.dateFin)}
                  </span>
                </div>
                <div style={{ width: 80, flexShrink: 0, textAlign: "right" }}>
                  {decalJours !== null ? (
                    <span
                      title={
                        decalJours > 0
                          ? `Terminé ${decalJours} j.ouv. avant la date de l'offre`
                          : decalJours < 0
                          ? `Terminé ${Math.abs(decalJours)} j.ouv. après la date de l'offre (retard)`
                          : "Dates identiques"
                      }
                      style={{
                        fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 7px",
                        background: decalJours > 0 ? "#d1fae5" : decalJours < 0 ? "#fee2e2" : "#f0fdf4",
                        color: decalJours > 0 ? P.success : decalJours < 0 ? P.tomato : P.success,
                        cursor: "help",
                      }}
                    >
                      {decalJours > 0 ? "+" : ""}
                      {fmt(decalJours, 0)} j
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: P.dim }}>—</span>
                  )}
                </div>
              </div>
              {lot.phases.map((ph) => {
                const pb = calcBar(ph.dateDebut, ph.dateFin);
                const comparePh = compareLot?.phases.find((p) => p.order === ph.order);
                let dPh: number | null = null;
                if (ph.dateFin && comparePh?.dateFin) {
                  const pf2 = parseDate(ph.dateFin)!;
                  const lf2 = parseDate(comparePh.dateFin)!;
                  const sign = pf2 <= lf2 ? 1 : -1;
                  const [a, b] = pf2 <= lf2 ? [pf2, lf2] : [lf2, pf2];
                  dPh = sign * joursOuvresEntre(a, b);
                }
                return (
                  <div
                    key={ph.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 14 }}
                  >
                    <div
                      style={{
                        width: 106,
                        fontSize: 10,
                        color: P.dim,
                        flexShrink: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <FaColumns size={8} style={{ marginRight: 4, opacity: 0.5 }} />
                      {ph.name}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        background: P.linen,
                        borderRadius: 4,
                        position: "relative",
                        overflow: "visible",
                        minWidth: 80,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: `${pb.offset}%`,
                          width: `${pb.width}%`,
                          height: "100%",
                          background: barColor,
                          opacity: 0.5,
                          borderRadius: 4,
                        }}
                      />
                      {comparePh &&
                        (() => {
                          const cpb = calcBar(comparePh.dateDebut, comparePh.dateFin);
                          return (
                            <div
                              title="Référence croisée — planning de l'autre source"
                              style={{
                                position: "absolute",
                                left: `${cpb.offset}%`,
                                width: `${cpb.width}%`,
                                height: "100%",
                                background: compareColor ?? P.phase,
                                opacity: 0.2,
                                borderRadius: 4,
                                border: `1px dashed ${compareColor ?? P.phase}`,
                                cursor: "help",
                              }}
                            />
                          );
                        })()}
                    </div>
                    <div style={{ width: 180, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, color: P.dim, whiteSpace: "nowrap" }}>
                        {fmtDate(ph.dateDebut)} → {fmtDate(ph.dateFin)}
                      </span>
                    </div>
                    <div style={{ width: 80, flexShrink: 0, textAlign: "right" }}>
                      {dPh !== null ? (
                        <span
                          title={
                            dPh > 0
                              ? `Terminée ${dPh} j.ouv. avant la date de l'offre`
                              : dPh < 0
                              ? `Terminée ${Math.abs(dPh)} j.ouv. après la date de l'offre (retard)`
                              : "Dates identiques"
                          }
                          style={{
                            fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 7px",
                            background: dPh > 0 ? "#d1fae5" : dPh < 0 ? "#fee2e2" : "#f0fdf4",
                            color: dPh > 0 ? P.success : dPh < 0 ? P.tomato : P.success,
                            cursor: "help",
                          }}
                        >
                          {dPh > 0 ? "+" : ""}
                          {fmt(dPh, 0)} j
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: P.dim }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          paddingLeft: 128,
          paddingRight: 268,
        }}
      >
        <span style={{ fontSize: 9, color: P.dim }}>{fmtDate(globalStart.toISOString())}</span>
        <span style={{ fontSize: 9, color: P.dim }}>{fmtDate(globalEnd.toISOString())}</span>
      </div>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const ComparaisonOpportuniteProjet: React.FC<ComparaisonProps> = ({
  leadLots,
  leadDateDebut,
  leadDateFin,
  projetLots,
  projetDateDebut,
  projetDateFin,
  profils,
  chargesAnnexes = 0,
  montantOffreLead = 0,
  deviseAbr = "€",
  calendrier,
  caEncaisse = 0,
}) => {
  const [activeTab, setActiveTab] = useState<"planning" | "budget" | "ca">("planning");

  // ── PLANNING ──────────────────────────────────────────────────────────────
  const jhOffre    = useMemo(() => profils.reduce((s, p) => s + p.volumeLead,          0), [profils]);
  const jhPlanifie = useMemo(() => profils.reduce((s, p) => s + p.volumeBacklogProjet, 0), [profils]);
  const jhRealise  = useMemo(() => profils.reduce((s, p) => s + p.volumeProjet,        0), [profils]);

  const margeOffre   = jhOffre - jhPlanifie;
  const ecartRealise = jhRealise - jhPlanifie;

  const leadEndDate   = parseDate(leadDateFin);
  const projetEndDate = parseDate(projetDateFin);
  const decalageJours = useMemo<number | null>(() => {
    if (!leadEndDate || !projetEndDate) return null;
    const sign = projetEndDate <= leadEndDate ? 1 : -1;
    const [a, b] =
      projetEndDate <= leadEndDate
        ? [projetEndDate, leadEndDate]
        : [leadEndDate, projetEndDate];
    return sign * joursOuvresEntre(a, b);
  }, [leadEndDate, projetEndDate]);

  const allDates = [
    leadDateDebut, leadDateFin, projetDateDebut, projetDateFin,
    ...leadLots.flatMap((l) => [l.dateDebut, l.dateFin, ...l.phases.flatMap((p) => [p.dateDebut, p.dateFin])]),
    ...projetLots.flatMap((l) => [l.dateDebut, l.dateFin, ...l.phases.flatMap((p) => [p.dateDebut, p.dateFin])]),
  ].map(parseDate).filter(Boolean) as Date[];

  const ganttStart = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const ganttEnd   = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : new Date();

  // ── BUDGET / FACTURATION ─────────────────────────────────────────────────
  const factOffre  = useMemo(() => profils.reduce((s, p) => s + p.volumeLead          * p.tjm, 0), [profils]);
  const factProjet = useMemo(() => profils.reduce((s, p) => s + p.volumeBacklogProjet * p.tjm, 0), [profils]);

  const depassementBudget = factProjet - factOffre;
  const margeBudget       = factOffre - factProjet;
  const pctBudgetConsomme = pct(factProjet, factOffre || 1);

  // ── CA ────────────────────────────────────────────────────────────────────
  const caPlanifie = useMemo(
    () => calendrier
      .filter((c) => c.statut === "EN_ATTENTE" || c.statut === "PARTIELLEMENT_PAYE")
      .reduce((s, c) => s + c.montantAPayer, 0),
    [calendrier]
  );
  const caPotentiel      = caEncaisse + caPlanifie;
  const tauxEncaissement = pct(caEncaisse, montantOffreLead);
  const tauxCouverture   = pct(caPotentiel, montantOffreLead);
  const resteAEncaisser  = Math.max(0, montantOffreLead - caEncaisse);
  const marge            = caEncaisse - factProjet - chargesAnnexes;
  const tauxMarge        = pct(marge, caEncaisse);

  // ── Styles partagés ───────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: P.white,
    border: `1px solid ${P.linen}`,
    borderRadius: 10,
    boxShadow: "0 1px 4px rgba(34,58,70,0.07)",
  };
  const sectionHeader: React.CSSProperties = {
    background: P.charcoal,
    color: P.white,
    padding: "10px 16px",
    fontSize: 12,
    fontWeight: 700,
    borderRadius: "10px 10px 0 0",
    display: "flex",
    alignItems: "center",
    gap: 8,
  };
  const th: React.CSSProperties = {
    padding: "9px 12px",
    fontSize: 11,
    fontWeight: 600,
    background: "#f4f6f7",
    color: P.dim,
    textAlign: "left",
    borderBottom: `1px solid ${P.linen}`,
  };
  const getTd = (i: number): React.CSSProperties => ({
    padding: "9px 12px",
    fontSize: 12,
    background: i % 2 === 0 ? P.white : "#fafbfc",
    borderBottom: `1px solid ${P.linen}`,
    verticalAlign: "middle",
  });

  const tabs = [
    { key: "planning" as const, label: "Planning",   icon: <FaCalendarAlt size={12} /> },
    { key: "budget"   as const, label: "Budget",     icon: <FaChartBar    size={12} /> },
    { key: "ca"       as const, label: "CA & Marge", icon: <FaChartLine   size={12} /> },
  ];

  return (
    <div style={{ fontFamily: "inherit", background: P.bg, padding: "4px 0" }}>

      {/* ── En-tête ── */}
      <div
        style={{
          background: P.charcoal,
          borderRadius: 10,
          padding: "18px 24px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 2px 8px rgba(34,58,70,0.15)",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0, fontSize: 18, fontWeight: 800,
              color: P.white, letterSpacing: "-0.01em",
            }}
          >
            Comparaison Offre ↔ Planifié ↔ Réalisé
          </h2>
          <p style={{ margin: "5px 0 0", fontSize: 12, color: "rgba(232,229,215,0.7)" }}>
            Marge offre · Écart réalisé · Facturation (JH planifié × TJM) · CA client encaissé
          </p>
        </div>
        {/* Pills de légende dans l'en-tête */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: P.phase }} />
            <Pill color={P.phase} bg="#e0f5f7">Offre (vendu au client)</Pill>
          </div>
          <FaAngleRight size={12} color="rgba(232,229,215,0.5)" />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: P.lot }} />
            <Pill color="#7c3aed" bg="#ede9fe">Planifié projet (backlog)</Pill>
          </div>
          <FaAngleRight size={12} color="rgba(232,229,215,0.5)" />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: P.dim, opacity: 0.7 }} />
            <Pill color={P.dim} bg={`${P.linen}`}>Réalisation</Pill>
          </div>
        </div>
      </div>

      {/* ── Guide de lecture collapsible ── */}
      <LegendePanneau deviseAbr={deviseAbr} />

      {/* ── KPIs synthèse ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            icon: <FaClock size={11} />,
            label: "MARGE OFFRE",
            sub: `JH offre (${fmt(jhOffre, 1)}) − JH planifié (${fmt(jhPlanifie, 1)})`,
            hint: "+ = favorable · − = dépassement offre",
            accentColor: margeOffre >= 0 ? P.success : P.tomato,
            content: <Delta value={margeOffre} unit="JH" zeroLabel="✓ Conforme" />,
          },
          {
            icon: <FaCalendarCheck size={11} />,
            label: "ÉCART RÉALISÉ",
            sub: `JH réalisé (${fmt(jhRealise, 1)}) − JH planifié (${fmt(jhPlanifie, 1)})`,
            hint: "− = favorable (avance) · + = retard",
            accentColor: ecartRealise > 0 ? P.tomato : P.success,
            content: (
              <Delta value={ecartRealise} unit="JH" invert={true} zeroLabel="✓ Dans le planifié" />
            ),
          },
          {
            icon: <FaFileInvoiceDollar size={11} />,
            label: "DÉPASSEMENT BUDGET",
            sub: "Facturation planifiée vs offre",
            hint: "+ = planifié > offre · − = dans l'enveloppe",
            accentColor: depassementBudget > 0 ? P.tomato : P.success,
            content: (
              <Delta value={depassementBudget} unit={deviseAbr} invert zeroLabel="✓ Dans l'offre" />
            ),
          },
          {
            icon: <FaCoins size={11} />,
            label: "TAUX ENCAISSEMENT",
            sub: "CA client reçu / offre signée",
            hint: "≥ 80 % = bon · < 50 % = attention",
            accentColor: P.tuscan,
            content: (
              <span style={{
                fontSize: 20, fontWeight: 800,
                color: tauxEncaissement >= 80 ? P.success : tauxEncaissement >= 50 ? "#b45309" : P.tomato,
              }}>
                {fmt(tauxEncaissement, 1)} %
              </span>
            ),
          },
          {
            icon: <FaTrophy size={11} />,
            label: "MARGE BRUTE",
            sub: "CA encaissé − Facturation − Charges",
            hint: "+ = projet rentable · − = déficitaire",
            accentColor: marge >= 0 ? P.success : P.tomato,
            content: (
              <span style={{ fontSize: 20, fontWeight: 800, color: marge >= 0 ? P.success : P.tomato }}>
                {marge >= 0 ? "+" : ""}{fmt(marge, 0)} {deviseAbr}
              </span>
            ),
          },
        ].map((k, i) => (
          <div
            key={i}
            style={{ ...card, padding: "14px 16px", borderLeft: `4px solid ${k.accentColor}` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ color: P.dim }}>{k.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: P.dim,
                letterSpacing: "0.07em", textTransform: "uppercase" as const,
              }}>
                {k.label}
              </span>
            </div>
            <div style={{ fontSize: 10, color: P.dim, marginBottom: 6 }}>{k.sub}</div>
            {k.content}
            {/* Hint sémantique sous le KPI */}
            <div style={{
              marginTop: 6, fontSize: 9, color: P.dim,
              fontStyle: "italic", opacity: 0.8,
            }}>
              {k.hint}
            </div>
          </div>
        ))}
      </div>

      {/* ── Onglets ── */}
      <div
        style={{
          background: P.white,
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${P.linen}`,
          marginBottom: 16,
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(34,58,70,0.05)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: activeTab === t.key ? P.charcoal : "transparent",
              color: activeTab === t.key ? P.white : P.dim,
              border: "none",
              borderRadius: 6,
              padding: "7px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ PLANNING ═══════════ */}
      {activeTab === "planning" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <ConclusionPlanning
            margeOffre={margeOffre}
            decalageJours={decalageJours}
            ecartRealise={ecartRealise}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <KpiCard
              title="Volume JH"
              icon={<FaUsers size={12} />}
              leadLabel={`Offre vendue (${fmt(jhOffre, 1)} JH)`}
              projetLabel={`Planifié projet (${fmt(jhPlanifie, 1)} JH)`}
              leadValue={<>{fmt(jhOffre, 1)} <span style={{ fontSize: 11, color: P.dim }}>JH</span></>}
              projetValue={<>{fmt(jhPlanifie, 1)} <span style={{ fontSize: 11, color: P.dim }}>JH</span></>}
              footer={
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: P.dim, minWidth: 130 }}>
                      JH réalisé (indicatif) :
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: P.dim }}>
                      {fmt(jhRealise, 1)} JH
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: P.dim, minWidth: 130 }}>
                      Marge offre
                      <span style={{ fontSize: 9, fontStyle: "italic", marginLeft: 3 }}>(+ = bien)</span> :
                    </span>
                    <Delta value={margeOffre} unit="JH" zeroLabel="✓" size="sm" />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: P.dim, minWidth: 130 }}>
                      Écart réalisé
                      <span style={{ fontSize: 9, fontStyle: "italic", marginLeft: 3 }}>(− = bien)</span> :
                    </span>
                    <Delta value={ecartRealise} unit="JH" invert={true} zeroLabel="✓" size="sm" />
                  </div>
                </div>
              }
            />
            <KpiCard
              title="Date de fin"
              icon={<FaCalendarCheck size={12} />}
              leadLabel="Prévue (offre)"
              projetLabel="Réelle (projet)"
              leadValue={<span style={{ fontSize: 13 }}>{fmtDate(leadDateFin)}</span>}
              projetValue={<span style={{ fontSize: 13 }}>{fmtDate(projetDateFin)}</span>}
              footer={
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Décalage dates :</span>
                    {decalageJours !== null ? (
                      <Delta value={decalageJours} unit="j.ouv." zeroLabel="✓ Parfait" />
                    ) : (
                      <span style={{ color: P.dim }}>—</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: P.dim, fontStyle: "italic" }}>
                    + = projet terminé avant l'offre · − = après (retard)
                  </div>
                </div>
              }
            />
            <KpiCard
              title="Date de début"
              icon={<FaCalendarAlt size={12} />}
              leadLabel="Prévue (offre)"
              projetLabel="Réelle (projet)"
              leadValue={<span style={{ fontSize: 13 }}>{fmtDate(leadDateDebut)}</span>}
              projetValue={<span style={{ fontSize: 13 }}>{fmtDate(projetDateDebut)}</span>}
            />
          </div>

          {/* Gantt enrichi */}
          <div style={card}>
            <div style={sectionHeader}>
              <FaCalendarAlt size={13} /> Chronologie comparative
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  paddingBottom: 4, borderBottom: `1px solid ${P.linen}`,
                }}
              >
                <div style={{ width: 120, fontSize: 9, fontWeight: 700, color: P.dim, textTransform: "uppercase" as const, letterSpacing: "0.06em", flexShrink: 0 }}>Élément</div>
                <div style={{ flex: 1, fontSize: 9, fontWeight: 700, color: P.dim, textTransform: "uppercase" as const, letterSpacing: "0.06em", minWidth: 80 }}>Timeline</div>
                <div style={{ width: 180, fontSize: 9, fontWeight: 700, color: P.dim, textTransform: "uppercase" as const, letterSpacing: "0.06em", flexShrink: 0 }}>Début → Fin</div>
                <div style={{ width: 80, fontSize: 9, fontWeight: 700, color: P.dim, textTransform: "uppercase" as const, letterSpacing: "0.06em", flexShrink: 0, textAlign: "right" }}>
                  Décalage
                  <div style={{ fontWeight: 400, fontStyle: "italic", fontSize: 8, marginTop: 1 }}>+ = avance · − = retard</div>
                </div>
              </div>

              {leadLots.length > 0 && (
                <GanttRiche
                  globalStart={ganttStart}
                  globalEnd={ganttEnd}
                  lots={leadLots}
                  compareLots={projetLots}
                  barColor={P.phase}
                  compareColor={P.lot}
                  label="Offre — planning vendu au client"
                  labelColor={P.phase}
                />
              )}

              {(leadLots.length > 0 || projetLots.length > 0) && (
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <div style={{ flex: 1, borderTop: `1px dashed ${P.linen}` }} />
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: P.white,
                      border: `1px solid ${ecartRealise > 0 ? P.tomato : P.success}44`,
                      borderRadius: 20, padding: "5px 14px",
                      boxShadow: "0 1px 4px rgba(34,58,70,0.08)",
                      flexShrink: 0, margin: "0 12px",
                    }}
                  >
                    {/* Écart réalisé */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: P.dim, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 2 }}>
                        Écart réalisé
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 800,
                        color: ecartRealise > 0 ? P.tomato : ecartRealise < 0 ? P.success : P.dim,
                      }}>
                        {ecartRealise > 0 ? "+" : ""}{fmt(ecartRealise, 1)} JH
                      </span>
                      <div style={{ fontSize: 9, color: P.dim, marginTop: 1 }}>
                        {ecartRealise < 0 ? "✓ en avance" : ecartRealise > 0 ? "⚠ retard" : "✓ exact"}
                      </div>
                      <div style={{ fontSize: 8, color: P.dim, fontStyle: "italic", marginTop: 1 }}>
                        {ecartRealise > 0 ? "(+ = défavorable)" : "(− = favorable)"}
                      </div>
                    </div>
                    {decalageJours !== null && (
                      <div style={{ width: 1, height: 40, background: P.linen }} />
                    )}
                    {decalageJours !== null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: P.dim, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 2 }}>
                          Décalage dates
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 800,
                          color: decalageJours < 0 ? P.tomato : decalageJours > 0 ? P.success : P.dim,
                        }}>
                          {decalageJours > 0 ? "+" : ""}{fmt(decalageJours, 0)} j.ouv.
                        </span>
                        <div style={{ fontSize: 9, color: P.dim, marginTop: 1 }}>
                          {decalageJours > 0 ? "✓ avant échéance" : decalageJours < 0 ? "⚠ après échéance" : "✓ exact"}
                        </div>
                        <div style={{ fontSize: 8, color: P.dim, fontStyle: "italic", marginTop: 1 }}>
                          {decalageJours > 0 ? "(+ = avance)" : "(− = retard)"}
                        </div>
                      </div>
                    )}
                    <div style={{ width: 1, height: 40, background: P.linen }} />
                    {/* Marge offre */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: P.dim, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 2 }}>
                        Marge offre
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 800,
                        color: margeOffre < 0 ? P.tomato : margeOffre > 0 ? P.success : P.dim,
                      }}>
                        {margeOffre > 0 ? "+" : ""}{fmt(margeOffre, 1)} JH
                      </span>
                      <div style={{ fontSize: 9, color: P.dim, marginTop: 1 }}>
                        {margeOffre > 0 ? "✓ dans l'offre" : margeOffre < 0 ? "⚠ hors offre" : "✓ exact"}
                      </div>
                      <div style={{ fontSize: 8, color: P.dim, fontStyle: "italic", marginTop: 1 }}>
                        {margeOffre >= 0 ? "(+ = favorable)" : "(− = dépassement)"}
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, borderTop: `1px dashed ${P.linen}` }} />
                </div>
              )}

              {projetLots.length > 0 && (
                <GanttRiche
                  globalStart={ganttStart}
                  globalEnd={ganttEnd}
                  lots={projetLots}
                  compareLots={leadLots}
                  barColor={P.lot}
                  compareColor={P.phase}
                  label="Projet — planning réalisé"
                  labelColor={P.lot}
                />
              )}

              {leadLots.length === 0 && projetLots.length === 0 && (
                <div style={{ color: P.dim, fontSize: 12, textAlign: "center", padding: 20, fontStyle: "italic" }}>
                  Aucune donnée de planning disponible.
                </div>
              )}

              {/* Légende Gantt enrichie */}
              <LegendeGantt />
            </div>
          </div>

          {/* Tableau récap JH par profil */}
          {profils.length > 0 && projetLots.length > 0 && (
            <div style={card}>
              <div style={sectionHeader}>
                <FaUsers size={13} /> Détail JH par profil — Offre / Planifié / Réalisé
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Profil</th>
                      <th style={{ ...th, textAlign: "right", color: P.phase }}>
                        JH offre <span style={{ fontWeight: 400, fontSize: 9 }}>(vendu)</span>
                      </th>
                      <th style={{ ...th, textAlign: "right", color: "#7c3aed" }}>
                        JH planifié <span style={{ fontWeight: 400, fontSize: 9 }}>(backlog projet)</span>
                      </th>
                      <th style={{ ...th, textAlign: "right", color: P.dim }}>
                        JH réalisé <span style={{ fontWeight: 400, fontSize: 9 }}>(indicatif)</span>
                      </th>
                      <th style={{ ...th, textAlign: "center" }}>
                        Marge offre
                        <div style={{ fontWeight: 400, fontSize: 9, fontStyle: "italic" }}>offre − planifié · + = bien</div>
                      </th>
                      <th style={{ ...th, textAlign: "center" }}>
                        Écart réalisé
                        <div style={{ fontWeight: 400, fontSize: 9, fontStyle: "italic" }}>réalisé − planifié · − = bien</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {profils.map((p, i) => {
                      const mOff  = p.volumeLead - p.volumeBacklogProjet;
                      const eReal = p.volumeProjet - p.volumeBacklogProjet;
                      return (
                        <tr key={p.id}>
                          <td style={{ ...getTd(i), fontWeight: 700, color: P.charcoal }}>{p.name}</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: P.phase, fontWeight: 600 }}>{fmt(p.volumeLead, 1)} JH</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: "#7c3aed", fontWeight: 600 }}>{fmt(p.volumeBacklogProjet, 1)} JH</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: P.dim }}>{fmt(p.volumeProjet, 1)} JH</td>
                          <td style={{ ...getTd(i), textAlign: "center" }}>
                            <Delta value={mOff} unit="JH" zeroLabel="✓" size="sm" />
                          </td>
                          <td style={{ ...getTd(i), textAlign: "center" }}>
                            <Delta value={eReal} unit="JH" invert={true} zeroLabel="✓" size="sm" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: P.phase, fontWeight: 700, fontSize: 12 }}>{fmt(jhOffre, 1)} JH</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: "#7c3aed", fontWeight: 700, fontSize: 12 }}>{fmt(jhPlanifie, 1)} JH</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: P.dim, fontWeight: 700, fontSize: 12 }}>{fmt(jhRealise, 1)} JH</td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}><Delta value={margeOffre} unit="JH" zeroLabel="✓" size="sm" /></td>
                      <td style={{ padding: "9px 12px", textAlign: "center" }}><Delta value={ecartRealise} unit="JH" invert={true} zeroLabel="✓" size="sm" /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ BUDGET ═══════════ */}
      {activeTab === "budget" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Note explicative budget */}
          <div
            style={{
              background: "#eff6ff", border: "1px solid #bee3f8", borderRadius: 8,
              padding: "10px 14px", fontSize: 12, color: "#1e40af",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}
          >
            <FaFileInvoiceDollar size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              La <strong>facturation externe</strong> est basée sur le{" "}
              <strong>JH planifié × TJM</strong>. Le JH réalisé (time_spent) est affiché à titre
              indicatif uniquement et n'entre pas dans la facturation.{" "}
              <strong>Barre de marge budget</strong> : segment{" "}
              <span style={{ color: P.lot, fontWeight: 700 }}>indigo</span> = planifié consommé ·
              segment <span style={{ color: P.success, fontWeight: 700 }}>vert</span> = marge restante.
              La barre est <strong>décroissante</strong> : 100 % = enveloppe pleine, 0 % = plus de marge.
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <KpiCard
              title="Facturation totale"
              icon={<FaFileInvoiceDollar size={12} />}
              leadLabel={`Offre vendue · ${fmt(jhOffre, 1)} JH`}
              projetLabel={`Planifié projet · ${fmt(jhPlanifie, 1)} JH`}
              leadValue={<>{fmt(factOffre, 0)} <span style={{ fontSize: 11, color: P.dim }}>{deviseAbr}</span></>}
              projetValue={<>{fmt(factProjet, 0)} <span style={{ fontSize: 11, color: P.dim }}>{deviseAbr}</span></>}
              footer={
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: P.dim }}>Dépassement budget :</span>
                    <Delta value={depassementBudget} unit={deviseAbr} invert zeroLabel="✓ Dans l'offre" />
                  </div>
                  <div style={{ fontSize: 10, color: P.dim, fontStyle: "italic" }}>
                    + = planifié dépasse l'offre · − = dans l'enveloppe
                  </div>
                </div>
              }
            />

            {/* Barre budget bicolore */}
            <div style={card}>
              <div style={sectionHeader}>
                <FaChartBar size={12} /> Marge budget restante
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: P.dim }}>
                  <span style={{ color: depassementBudget > 0 ? P.tomato : P.lot }}>
                    Consommé ({fmt(pctBudgetConsomme, 1)} %)
                  </span>
                  <span style={{ color: P.success }}>
                    Marge restante ({fmt(Math.max(0, 100 - pctBudgetConsomme), 1)} %)   
                  </span>
                </div>
                <BarBudgetBicolore
                  pctConsomme={pctBudgetConsomme}
                  depassement={depassementBudget > 0}
                  height={14}
                />
                {/* Légende inline sous la barre */}
                <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: depassementBudget > 0 ? P.tomato : P.lot }} />
                    <span style={{ fontSize: 9, color: P.dim }}>Planifié consommé</span>
                  </div>
                  {!depassementBudget && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 9, height: 9, borderRadius: 2, background: P.success, opacity: 0.7 }} />
                      <span style={{ fontSize: 9, color: P.dim }}>Marge restante</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: P.dim }}>Planifié</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: depassementBudget > 0 ? P.tomato : P.charcoal }}>
                      {fmt(pctBudgetConsomme, 1)} %
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: P.dim }}>Marge restante</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: margeBudget >= 0 ? P.success : P.tomato }}>
                      {margeBudget >= 0 ? "+" : ""}{fmt(margeBudget, 0)} {deviseAbr}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: P.dim }}>
                  {depassementBudget > 0
                    ? `⚠ Dépassement de ${fmt(depassementBudget, 0)} ${deviseAbr} par rapport à l'offre`
                    : `✓ ${fmt(margeBudget, 0)} ${deviseAbr} de marge encore disponible`}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={sectionHeader}>
                <FaCoins size={12} /> Charges annexes
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: P.charcoal }}>
                  {fmt(chargesAnnexes, 0)} {deviseAbr}
                </div>
                <div style={{ fontSize: 11, color: P.dim, marginTop: 4 }}>
                  transport, hébergement, per diem…
                </div>
                <div style={{ marginTop: 12, borderTop: `1px solid ${P.linen}`, paddingTop: 10, fontSize: 12, color: P.dim }}>
                  Coût total réel :{" "}
                  <strong style={{ color: P.charcoal }}>
                    {fmt(factProjet + chargesAnnexes, 0)} {deviseAbr}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {profils.length > 0 && (
            <div style={card}>
              <div style={sectionHeader}>
                <FaUsers size={13} /> Détail par profil — Offre / Planifié / Réalisé (indicatif)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Profil</th>
                      <th style={{ ...th, textAlign: "right" }}>TJM</th>
                      <th style={{ ...th, textAlign: "right", color: P.phase }}>
                        JH offre <span style={{ fontWeight: 400, fontSize: 9 }}>(vendu)</span>
                      </th>
                      <th style={{ ...th, textAlign: "right", color: P.phase }}>Fact. offre</th>
                      <th style={{ ...th, textAlign: "right", color: "#7c3aed" }}>
                        JH planifié <span style={{ fontWeight: 400, fontSize: 9 }}>(backlog)</span>
                      </th>
                      <th style={{ ...th, textAlign: "right", color: "#7c3aed" }}>Fact. planifiée</th>
                      <th style={{ ...th, textAlign: "right", color: P.dim }}>
                        JH réalisé <span style={{ fontWeight: 400, fontSize: 9 }}>(indicatif)</span>
                      </th>
                      <th style={{ ...th, textAlign: "center" }}>
                        Marge offre
                        <div style={{ fontWeight: 400, fontSize: 9, fontStyle: "italic" }}>+ = bien</div>
                      </th>
                      <th style={{ ...th, textAlign: "center" }}>
                        Écart réalisé
                        <div style={{ fontWeight: 400, fontSize: 9, fontStyle: "italic" }}>− = bien</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {profils.map((p, i) => {
                      const fOffre = p.volumeLead * p.tjm;
                      const fPlan  = p.volumeBacklogProjet * p.tjm;
                      const mOff   = p.volumeLead - p.volumeBacklogProjet;
                      const eReal  = p.volumeProjet - p.volumeBacklogProjet;
                      return (
                        <tr key={p.id}>
                          <td style={{ ...getTd(i), fontWeight: 700, color: P.charcoal }}>{p.name}</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: P.dim }}>{fmt(p.tjm, 0)} {deviseAbr}</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: P.phase }}>{fmt(p.volumeLead, 1)}</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: P.phase, fontWeight: 600 }}>{fmt(fOffre, 0)} {deviseAbr}</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: "#7c3aed" }}>{fmt(p.volumeBacklogProjet, 1)}</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: "#7c3aed", fontWeight: 600 }}>{fmt(fPlan, 0)} {deviseAbr}</td>
                          <td style={{ ...getTd(i), textAlign: "right", color: P.dim }}>{fmt(p.volumeProjet, 1)}</td>
                          <td style={{ ...getTd(i), textAlign: "center" }}><Delta value={mOff} unit="JH" zeroLabel="✓" size="sm" /></td>
                          <td style={{ ...getTd(i), textAlign: "center" }}><Delta value={eReal} unit="JH" invert={true} zeroLabel="✓" size="sm" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>TOTAL</td>
                      <td />
                      <td style={{ padding: "10px 12px", textAlign: "right", color: P.phase, fontWeight: 700, fontSize: 12 }}>{fmt(jhOffre, 1)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: P.phase, fontWeight: 700, fontSize: 12 }}>{fmt(factOffre, 0)} {deviseAbr}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#7c3aed", fontWeight: 700, fontSize: 12 }}>{fmt(jhPlanifie, 1)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#7c3aed", fontWeight: 700, fontSize: 12 }}>{fmt(factProjet, 0)} {deviseAbr}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: P.dim, fontWeight: 700, fontSize: 12 }}>{fmt(jhRealise, 1)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={margeOffre} unit="JH" zeroLabel="✓" size="sm" /></td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}><Delta value={ecartRealise} unit="JH" invert={true} zeroLabel="✓" size="sm" /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{
              background: margeBudget >= 0 ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${margeBudget >= 0 ? P.success : P.tomato}44`,
              borderLeft: `4px solid ${margeBudget >= 0 ? P.success : P.tomato}`,
              borderRadius: 10, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                  <FaFileInvoiceDollar size={10} /> Marge budget restante
                </div>
                <div style={{ fontSize: 11, color: P.dim, marginBottom: 6 }}>Offre − Facturation planifiée</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: margeBudget >= 0 ? P.success : P.tomato }}>
                  {margeBudget >= 0 ? "+" : ""}{fmt(margeBudget, 0)} {deviseAbr}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: P.dim, marginBottom: 4 }}>Budget consommé</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: factProjet > factOffre ? P.tomato : P.charcoal }}>
                  {fmt(pctBudgetConsomme, 0)} %
                </div>
              </div>
            </div>

            <div style={{
              background: resteAEncaisser > 0 ? "#fffbeb" : "#f0fdf4",
              border: `1px solid ${resteAEncaisser > 0 ? P.tuscan : P.success}55`,
              borderLeft: `4px solid ${resteAEncaisser > 0 ? P.tuscan : P.success}`,
              borderRadius: 10, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                  <FaCoins size={10} /> Reste non encaissé (client)
                </div>
                <div style={{ fontSize: 11, color: P.dim, marginBottom: 6 }}>Offre − CA encaissé</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: resteAEncaisser > 0 ? "#b45309" : P.success }}>
                  {fmt(resteAEncaisser, 0)} {deviseAbr}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: P.dim, marginBottom: 4 }}>Encaissé</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: resteAEncaisser === 0 ? P.success : P.charcoal }}>
                  {fmt(tauxEncaissement, 0)} %
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ CA ═══════════ */}
      {activeTab === "ca" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "#eff6ff", border: "1px solid #bee3f8", borderRadius: 8,
            padding: "10px 14px", fontSize: 12, color: "#1e40af",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <FaCoins size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>CA Offre</strong> = montant vendu au client (offre signée) ·{" "}
              <strong>CA Encaissé</strong> = paiements effectivement reçus (<code>projet_ca_encaisse</code>) ·{" "}
              <strong>Marge brute</strong> = CA encaissé − facturation planifiée − charges annexes.
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={card}>
              <div style={sectionHeader}>
                <FaChartLine size={13} /> Progression CA client
              </div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: P.success, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <FaCheckCircle size={11} /> Encaissé
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: P.success }}>
                      {fmt(caEncaisse, 0)} {deviseAbr}
                    </span>
                  </div>
                  <Bar value={caEncaisse} max={montantOffreLead || 1} color={P.success} height={12} />
                  <div style={{ fontSize: 10, color: P.dim, marginTop: 4 }}>
                    {fmt(tauxEncaissement, 1)} % de l'offre encaissé
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#b45309", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <FaClock size={11} /> + Planifié non encaissé
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>
                      {fmt(caPlanifie, 0)} {deviseAbr}
                    </span>
                  </div>
                  <Bar value={caPotentiel} max={montantOffreLead || 1} color={P.tuscan} height={8} />
                  <div style={{ fontSize: 10, color: P.dim, marginTop: 4 }}>
                    {fmt(tauxCouverture, 1)} % couverture totale attendue
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${P.linen}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: P.dim }}>Offre signée (objectif)</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: P.charcoal }}>
                    {fmt(montantOffreLead, 0)} {deviseAbr}
                  </span>
                </div>
                {resteAEncaisser > 0 && (
                  <div style={{
                    background: "#fffbeb", border: `1px solid ${P.tuscan}55`,
                    borderLeft: `3px solid ${P.tuscan}`, borderRadius: 6, padding: "10px 12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FaCoins size={11} color="#b45309" />
                      <span style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>Reste à encaisser</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#b45309" }}>
                      {fmt(resteAEncaisser, 0)} {deviseAbr}
                    </span>
                  </div>
                )}
                {resteAEncaisser === 0 && (
                  <div style={{
                    background: "#f0fdf4", border: `1px solid ${P.success}44`,
                    borderLeft: `3px solid ${P.success}`, borderRadius: 6, padding: "10px 12px",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <FaCheckCircle size={11} color={P.success} />
                    <span style={{ fontSize: 12, color: P.success, fontWeight: 600 }}>Intégralement encaissé</span>
                  </div>
                )}
              </div>
            </div>

            <div style={card}>
              <div style={sectionHeader}>
                <FaTrophy size={13} /> Analyse de marge
              </div>
              <div style={{ padding: 18 }}>
                {[
                  { label: "CA encaissé (client)", value: caEncaisse, color: P.success, bold: false },
                  { label: "− Facturation planifiée (JH planifié × TJM)", value: -factProjet, color: P.tomato, bold: false },
                  { label: "− Charges annexes", value: -chargesAnnexes, color: "#b45309", bold: false },
                  { label: "= Marge brute", value: marge, color: marge >= 0 ? P.success : P.tomato, bold: true },
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: `${row.bold ? "10px" : "0"} 0 8px`,
                      borderBottom: row.bold ? "none" : `1px solid ${P.linen}`,
                      borderTop: row.bold ? `2px solid ${P.linen}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 12, color: row.bold ? P.charcoal : P.dim, fontWeight: row.bold ? 700 : 400 }}>
                      {row.label}
                    </span>
                    <span style={{ fontSize: row.bold ? 18 : 13, fontWeight: row.bold ? 800 : 600, color: row.color }}>
                      {row.value >= 0 ? "+" : ""}{fmt(row.value, 0)} {deviseAbr}
                    </span>
                  </div>
                ))}
                {caEncaisse > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: P.dim }}>
                    Taux de marge :{" "}
                    <strong style={{ color: marge >= 0 ? P.success : P.tomato }}>
                      {fmt(tauxMarge, 1)} %
                    </strong>
                  </div>
                )}
                <div style={{ marginTop: 14, borderTop: `2px solid ${P.linen}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: P.dim, marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                      <FaCoins size={9} /> Reste à encaisser
                    </div>
                    <div style={{ fontSize: 11, color: P.dim }}>Offre − CA encaissé</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: resteAEncaisser > 0 ? "#b45309" : P.success }}>
                      {fmt(resteAEncaisser, 0)} {deviseAbr}
                    </div>
                    <div style={{ fontSize: 10, color: P.dim, marginTop: 2 }}>
                      {fmt(tauxEncaissement, 1)} % encaissé
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: resteAEncaisser > 0 ? "#fffbeb" : "#f0fdf4",
            border: `1px solid ${resteAEncaisser > 0 ? P.tuscan : P.success}55`,
            borderLeft: `4px solid ${resteAEncaisser > 0 ? P.tuscan : P.success}`,
            borderRadius: 10, padding: "16px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.dim, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                Reste à encaisser
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: resteAEncaisser > 0 ? "#b45309" : P.success }}>
                {fmt(resteAEncaisser, 0)} {deviseAbr}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: P.dim, marginBottom: 4 }}>Avancement encaissement</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: resteAEncaisser === 0 ? P.success : P.charcoal }}>
                {fmt(tauxEncaissement, 0)} %
              </div>
            </div>
          </div>

          {calendrier.length > 0 && (
            <div style={card}>
              <div style={sectionHeader}>
                <FaFileInvoiceDollar size={13} /> Calendrier paiements client
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Libellé</th>
                    <th style={th}>Référence</th>
                    <th style={{ ...th, textAlign: "center" }}>Montant</th>
                    <th style={{ ...th, textAlign: "center" }}>Échéance</th>
                    <th style={{ ...th, textAlign: "center" }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {calendrier.map((c, i) => {
                    const sc: Record<string, string> = {
                      PAYE: P.success, EN_ATTENTE: "#b45309",
                      PARTIELLEMENT_PAYE: "#1d4ed8", ANNULE: P.tomato,
                    };
                    const sbg: Record<string, string> = {
                      PAYE: "#d1fae5", EN_ATTENTE: "#fffbeb",
                      PARTIELLEMENT_PAYE: "#eff6ff", ANNULE: "#fee2e2",
                    };
                    const sl: Record<string, string> = {
                      PAYE: "✓ Payé", EN_ATTENTE: "⏳ Attente",
                      PARTIELLEMENT_PAYE: "◑ Partiel", ANNULE: "✗ Annulé",
                    };
                    return (
                      <tr key={c.id}>
                        <td style={{ ...getTd(i), color: P.charcoal }}>{c.libelle}</td>
                        <td style={{ ...getTd(i), color: P.dim, fontSize: 11 }}>{c.typeReference}</td>
                        <td style={{ ...getTd(i), textAlign: "center", fontWeight: 700, color: c.statut === "PAYE" ? P.success : P.charcoal }}>
                          {fmt(c.montantAPayer, 0)} {deviseAbr}
                        </td>
                        <td style={{ ...getTd(i), textAlign: "center", color: P.dim, fontSize: 11 }}>
                          {fmtDate(c.datePaiement)}
                        </td>
                        <td style={{ ...getTd(i), textAlign: "center" }}>
                          <Pill color={sc[c.statut] ?? P.dim} bg={sbg[c.statut] ?? P.linen}>
                            {sl[c.statut] ?? c.statut}
                          </Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: P.linen, borderTop: `2px solid #d0cfc8` }}>
                    <td colSpan={2} style={{ padding: "10px 12px", fontWeight: 700, color: P.charcoal, fontSize: 12 }}>
                      TOTAL ENCAISSÉ
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: P.success, fontSize: 13 }}>
                      {fmt(caEncaisse, 0)} {deviseAbr}
                    </td>
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