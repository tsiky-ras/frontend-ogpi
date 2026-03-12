import React, { useMemo, useState } from "react";
import { FaChevronDown, FaChevronRight, FaFileInvoiceDollar, FaLayerGroup } from "react-icons/fa";

import {
  BacklogLot,
  BacklogLine,
} from "../../../../types/lead/Backlog/Backlog.tsx";
import {
  BacklogProjetProfil,
  BacklogProjetLineProfil,
} from "../../../../types/projet/backlog/BacklogProjet.tsx";

// ─── Types internes ──────────────────────────────────────────────────────────

interface ProfilFull extends BacklogProjetProfil {
  collaborateurs: any[];
}

interface FacturableProfilProps {
  lots:        BacklogLot[];
  profils:     ProfilFull[];
  lines:       BacklogLine[];
  lineProfils: BacklogProjetLineProfil[];
  deviseAbr:   string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const monthLabel = (year: number, month: number): string =>
  new Date(year, month, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

const fmtAmount = (v: number, devise: string) =>
  `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${devise}`;

const fmtJH = (v: number) => v.toFixed(v % 1 === 0 ? 0 : 1);

/**
 * Distribue `volume` JH entre dateDebut et dateFin au prorata du nombre de mois.
 * Retourne { "sans-date": volume } si aucune date disponible.
 * Clé de mois : "YYYY-M" avec mois 0-based (janvier = 0).
 */
function distributeVolumeByMonth(
  volume:    number,
  dateDebut: string | null | undefined,
  dateFin:   string | null | undefined
): Record<string, number> {
  if (!dateDebut && !dateFin) return { "sans-date": volume };

  const start = new Date(dateDebut ?? dateFin!);
  const end   = new Date(dateFin   ?? dateDebut!);

  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth   = new Date(end.getFullYear(),   end.getMonth(),   1);

  const monthCount =
    (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
    (endMonth.getMonth() - startMonth.getMonth()) + 1;

  if (monthCount <= 0) return { "sans-date": volume };

  const result: Record<string, number> = {};
  for (let i = 0; i < monthCount; i++) {
    const d   = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    result[key] = volume / monthCount;
  }
  return result;
}

/** Parse une clé "YYYY-MM" (mois 0-based) ou "sans-date" */
function parseMonthKey(key: string): { year: number; month: number } | null {
  if (key === "sans-date") return null;
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m }; // month est 0-based
}

// ─── Composant ───────────────────────────────────────────────────────────────

const FacturableProfil: React.FC<FacturableProfilProps> = ({
  lots,
  profils,
  lines,
  lineProfils,
  deviseAbr,
}) => {

  const [expandedProfils, setExpandedProfils] = useState<Set<number>>(new Set());
  const [expandedLots,    setExpandedLots]    = useState<Map<number, Set<string>>>(new Map());

  const toggleProfil = (id: number) =>
    setExpandedProfils(prev => {
      const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
    });

  const toggleLot = (profilId: number, monthKey: string) =>
    setExpandedLots(prev => {
      const m = new Map(prev);
      const s = new Set(m.get(profilId) ?? []);
      s.has(monthKey) ? s.delete(monthKey) : s.add(monthKey);
      s.size ? m.set(profilId, s) : m.delete(profilId);
      return m;
    });

  // ── Index lot / phase / sprint ────────────────────────────────────────
  const lotByPhaseId = useMemo(() => {
    const map = new Map<number, BacklogLot>();
    for (const lot of lots)
      for (const phase of (lot.phases ?? []) as any[])
        map.set(phase.id, lot);
    return map;
  }, [lots]);

  const phaseById = useMemo(() => {
    const map = new Map<number, any>();
    for (const lot of lots)
      for (const phase of (lot.phases ?? []) as any[])
        map.set(phase.id, phase);
    return map;
  }, [lots]);

  const sprintById = useMemo(() => {
    const map = new Map<number, any>();
    for (const lot of lots)
      for (const phase of (lot.phases ?? []) as any[])
        for (const sprint of (phase.sprints ?? []) as any[])
          map.set(sprint.id, sprint);
    return map;
  }, [lots]);

  // ── Résolution des dates pour un lineProfil ───────────────────────────
  // Priorité :
  //   1. lp.dateDebut / lp.dateFin  (dates saisies directement sur la tâche assignée)
  //   2. sprint de la ligne
  //   3. phase de la ligne
  //   4. lot de la ligne
  //   5. sans-date
  const resolveDates = (
    lp:   BacklogProjetLineProfil,
    line: BacklogLine
  ): { dateDebut: string | null; dateFin: string | null; source: string } => {

    // 1 — Dates directes sur le lineProfil
    const lpDebut = (lp as any).dateDebut as string | null | undefined;
    const lpFin   = (lp as any).dateFin   as string | null | undefined;
    if (lpDebut || lpFin)
      return { dateDebut: lpDebut ?? null, dateFin: lpFin ?? null, source: "tâche assignée" };

    // 2 — Sprint
    const sprintId = (line as any).sprintId as number | null;
    if (sprintId) {
      const sp = sprintById.get(sprintId);
      if (sp?.dateDebut || sp?.dateFin)
        return { dateDebut: sp.dateDebut ?? null, dateFin: sp.dateFin ?? null, source: "sprint" };
    }

    // 3 — Phase
    const phaseId = (line as any).phaseId as number | null;
    if (phaseId) {
      const ph = phaseById.get(phaseId);
      if (ph?.dateDebut || ph?.dateFin)
        return { dateDebut: ph.dateDebut ?? null, dateFin: ph.dateFin ?? null, source: "phase" };
    }

    // 4 — Lot
    const lot = phaseId ? lotByPhaseId.get(phaseId) : undefined;
    if (lot && ((lot as any).dateDebut || (lot as any).dateFin))
      return { dateDebut: (lot as any).dateDebut ?? null, dateFin: (lot as any).dateFin ?? null, source: "lot" };

    // 5 — Aucune date
    return { dateDebut: null, dateFin: null, source: "sans date" };
  };

  // ── Calcul principal ──────────────────────────────────────────────────
  const profilData = useMemo(() => {
    return profils.map(profil => {
      // Filtrer les lineProfils de ce profil sur lignes facturables
      const lps = lineProfils.filter(lp => {
        if ((lp.profil as any)?.id !== profil.id) return false;
        const line = lines.find(l => l.id === lp.lineId);
        return line?.facturable !== false;
      });

      // monthKey → { jh, lots: Map<lotName, jh> }
      const monthMap = new Map<string, { jh: number; lots: Map<string, number> }>();

      for (const lp of lps) {
        const line = lines.find(l => l.id === lp.lineId);
        if (!line) continue;

        const phaseId  = (line as any).phaseId as number | null;
        const lot      = phaseId ? lotByPhaseId.get(phaseId) : undefined;
        const lotLabel = lot?.name ?? "Sans lot";

        const { dateDebut, dateFin } = resolveDates(lp, line);
        const dist = distributeVolumeByMonth(lp.volume, dateDebut, dateFin);

        for (const [key, jh] of Object.entries(dist)) {
          if (!monthMap.has(key)) monthMap.set(key, { jh: 0, lots: new Map() });
          const entry = monthMap.get(key)!;
          entry.jh += jh;
          entry.lots.set(lotLabel, (entry.lots.get(lotLabel) ?? 0) + jh);
        }
      }

      const sortedKeys = [...monthMap.keys()].sort((a, b) => {
        if (a === "sans-date") return 1;
        if (b === "sans-date") return -1;
        return a.localeCompare(b);
      });

      const totalJH     = lps.reduce((s, lp) => s + lp.volume, 0);
      const totalAmount = totalJH * profil.tjm;

      return { profil, monthMap, sortedKeys, totalJH, totalAmount };
    }).filter(d => d.totalJH > 0);
  }, [profils, lineProfils, lines, lots, lotByPhaseId, phaseById, sprintById]);

  // ── Tous les mois distincts (tri chrono, sans-date en dernier) ────────
  const allMonthKeys = useMemo(() => {
    const set = new Set<string>();
    profilData.forEach(pd => pd.sortedKeys.forEach(k => set.add(k)));
    return [...set].sort((a, b) => {
      if (a === "sans-date") return 1;
      if (b === "sans-date") return -1;
      return a.localeCompare(b);
    });
  }, [profilData]);

  // ── Grand total facturable par mois (tous profils) ────────────────────
  const grandTotalByMonth = useMemo(() => {
    const map = new Map<string, number>();
    profilData.forEach(pd => pd.sortedKeys.forEach(key => {
      const amt = (pd.monthMap.get(key)?.jh ?? 0) * pd.profil.tjm;
      map.set(key, (map.get(key) ?? 0) + amt);
    }));
    return map;
  }, [profilData]);

  const grandTotal = profilData.reduce((s, d) => s + d.totalAmount, 0);

  // ── Nombre de tâches sans date ────────────────────────────────────────
  const sansDateCount = useMemo(() => {
    let count = 0;
    for (const lp of lineProfils) {
      const line = lines.find(l => l.id === lp.lineId);
      if (!line || line.facturable === false) continue;
      const { source } = resolveDates(lp, line);
      if (source === "sans date") count++;
    }
    return count;
  }, [lineProfils, lines]);

  if (profilData.length === 0) {
    return (
      <div className="text-center text-muted py-5 fst-italic">
        <FaFileInvoiceDollar size={32} className="mb-2 opacity-50" />
        <p className="mb-1">Aucune ligne facturable avec des profils assignés.</p>
        <small>Assignez des JH à des profils sur des lignes facturables pour voir la facturation mensuelle.</small>
      </div>
    );
  }

  return (
    <div>
      {/* ── En-tête global ── */}
      <div
        className="d-flex align-items-center justify-content-between px-3 py-2 rounded mb-3"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", color: "white" }}
      >
        <div className="d-flex align-items-center gap-2">
          <FaFileInvoiceDollar size={18} />
          <span className="fw-bold">Facturation mensuelle par profil</span>
          <span className="badge bg-white text-primary">
            {allMonthKeys.filter(k => k !== "sans-date").length} mois
          </span>
          {sansDateCount > 0 && (
            <span className="badge bg-warning text-dark" title="Tâches sans dates — non planifiées dans le calendrier">
              ⚠ {sansDateCount} tâche{sansDateCount > 1 ? "s" : ""} sans date
            </span>
          )}
        </div>
        <div className="fw-bold fs-5">{fmtAmount(grandTotal, deviseAbr)}</div>
      </div>

      {/* ── Légende priorité des dates ── */}
      <div
        className="d-flex align-items-center gap-2 flex-wrap px-3 py-2 rounded mb-3"
        style={{ background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: "0.72rem", color: "#0369a1" }}
      >
        <span className="fw-semibold">Source des dates (priorité) :</span>
        <span className="badge" style={{ background: "#0ea5e9", fontSize: "0.65rem" }}>1 · Tâche assignée</span>
        <span className="text-muted">→</span>
        <span className="badge" style={{ background: "#6366f1", fontSize: "0.65rem" }}>2 · Sprint</span>
        <span className="text-muted">→</span>
        <span className="badge" style={{ background: "#8b5cf6", fontSize: "0.65rem" }}>3 · Phase</span>
        <span className="text-muted">→</span>
        <span className="badge" style={{ background: "#a78bfa", fontSize: "0.65rem" }}>4 · Lot</span>
        <span className="text-muted">→</span>
        <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>Sans date</span>
        <span className="ms-2 text-muted fst-italic">
          · Les JH sont distribués uniformément sur les mois couverts.
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Tableau récapitulatif global Profil × Mois
      ══════════════════════════════════════════════════════════════════ */}
      {allMonthKeys.length > 0 && (
        <div className="card shadow-sm mb-4">
          <div className="card-header fw-bold py-2" style={{ background: "#f1f5f9", fontSize: "0.85rem" }}>
            Vue d'ensemble — Montant facturé par profil × mois
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-bordered mb-0" style={{ fontSize: "0.78rem" }}>
              <thead style={{ background: "#1e3a5f", color: "white" }}>
                <tr>
                  <th style={{ minWidth: 150 }}>Profil</th>
                  <th className="text-end" style={{ minWidth: 85, whiteSpace: "nowrap" }}>TJM</th>
                  {allMonthKeys.map(key => {
                    const mk = parseMonthKey(key);
                    return (
                      <th key={key} className="text-end" style={{ minWidth: 115, whiteSpace: "nowrap" }}>
                        {mk ? monthLabel(mk.year, mk.month) : "Sans date"}
                      </th>
                    );
                  })}
                  <th className="text-end" style={{ minWidth: 115, background: "#0f2952", whiteSpace: "nowrap" }}>
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {profilData.map(({ profil, monthMap, totalJH, totalAmount }) => (
                  <tr key={profil.id}>
                    <td className="fw-semibold" style={{ verticalAlign: "middle" }}>
                      {profil.name}
                      {profil.desc && <small className="text-muted ms-1 fw-normal">— {profil.desc}</small>}
                    </td>
                    <td className="text-end text-muted" style={{ verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      {profil.tjm.toLocaleString("fr-FR")} {deviseAbr}
                    </td>
                    {allMonthKeys.map(key => {
                      const jh  = monthMap.get(key)?.jh ?? 0;
                      const amt = jh * profil.tjm;
                      return (
                        <td key={key} className="text-end" style={{ verticalAlign: "middle" }}>
                          {jh > 0 ? (
                            <div className="d-flex flex-column align-items-end">
                              <span className="fw-semibold" style={{ color: key === "sans-date" ? "#64748b" : "#1e3a5f" }}>
                                {fmtAmount(amt, deviseAbr)}
                              </span>
                              <small className="text-muted">{fmtJH(jh)} JH</small>
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      );
                    })}
                    <td className="text-end fw-bold" style={{ background: "#eff6ff", verticalAlign: "middle" }}>
                      <div className="d-flex flex-column align-items-end">
                        <span style={{ color: "#1e3a5f" }}>{fmtAmount(totalAmount, deviseAbr)}</span>
                        <small className="text-muted">{fmtJH(totalJH)} JH</small>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: "#e8f0fe" }}>
                <tr>
                  <td colSpan={2} className="fw-bold" style={{ verticalAlign: "middle" }}>TOTAL / MOIS</td>
                  {allMonthKeys.map(key => {
                    const amt = grandTotalByMonth.get(key) ?? 0;
                    return (
                      <td key={key} className="text-end fw-bold" style={{ color: "#1e40af", verticalAlign: "middle" }}>
                        {amt > 0 ? fmtAmount(amt, deviseAbr) : "—"}
                      </td>
                    );
                  })}
                  <td className="text-end fw-bold" style={{ color: "#1e40af", background: "#dbeafe", verticalAlign: "middle" }}>
                    {fmtAmount(grandTotal, deviseAbr)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Détail par profil (accordéon) avec cartes mensuelles
      ══════════════════════════════════════════════════════════════════ */}
      <div className="card shadow-sm">
        <div className="card-header fw-bold py-2" style={{ background: "#f1f5f9", fontSize: "0.85rem" }}>
          Détail par profil — répartition mensuelle avec détail par lot
        </div>
        <div className="card-body p-0">
          {profilData.map(({ profil, monthMap, sortedKeys, totalJH, totalAmount }) => {
            const isOpen = expandedProfils.has(profil.id);
            return (
              <div key={profil.id} className="border-bottom">

                {/* ── En-tête profil cliquable ── */}
                <div
                  className="d-flex align-items-center justify-content-between px-3 py-2"
                  style={{ cursor: "pointer", background: isOpen ? "#eff6ff" : "white", transition: "background 0.15s" }}
                  onClick={() => toggleProfil(profil.id)}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted" style={{ fontSize: "0.75rem", width: 14 }}>
                      {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                    </span>
                    <div>
                      <span className="fw-bold">{profil.name}</span>
                      {profil.desc && <small className="text-muted ms-2">{profil.desc}</small>}
                      <span className="badge ms-2" style={{ background: "#dbeafe", color: "#1e40af", fontSize: "0.68rem" }}>
                        TJM : {profil.tjm.toLocaleString("fr-FR")} {deviseAbr}/j
                      </span>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary">{fmtJH(totalJH)} JH facturables</span>
                    <span
                      className="badge fw-bold"
                      style={{ background: "#1e3a5f", fontSize: "0.8rem", padding: "4px 10px" }}
                    >
                      {fmtAmount(totalAmount, deviseAbr)}
                    </span>
                  </div>
                </div>

                {/* ── Cartes mensuelles ── */}
                {isOpen && (
                  <div className="px-3 py-2" style={{ background: "#f8faff" }}>
                    <div className="row g-2">
                      {sortedKeys.map(key => {
                        const entry      = monthMap.get(key)!;
                        const mk         = parseMonthKey(key);
                        const label      = mk ? monthLabel(mk.year, mk.month) : "Sans date";
                        const jh         = entry.jh;
                        const amount     = jh * profil.tjm;
                        const lotOpen    = expandedLots.get(profil.id)?.has(key) ?? false;
                        const lotEntries = [...entry.lots.entries()].sort((a, b) => b[1] - a[1]);
                        const isSansDate = key === "sans-date";

                        return (
                          <div key={key} className="col-12 col-md-6 col-xl-4">
                            <div className="rounded border h-100" style={{ background: "white", overflow: "hidden" }}>

                              {/* En-tête de la carte mois */}
                              <div
                                className="d-flex align-items-center justify-content-between px-3 py-2"
                                style={{
                                  background: isSansDate
                                    ? "linear-gradient(90deg, #64748b, #94a3b8)"
                                    : "linear-gradient(90deg, #1e3a5f, #2563eb)",
                                  color: "white",
                                  cursor: lotEntries.length > 0 ? "pointer" : "default",
                                  fontSize: "0.82rem",
                                }}
                                onClick={() => lotEntries.length > 0 && toggleLot(profil.id, key)}
                              >
                                <span className="fw-semibold">{label}</span>
                                <div className="d-flex align-items-center gap-2">
                                  <span style={{ opacity: 0.85, fontSize: "0.72rem" }}>
                                    {fmtJH(jh)} JH
                                  </span>
                                  {lotEntries.length > 0 && (
                                    <span style={{ fontSize: "0.68rem", opacity: 0.7 }}>
                                      {lotOpen ? <FaChevronDown /> : <FaChevronRight />}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Montant + formule */}
                              <div className="px-3 py-2 text-center">
                                <div
                                  className="fw-bold"
                                  style={{ fontSize: "1.1rem", color: isSansDate ? "#64748b" : "#1e3a5f" }}
                                >
                                  {fmtAmount(amount, deviseAbr)}
                                </div>
                                <small className="text-muted">
                                  {fmtJH(jh)} JH × {profil.tjm.toLocaleString("fr-FR")} {deviseAbr}
                                </small>
                                {isSansDate && (
                                  <div className="mt-1">
                                    <span className="badge bg-warning text-dark" style={{ fontSize: "0.62rem" }}>
                                      ⚠ Aucune date définie — à planifier
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Barre de proportion (% du total profil) */}
                              {!isSansDate && totalJH > 0 && (
                                <div className="px-3 pb-2">
                                  <div style={{ height: 4, borderRadius: 2, background: "#e2eaf8", overflow: "hidden" }}>
                                    <div
                                      style={{
                                        height: "100%",
                                        width: `${Math.min(100, Math.round((jh / totalJH) * 100))}%`,
                                        background: "linear-gradient(90deg, #2563eb, #60a5fa)",
                                        borderRadius: 2,
                                        transition: "width 0.4s ease",
                                      }}
                                    />
                                  </div>
                                  <small className="text-muted" style={{ fontSize: "0.65rem" }}>
                                    {Math.round((jh / totalJH) * 100)}% du total profil
                                  </small>
                                </div>
                              )}

                              {/* Détail par lot (expandable au clic sur l'en-tête) */}
                              {lotOpen && lotEntries.length > 0 && (
                                <div
                                  className="border-top px-3 py-2"
                                  style={{ background: "#f5f8ff", fontSize: "0.75rem" }}
                                >
                                  <div className="d-flex align-items-center gap-1 mb-1 text-muted fw-semibold">
                                    <FaLayerGroup size={10} /> Détail par lot
                                  </div>
                                  {lotEntries.map(([lotName, lotJH]) => (
                                    <div
                                      key={lotName}
                                      className="d-flex justify-content-between align-items-center py-1 border-bottom"
                                      style={{ borderColor: "#e2eaf8" }}
                                    >
                                      <span
                                        className="text-muted text-truncate"
                                        style={{ maxWidth: "55%" }}
                                        title={lotName}
                                      >
                                        {lotName}
                                      </span>
                                      <div className="d-flex gap-2 align-items-center">
                                        <span className="text-muted">{fmtJH(lotJH)} JH</span>
                                        <span className="fw-semibold" style={{ color: "#1e3a5f" }}>
                                          {fmtAmount(lotJH * profil.tjm, deviseAbr)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Barre totale profil */}
                    <div
                      className="mt-2 px-3 py-2 rounded d-flex justify-content-between align-items-center"
                      style={{ background: "#dbeafe", fontSize: "0.82rem" }}
                    >
                      <span className="text-muted">Total facturable — {profil.name}</span>
                      <span className="fw-bold" style={{ color: "#1e40af" }}>
                        {fmtJH(totalJH)} JH → {fmtAmount(totalAmount, deviseAbr)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Pied total global ── */}
        <div
          className="d-flex justify-content-between align-items-center px-3 py-3"
          style={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
            color: "white",
            borderRadius: "0 0 6px 6px",
          }}
        >
          <span className="fw-bold">TOTAL FACTURABLE GLOBAL</span>
          <span className="fw-bold fs-5">{fmtAmount(grandTotal, deviseAbr)}</span>
        </div>
      </div>
    </div>
  );
};

export default FacturableProfil;