import React from "react";
import {
  FaHandshake, FaChartPie, FaBalanceScale,
  FaArrowUp, FaArrowDown,
} from "react-icons/fa";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MargeCommercialeProps {
  /**
   * Détail par profil issu de GET /api/comparaison/projet/{id}.
   *
   * Règle métier :
   *   jhOffreVendu     → JH total global de l'offre (NON distribué par profil — indicatif)
   *   jhBacklogLead    → JH réels du backlog lead pour CE profil  ← BASE DES MONTANTS PAR LIGNE
   *   budgetBacklogLead= jhBacklogLead × tjm  ← montant réel par profil
   *   jhBacklogProjet  → JH planifiés dans le backlog projet pour CE profil
   *   budgetPlanifie   = jhBacklogProjet × tjm
   */
  detailProfils?: Array<{
    backlogProfilId: number;
    profilName: string;
    tjm: number;
    jhOffreVendu: number;       // Global total — indicatif, non distribué par profil
    jhBacklogLead: number;      // JH réels backlog lead pour CE profil ← à utiliser
    jhBacklogProjet: number;
    jhRealise: number;
    margeCommercialeJH: number;
    margePlanningJH: number;
    ecartRealiseJH: number;
    budgetBacklogLead: number;  // jhBacklogLead × tjm ← montant réel par profil
    budgetPlanifie: number;
  }>;
  /** Montant total offre commerciale signée */
  offreMontantTotal?: number;
  /** JH global vendu dans l'offre (global, non par profil) */
  offreJhVenduTotal?: number;
  /** Montant total backlog lead = Σ(jhBacklogLead × tjm) */
  montantBacklogLead?: number;
  /** Montant total backlog projet planifié */
  montantBacklogProjet?: number;
  /** Marge commerciale = offreMontantTotal − montantBacklogLead */
  margeCommercialeMontant?: number;
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const PC = {
  charcoal: "#223A46",
  tomato:   "#C93C29",
  tuscan:   "#EABF5B",
  dim:      "#5F6F6E",
  linen:    "#E8E5D7",
  white:    "#ffffff",
  success:  "#2d8f47",
  lot:      "#5c6ac4",
  phase:    "#00848e",
  lead:     "#7c3aed",
};

function fmtN(n: number | null | undefined, d = 0): string {
  const safe = n == null || isNaN(n as number) ? 0 : (n as number);
  return safe.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const DeltaBadge: React.FC<{ value: number; unit: string; invert?: boolean }> = ({
  value, unit, invert = false,
}) => {
  const isZero = Math.abs(value) < 0.01;
  const isBad  = invert ? value > 0 : value < 0;
  const color  = isZero ? PC.success : isBad ? PC.tomato : PC.success;
  const bg     = isZero ? "#d1fae5"  : isBad ? "#fee2e2" : "#d1fae5";
  return (
    <span style={{ background: bg, color, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const }}>
      {isZero ? "✓ Exact" : `${value > 0 ? "+" : ""}${fmtN(value, Math.abs(value) < 10 ? 1 : 0)} ${unit}`}
    </span>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

export const OngletMargeCommerciale: React.FC<MargeCommercialeProps & { deviseAbr?: string }> = ({
  detailProfils = [],
  offreMontantTotal = 0,
  offreJhVenduTotal = 0,
  montantBacklogLead = 0,
  montantBacklogProjet = 0,
  margeCommercialeMontant = 0,
  deviseAbr = "€",
}) => {

  // ── Totaux depuis les lignes réelles du backlog lead ─────────────────────
  const totalJhBacklogLead  = detailProfils.reduce((s, p) => s + p.jhBacklogLead,    0);
  const totalJhPlanifie     = detailProfils.reduce((s, p) => s + p.jhBacklogProjet,  0);
  const totalBudgetLead     = detailProfils.reduce((s, p) => s + p.budgetBacklogLead, 0);
  const totalBudgetPlanifie = detailProfils.reduce((s, p) => s + p.budgetPlanifie,   0);
  const totalJhRealise      = detailProfils.reduce((s, p) => s + p.jhRealise,        0);

  // Références finales (préférer les totaux du backend si disponibles)
  const refMontantLead    = montantBacklogLead  || totalBudgetLead;
  const refMontantPlanifie = montantBacklogProjet || totalBudgetPlanifie;

  // Marges
  const margeCommMontant = margeCommercialeMontant || (offreMontantTotal - refMontantLead);
  const margePlanJh      = totalJhBacklogLead - totalJhPlanifie;
  const margePlanMontant = refMontantLead - refMontantPlanifie;
  const pctMargeComm     = offreMontantTotal > 0 ? (margeCommMontant / offreMontantTotal) * 100 : 0;

  // ── Styles ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: PC.white, border: `1px solid ${PC.linen}`, borderRadius: 10, boxShadow: "0 1px 4px rgba(34,58,70,0.07)" };
  const sh: React.CSSProperties   = { background: PC.charcoal, color: PC.white, padding: "10px 16px", fontSize: 12, fontWeight: 700, borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", gap: 8 };
  const th: React.CSSProperties   = { padding: "9px 12px", fontSize: 11, fontWeight: 600, background: "#f4f6f7", color: PC.dim, textAlign: "left" as const, borderBottom: `1px solid ${PC.linen}` };
  const getTd = (i: number): React.CSSProperties => ({ padding: "9px 12px", fontSize: 12, background: i % 2 === 0 ? PC.white : "#fafbfc", borderBottom: `1px solid ${PC.linen}`, verticalAlign: "middle" as const });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Note explicative */}
      <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#4c1d95", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <FaHandshake size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          La <strong>marge commerciale</strong> compare l'offre signée client (montant global)
          avec l'évaluation réelle de l'équipe technique dans le <strong>backlog lead</strong>{" "}
          (Σ JH par profil × TJM). Les montants par profil sont basés sur le{" "}
          <strong>backlog lead réel</strong>, pas sur un prorata de l'offre globale.
        </span>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>

        <div style={{ ...card, padding: "14px 16px", borderLeft: `4px solid ${PC.phase}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: PC.phase, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 6 }}>Offre commerciale (signée)</div>
          <div style={{ fontSize: 11, color: PC.dim, marginBottom: 4 }}>Montant total global client</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: PC.charcoal }}>{fmtN(offreMontantTotal, 0)} <span style={{ fontSize: 12, color: PC.dim }}>{deviseAbr}</span></div>
          {offreJhVenduTotal > 0 && <div style={{ marginTop: 6, fontSize: 11, color: PC.dim }}>{fmtN(offreJhVenduTotal, 1)} JH global (non décomposé par profil)</div>}
        </div>

        <div style={{ ...card, padding: "14px 16px", borderLeft: `4px solid ${PC.lead}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: PC.lead, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 6 }}>Backlog lead (proposition tech)</div>
          <div style={{ fontSize: 11, color: PC.dim, marginBottom: 4 }}>Σ JH réels par profil × TJM</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: PC.charcoal }}>{fmtN(refMontantLead, 0)} <span style={{ fontSize: 12, color: PC.dim }}>{deviseAbr}</span></div>
          <div style={{ marginTop: 6, fontSize: 11, color: PC.dim }}>{fmtN(totalJhBacklogLead, 1)} JH proposés</div>
        </div>

        <div style={{ ...card, padding: "14px 16px", borderLeft: `4px solid ${margeCommMontant >= 0 ? PC.success : PC.tomato}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: PC.dim, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 6 }}>Marge commerciale</div>
          <div style={{ fontSize: 11, color: PC.dim, marginBottom: 8 }}>Offre − Backlog lead · <span style={{ fontStyle: "italic" }}>+ = favorable</span></div>
          <div style={{ fontSize: 22, fontWeight: 800, color: margeCommMontant >= 0 ? PC.success : PC.tomato }}>
            {margeCommMontant >= 0 ? "+" : ""}{fmtN(margeCommMontant, 0)} <span style={{ fontSize: 13 }}>{deviseAbr}</span>
          </div>
          {offreMontantTotal > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: PC.dim }}>
              Taux : <strong style={{ color: pctMargeComm >= 0 ? PC.success : PC.tomato }}>{fmtN(pctMargeComm, 1)} %</strong>
            </div>
          )}
        </div>

        <div style={{ ...card, padding: "14px 16px", borderLeft: `4px solid ${margePlanJh >= 0 ? PC.tuscan : PC.tomato}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: PC.dim, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 6 }}>Dérive planning</div>
          <div style={{ fontSize: 11, color: PC.dim, marginBottom: 8 }}>Backlog lead − Backlog projet · <span style={{ fontStyle: "italic" }}>+ = dans enveloppe</span></div>
          <DeltaBadge value={margePlanJh} unit="JH" />
          <div style={{ marginTop: 6, fontSize: 11, color: PC.dim }}>
            Montant : <strong style={{ color: margePlanMontant >= 0 ? PC.success : PC.tomato }}>{margePlanMontant >= 0 ? "+" : ""}{fmtN(margePlanMontant, 0)} {deviseAbr}</strong>
          </div>
        </div>
      </div>

      {/* Waterfall */}
      <div style={card}>
        <div style={sh}><FaBalanceScale size={13} /> Décomposition budgétaire</div>
        <div style={{ padding: "18px 20px" }}>
          {[
            { label: "Offre commerciale (montant signé client)", value: offreMontantTotal, color: PC.phase, sign: false, note: offreJhVenduTotal > 0 ? `${fmtN(offreJhVenduTotal, 1)} JH global` : undefined },
            { label: "− Backlog lead (Σ JH réels par profil × TJM)", value: -refMontantLead, color: refMontantLead <= offreMontantTotal ? PC.lead : PC.tomato, sign: true, note: `${fmtN(totalJhBacklogLead, 1)} JH` },
            { label: "= Marge commerciale brute", value: margeCommMontant, color: margeCommMontant >= 0 ? PC.success : PC.tomato, sign: true, bold: true, sep: true, note: `${fmtN(pctMargeComm, 1)} % de l'offre` },
            { label: "− Backlog projet planifié (Σ JH × TJM)", value: -refMontantPlanifie, color: PC.lot, sign: true, note: `${fmtN(totalJhPlanifie, 1)} JH` },
            { label: "= Marge backlog lead vs planifié", value: margePlanMontant, color: margePlanMontant >= 0 ? PC.success : PC.tomato, sign: true, bold: true, sep: true },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: row.bold ? "10px 0 8px" : "7px 0", borderTop: row.sep ? `2px solid ${PC.linen}` : "none", marginTop: row.sep ? 4 : 0 }}>
              <div>
                <span style={{ fontSize: 12, color: row.bold ? PC.charcoal : PC.dim, fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                {row.note && <span style={{ fontSize: 10, color: PC.dim, marginLeft: 8, fontStyle: "italic" }}>({row.note})</span>}
              </div>
              <span style={{ fontSize: row.bold ? 16 : 13, fontWeight: row.bold ? 800 : 600, color: row.color, whiteSpace: "nowrap" as const }}>
                {row.value >= 0 && row.sign ? "+" : ""}{fmtN(row.value, 0)} {deviseAbr}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau détail par profil */}
      {detailProfils.length > 0 ? (
        <div style={card}>
          <div style={sh}><FaChartPie size={13} /> Détail par profil — Backlog lead vs Backlog projet</div>

          <div style={{ margin: "12px 16px 0", background: "#fffbeb", border: `1px solid ${PC.tuscan}55`, borderLeft: `3px solid ${PC.tuscan}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#92400e" }}>
            <strong>⚠ Note :</strong> L'offre commerciale ({fmtN(offreMontantTotal, 0)} {deviseAbr}
            {offreJhVenduTotal > 0 && ` / ${fmtN(offreJhVenduTotal, 1)} JH`}) est un montant{" "}
            <strong>global non décomposé par profil</strong>. Les montants ci-dessous sont basés sur le{" "}
            <strong>backlog lead réel</strong> (JH par profil × TJM).
          </div>

          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Profil</th>
                  <th style={{ ...th, textAlign: "right" as const }}>TJM</th>
                  <th style={{ ...th, textAlign: "right" as const, color: PC.lead }}>
                    JH backlog lead
                    <div style={{ fontWeight: 400, fontSize: 9 }}>réels par profil</div>
                  </th>
                  <th style={{ ...th, textAlign: "right" as const, color: PC.lead }}>
                    Montant B. Lead
                    <div style={{ fontWeight: 400, fontSize: 9 }}>JH × TJM</div>
                  </th>
                  <th style={{ ...th, textAlign: "right" as const, color: PC.lot }}>
                    JH planifié
                    <div style={{ fontWeight: 400, fontSize: 9 }}>backlog projet</div>
                  </th>
                  <th style={{ ...th, textAlign: "right" as const, color: PC.lot }}>
                    Montant planifié
                    <div style={{ fontWeight: 400, fontSize: 9 }}>JH × TJM</div>
                  </th>
                  <th style={{ ...th, textAlign: "center" as const }}>
                    Dérive planning
                    <div style={{ fontWeight: 400, fontSize: 9, fontStyle: "italic" }}>lead − planifié · + = bien</div>
                  </th>
                  <th style={{ ...th, textAlign: "right" as const, color: PC.dim }}>
                    JH réalisé
                    <div style={{ fontWeight: 400, fontSize: 9 }}>time_spent</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {detailProfils.map((p, i) => (
                  <tr key={p.backlogProfilId}>
                    <td style={{ ...getTd(i), fontWeight: 700, color: PC.charcoal }}>{p.profilName}</td>
                    <td style={{ ...getTd(i), textAlign: "right" as const, color: PC.dim }}>{fmtN(p.tjm, 0)} {deviseAbr}</td>
                    {/* Backlog lead — montants réels par profil */}
                    <td style={{ ...getTd(i), textAlign: "right" as const, color: PC.lead, fontWeight: 600 }}>{fmtN(p.jhBacklogLead, 1)}</td>
                    <td style={{ ...getTd(i), textAlign: "right" as const, color: PC.lead, fontWeight: 600 }}>{fmtN(p.budgetBacklogLead, 0)} {deviseAbr}</td>
                    {/* Backlog projet */}
                    <td style={{ ...getTd(i), textAlign: "right" as const, color: PC.lot, fontWeight: 600 }}>{fmtN(p.jhBacklogProjet, 1)}</td>
                    <td style={{ ...getTd(i), textAlign: "right" as const, color: PC.lot, fontWeight: 600 }}>{fmtN(p.budgetPlanifie, 0)} {deviseAbr}</td>
                    {/* Dérive */}
                    <td style={{ ...getTd(i), textAlign: "center" as const }}><DeltaBadge value={p.margePlanningJH} unit="JH" /></td>
                    {/* Réalisé */}
                    <td style={{ ...getTd(i), textAlign: "right" as const, color: PC.dim }}>{fmtN(p.jhRealise, 1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Ligne totaux backlog lead / projet */}
                <tr style={{ background: PC.linen, borderTop: `2px solid #d0cfc8` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: PC.charcoal, fontSize: 12 }}>TOTAL Backlogs</td>
                  <td />
                  <td style={{ padding: "10px 12px", textAlign: "right" as const, color: PC.lead, fontWeight: 700, fontSize: 12 }}>{fmtN(totalJhBacklogLead, 1)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" as const, color: PC.lead, fontWeight: 700, fontSize: 12 }}>{fmtN(refMontantLead, 0)} {deviseAbr}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" as const, color: PC.lot, fontWeight: 700, fontSize: 12 }}>{fmtN(totalJhPlanifie, 1)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" as const, color: PC.lot, fontWeight: 700, fontSize: 12 }}>{fmtN(refMontantPlanifie, 0)} {deviseAbr}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" as const }}><DeltaBadge value={margePlanJh} unit="JH" /></td>
                  <td style={{ padding: "10px 12px", textAlign: "right" as const, color: PC.dim, fontWeight: 700, fontSize: 12 }}>{fmtN(totalJhRealise, 1)}</td>
                </tr>
                {/* Ligne offre commerciale globale (séparée car non décomposée par profil) */}
                <tr style={{ background: "#e0f5f7", borderTop: `1px solid ${PC.phase}44` }}>
                  <td colSpan={2} style={{ padding: "10px 12px", fontSize: 11, color: PC.phase, fontWeight: 700 }}>
                    Offre commerciale (référence globale)
                    {offreJhVenduTotal > 0 && <span style={{ fontWeight: 400, marginLeft: 6 }}>— {fmtN(offreJhVenduTotal, 1)} JH global</span>}
                  </td>
                  <td colSpan={2} style={{ padding: "10px 12px", textAlign: "right" as const, color: PC.phase, fontWeight: 800, fontSize: 14 }}>
                    {fmtN(offreMontantTotal, 0)} {deviseAbr}
                  </td>
                  <td colSpan={2} style={{ padding: "10px 12px", textAlign: "right" as const, fontSize: 11, color: PC.dim }}>
                    Marge commerciale :
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" as const }}>
                    <span style={{
                      background: margeCommMontant >= 0 ? "#d1fae5" : "#fee2e2",
                      color: margeCommMontant >= 0 ? PC.success : PC.tomato,
                      borderRadius: 99, padding: "3px 12px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" as const,
                    }}>
                      {margeCommMontant >= 0 ? "+" : ""}{fmtN(margeCommMontant, 0)} {deviseAbr}{" "}
                      <span style={{ fontSize: 10 }}>({fmtN(pctMargeComm, 1)} %)</span>
                    </span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Légende */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${PC.linen}`, display: "flex", flexWrap: "wrap" as const, gap: "8px 20px" }}>
            {[
              { color: PC.phase, label: "Offre commerciale (montant global signé)" },
              { color: PC.lead,  label: "Backlog lead — JH réels par profil × TJM" },
              { color: PC.lot,   label: "Backlog projet (planifié)" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 10, color: PC.dim }}>{label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <FaArrowUp size={9} color={PC.success} />
              <span style={{ fontSize: 10, color: PC.dim }}>Marge favorable</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <FaArrowDown size={9} color={PC.tomato} />
              <span style={{ fontSize: 10, color: PC.dim }}>Dépassement / risque</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center" as const, padding: "40px 0", color: PC.dim, fontSize: 13, fontStyle: "italic" }}>
          Aucun backlog lead disponible pour ce projet.
        </div>
      )}
    </div>
  );
};

export default OngletMargeCommerciale;