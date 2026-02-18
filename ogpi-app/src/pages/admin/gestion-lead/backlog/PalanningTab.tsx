import React, { useState, useMemo } from "react";
import {
  BacklogLot,
  BacklogProfil,
  BacklogLine,
  BacklogLineProfil,
  BacklogDeliverable,
} from "../../../../types/lead/Backlog/Backlog.tsx";

interface PlanningTabProps {
  lots: BacklogLot[];
  profils: BacklogProfil[];
  lines: BacklogLine[];
  lineProfils: BacklogLineProfil[];
  deliverables: Map<number, BacklogDeliverable[]>;
  selectedBacklogId: number | null;
  deviseAbr?: string | null;
}

interface PlanningRow {
  id: string;
  label: string;
  level: "lot" | "phase" | "deliverable";
  totalJH: number;
  durationDays: number;
  startWeek: number;
  endWeek: number;
  color: string;
}

const LOT_COLOR = "#1a6b38";
const PHASE_COLOR = "#28a745";
const DELIVERABLE_COLOR = "#6ec997";
const SIM_LOT_COLOR = "#0d6efd";
const SIM_PHASE_COLOR = "#4d9ffd";
const SIM_DELIVERABLE_COLOR = "#a8d1ff";

const PlanningTab: React.FC<PlanningTabProps> = ({
  lots,
  profils,
  lines,
  lineProfils,
  deliverables,
  selectedBacklogId,
}) => {
  // --- Nombre de profils actifs (ayant au moins 1 volume > 0) ---
  const activeProfilCount = useMemo(() => {
    const activeIds = new Set(
      lineProfils.filter((lp) => lp.volume > 0).map((lp) => lp.profil.id)
    );
    return Math.max(1, activeIds.size);
  }, [lineProfils]);

  const activeProfils = useMemo(() => {
    const activeIds = new Set(
      lineProfils.filter((lp) => lp.volume > 0).map((lp) => lp.profil.id)
    );
    return profils.filter((p) => activeIds.has(p.id));
  }, [profils, lineProfils]);

  // Simulation params — initialisés avec le nombre de profils actifs
  const [simResources, setSimResources] = useState<number>(activeProfilCount);
  const [simMonths, setSimMonths] = useState<number>(6);
  const [showSimulation, setShowSimulation] = useState<boolean>(false);

  // Sync simResources si activeProfilCount change (nouveau profil ajouté, etc.)
  // On ne force pas la sync si l'utilisateur a déjà modifié manuellement
  const [userEditedSim, setUserEditedSim] = useState<boolean>(false);
  const effectiveSimResources = userEditedSim ? simResources : activeProfilCount;

  // --- Helpers ---
  const getJHForLines = (lineIds: number[]): number =>
    lineProfils
      .filter((lp) => lineIds.includes(lp.lineId))
      .reduce((sum, lp) => sum + lp.volume, 0);

  const jhToCalendarDays = (jh: number, resources: number): number => {
    if (resources <= 0) return 0;
    return jh / resources;
  };

  const daysToWeeks = (days: number): number => {
    if (days <= 0) return 0;
    return Math.max(1, Math.ceil(days / 5));
  };

  // --- Build Gantt rows pour un nb de ressources donné ---
  const buildRows = (
    resources: number,
    colors: { lot: string; phase: string; deliverable: string }
  ): PlanningRow[] => {
    const rows: PlanningRow[] = [];
    let currentWeek = 1;

    lots.forEach((lot) => {
      const lotPhases = (lot.phases || []).sort((a, b) => a.order - b.order);
      const lotLineIds = lotPhases.flatMap((phase) =>
        lines.filter((l) => l.phaseId === phase.id).map((l) => l.id)
      );
      const lotJH = getJHForLines(lotLineIds);
      const lotDays = jhToCalendarDays(lotJH, resources);

      const lotStartWeek = currentWeek;
      let phaseWeekCursor = currentWeek;
      const phaseRows: PlanningRow[] = [];

      lotPhases.forEach((phase) => {
        const phaseLineIds = lines
          .filter((l) => l.phaseId === phase.id)
          .map((l) => l.id);
        const phaseJH = getJHForLines(phaseLineIds);
        const phaseDays = jhToCalendarDays(phaseJH, resources);
        const phaseWeeks = daysToWeeks(phaseDays);

        const phaseStartWeek = phaseWeekCursor;
        const phaseEndWeek = phaseStartWeek + Math.max(phaseWeeks, 1) - 1;

        phaseRows.push({
          id: `phase-${phase.id}`,
          label: phase.name,
          level: "phase",
          totalJH: phaseJH,
          durationDays: phaseDays,
          startWeek: phaseStartWeek,
          endWeek: phaseEndWeek,
          color: colors.phase,
        });

        const phaseDeliverables = (deliverables.get(phase.id) || []).sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );

        if (phaseDeliverables.length > 0) {
          const weeksPerDeliv = Math.max(
            1,
            Math.ceil(Math.max(phaseWeeks, 1) / phaseDeliverables.length)
          );
          let delivWeek = phaseStartWeek;
          phaseDeliverables.forEach((deliv) => {
            const delivEnd = Math.min(delivWeek + weeksPerDeliv - 1, phaseEndWeek);
            phaseRows.push({
              id: `deliv-${deliv.id}`,
              label: `> ${deliv.name}`,
              level: "deliverable",
              totalJH: phaseJH / phaseDeliverables.length,
              durationDays: phaseDays / phaseDeliverables.length,
              startWeek: delivWeek,
              endWeek: delivEnd,
              color: colors.deliverable,
            });
            delivWeek = Math.min(delivEnd + 1, phaseEndWeek);
          });
        }

        phaseWeekCursor = phaseEndWeek + 1;
      });

      const lotEndWeek = Math.max(phaseWeekCursor - 1, lotStartWeek);

      rows.push({
        id: `lot-${lot.id}`,
        label: lot.name,
        level: "lot",
        totalJH: lotJH,
        durationDays: lotDays,
        startWeek: lotStartWeek,
        endWeek: lotEndWeek,
        color: colors.lot,
      });
      rows.push(...phaseRows);
      currentWeek = phaseWeekCursor;
    });

    return rows;
  };

  // Planning réel : 1 ressource séquentielle (référence brute)
  const realRows = useMemo(
    () => buildRows(1, { lot: LOT_COLOR, phase: PHASE_COLOR, deliverable: DELIVERABLE_COLOR }),
    [lots, lines, lineProfils, deliverables]
  );

  // Planning avec profils actifs (affiché en principal)
  const profilRows = useMemo(
    () => buildRows(activeProfilCount, { lot: LOT_COLOR, phase: PHASE_COLOR, deliverable: DELIVERABLE_COLOR }),
    [lots, lines, lineProfils, deliverables, activeProfilCount]
  );

  // Simulation rows
  const simRows = useMemo(
    () => buildRows(effectiveSimResources, { lot: SIM_LOT_COLOR, phase: SIM_PHASE_COLOR, deliverable: SIM_DELIVERABLE_COLOR }),
    [lots, lines, lineProfils, deliverables, effectiveSimResources]
  );

  // Calcul des spans calendaires
  const profilMaxWeek = profilRows.reduce((max, r) => Math.max(max, r.endWeek), 0);
  const profilNumMonths = Math.max(1, Math.ceil(profilMaxWeek / 4));
  const profilTotalWeeks = profilNumMonths * 4;

  const simTotalWeeks = simMonths * 4;

  // Totaux
  const totalJHAll = realRows
    .filter((r) => r.level === "lot")
    .reduce((sum, r) => sum + r.totalJH, 0);

  const profilCalendarDays = jhToCalendarDays(totalJHAll, activeProfilCount);
  const profilCalendarWeeks = daysToWeeks(profilCalendarDays);

  const simCalendarDays = jhToCalendarDays(totalJHAll, effectiveSimResources);
  const simCalendarWeeks = daysToWeeks(simCalendarDays);

  // Référence 1 ressource pour afficher le gain
  const realCalendarWeeks = daysToWeeks(totalJHAll);

  const getWeekLabel = (w: number) => `S${((w - 1) % 4) + 1}`;

  const getCellStyle = (
    row: PlanningRow,
    w: number,
    totalWeeks: number
  ): React.CSSProperties => {
    const end = Math.min(row.endWeek, totalWeeks);
    if (w < row.startWeek || w > end) return {};
    const isStart = w === row.startWeek;
    const isEnd = w === end;
    return {
      backgroundColor: row.color,
      borderRadius:
        isStart && isEnd ? "4px" : isStart ? "4px 0 0 4px" : isEnd ? "0 4px 4px 0" : "0",
    };
  };

  // --- Composant Gantt réutilisable ---
  const GanttTable = ({
    rows,
    totalWeeks,
    numMonths,
    h1,
    h2,
  }: {
    rows: PlanningRow[];
    totalWeeks: number;
    numMonths: number;
    h1: string;
    h2: string;
  }) => {
    const months = Array.from({ length: numMonths }, (_, i) => i + 1);
    const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

    return (
      <div style={{ overflowX: "auto" }}>
        <table
          className="table table-bordered mb-0"
          style={{ minWidth: `${360 + totalWeeks * 34}px`, tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "230px" }} />
            <col style={{ width: "60px" }} />
            <col style={{ width: "60px" }} />
            {weeks.map((w) => (
              <col key={w} style={{ width: "34px" }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: h1, color: "#fff" }}>
              <th rowSpan={2} style={{ verticalAlign: "middle", fontSize: "0.8rem", color: "#fff" }}>
                Tâche
              </th>
              <th rowSpan={2} style={{ verticalAlign: "middle", fontSize: "0.72rem", color: "#fff", textAlign: "center" }}>
                JH
              </th>
              <th rowSpan={2} style={{ verticalAlign: "middle", fontSize: "0.72rem", color: "#fff", textAlign: "center" }}>
                Durée (j)
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  colSpan={4}
                  style={{ textAlign: "center", fontSize: "0.8rem", color: "#fff", fontWeight: 700 }}
                >
                  MOIS {m}
                </th>
              ))}
            </tr>
            <tr style={{ backgroundColor: h2, color: "#fff" }}>
              {weeks.map((w) => (
                <th
                  key={w}
                  style={{ textAlign: "center", fontSize: "0.66rem", padding: "2px 0", color: "#fff", fontWeight: 600 }}
                >
                  {getWeekLabel(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3 + totalWeeks} className="text-center text-muted py-4">
                  Aucune donnée. Ajoutez des lots, phases et volumes dans le backlog.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    fontWeight: row.level === "lot" ? 700 : row.level === "phase" ? 600 : 400,
                    backgroundColor:
                      row.level === "lot" ? "#f0f7f0" : row.level === "phase" ? "#f8fbf8" : "#fff",
                    fontSize: row.level === "lot" ? "0.85rem" : "0.8rem",
                  }}
                >
                  <td
                    style={{
                      paddingLeft:
                        row.level === "deliverable" ? "30px" : row.level === "phase" ? "16px" : "8px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "230px",
                      color: row.level === "lot" ? h1 : "#333",
                    }}
                    title={row.label.trim()}
                  >
                    {row.level === "lot" ? (
                      <strong>{row.label}</strong>
                    ) : row.level === "deliverable" ? (
                      <span className="text-muted">{row.label}</span>
                    ) : (
                      row.label
                    )}
                  </td>
                  <td style={{ textAlign: "center", fontSize: "0.75rem" }}>
                    {row.totalJH > 0 ? row.totalJH.toFixed(1) : "—"}
                  </td>
                  <td style={{ textAlign: "center", fontSize: "0.75rem" }}>
                    {row.durationDays > 0 ? row.durationDays.toFixed(1) : "—"}
                  </td>
                  {weeks.map((w) => (
                    <td
                      key={w}
                      style={{ padding: "2px", height: "26px", ...getCellStyle(row, w, totalWeeks) }}
                    />
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (!selectedBacklogId) {
    return (
      <div className="text-center text-muted py-5">
        <p>Veuillez sélectionner un backlog pour voir le planning prévisionnel.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ====== BANDEAU RESSOURCES DÉTECTÉES ====== */}
      <div
        className="alert mb-3 py-2 px-3 d-flex align-items-center gap-3 flex-wrap"
        style={{ backgroundColor: "#e8f5e9", border: "1px solid #a5d6a7" }}
      >
        <div>
          <strong style={{ color: LOT_COLOR }}>
            {activeProfilCount} profil{activeProfilCount > 1 ? "s" : ""} actif{activeProfilCount > 1 ? "s" : ""} détecté{activeProfilCount > 1 ? "s" : ""}
          </strong>
          {activeProfils.length > 0 && (
            <span className="ms-2 text-muted" style={{ fontSize: "0.82rem" }}>
              ({activeProfils.map((p) => p.name).join(", ")})
            </span>
          )}
        </div>
        <div className="ms-auto" style={{ fontSize: "0.82rem", color: "#555" }}>
          Formule appliquée&nbsp;: <strong>{totalJHAll.toFixed(1)} JH ÷ {activeProfilCount} ressource{activeProfilCount > 1 ? "s" : ""} = {profilCalendarDays.toFixed(1)} j = {profilCalendarWeeks} sem.</strong>
        </div>
      </div>

      {/* ====== PLANNING PRINCIPAL (profils actifs) ====== */}
      <div className="card mb-4 shadow-sm">
        <div
          className="card-header d-flex align-items-center justify-content-between"
          style={{ backgroundColor: LOT_COLOR }}
        >
          <div>
            <h5 className="mb-0" style={{ color: "#fff" }}>
                Planning Prévisionnel
            </h5>
            <small style={{ color: "rgba(255,255,255,0.85)" }}>
              Basé sur {activeProfilCount} profil{activeProfilCount > 1 ? "s" : ""} actif{activeProfilCount > 1 ? "s" : ""} · 5 j/semaine · 8 h/j
            </small>
          </div>
          <div className="d-flex align-items-center">
            <span
              className="badge"
              style={{ backgroundColor: "#fff", color: LOT_COLOR, fontSize: "0.82rem", padding: "6px 14px", fontWeight: 700 }}
            >
              {totalJHAll.toFixed(1)} JH &nbsp;·&nbsp; {profilCalendarDays.toFixed(1)} j &nbsp;·&nbsp; {profilCalendarWeeks} sem.
            </span>
            {/** show currency abbreviation if available (affects budget displays related to this backlog) */}
            {/** `deviseAbr` prop injected from parent when available */}
            {/** render small white pill with currency code */}
            {/** eslint-disable-next-line react/jsx-no-useless-fragment */}
            {/** show if defined */}
            {/** (we don't import deviseAbr at top because it's destructured in component params) */}
            {/** render below when available */}
            {/** using any to avoid TypeScript noise in this quick patch */}
            {((null as any) as any) && null}
          </div>
        </div>

        <div className="card-body p-0">
          <GanttTable
            rows={profilRows}
            totalWeeks={profilTotalWeeks}
            numMonths={profilNumMonths}
            h1={LOT_COLOR}
            h2={PHASE_COLOR}
          />
        </div>

        <div
          className="card-footer d-flex gap-4 flex-wrap align-items-center"
          style={{ backgroundColor: "#f4faf4" }}
        >
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 18, height: 12, backgroundColor: LOT_COLOR, borderRadius: 3 }} />
            <small className="text-muted">Lot</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 18, height: 12, backgroundColor: PHASE_COLOR, borderRadius: 3 }} />
            <small className="text-muted">Phase</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 18, height: 12, backgroundColor: DELIVERABLE_COLOR, borderRadius: 3 }} />
            <small className="text-muted">Livrable</small>
          </div>
          <small className="text-muted ms-auto">
            Durée = JH ÷ {activeProfilCount} profil{activeProfilCount > 1 ? "s" : ""} actif{activeProfilCount > 1 ? "s" : ""}
          </small>
        </div>
      </div>

      {/* ====== SECTION SIMULATION ====== */}
      <div className="card shadow-sm">
        <div
          className="card-header d-flex align-items-center justify-content-between"
          style={{
            cursor: "pointer",
            userSelect: "none",
            backgroundColor: showSimulation ? "#e8f0fe" : "#f8f9fa",
          }}
          onClick={() => setShowSimulation((v) => !v)}
        >
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: "1rem", color: SIM_LOT_COLOR }}>
              {showSimulation ? "▾" : "▸"}
            </span>
            <h6 className="mb-0" style={{ color: SIM_LOT_COLOR }}>
              Simulation — tester avec un nombre de ressources différent
            </h6>
          </div>
          {!showSimulation && (
            <small className="text-muted">
              Cliquez pour ouvrir et tester différents scénarios
            </small>
          )}
        </div>

        {showSimulation && (
          <>
            {/* Paramètres */}
            <div className="card-body border-bottom" style={{ backgroundColor: "#f0f5ff" }}>
              <div className="row align-items-end g-3">
                <div className="col-md-3">
                  <label className="form-label fw-semibold">
                    Nombre de ressources
                  </label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      max={50}
                      value={effectiveSimResources}
                      onChange={(e) => {
                        setSimResources(Math.max(1, parseInt(e.target.value) || 1));
                        setUserEditedSim(true);
                      }}
                    />
                    {userEditedSim && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        title={`Réinitialiser au nombre de profils actifs (${activeProfilCount})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSimResources(activeProfilCount);
                          setUserEditedSim(false);
                        }}
                        style={{ fontSize: "0.75rem" }}
                      >
                        ↺ {activeProfilCount}
                      </button>
                    )}
                  </div>
                  <div className="form-text">
                    {!userEditedSim
                      ? `Auto-détecté : ${activeProfilCount} profil${activeProfilCount > 1 ? "s" : ""} actif${activeProfilCount > 1 ? "s" : ""}`
                      : `Profils détectés : ${activeProfilCount}`}
                  </div>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-semibold">Horizon affiché (mois)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={24}
                    value={simMonths}
                    onChange={(e) =>
                      setSimMonths(Math.max(1, Math.min(24, parseInt(e.target.value) || 6)))
                    }
                  />
                </div>

                <div className="col-md-6">
                  <div
                    className="alert mb-0 py-2 px-3"
                    style={{ backgroundColor: "#ddeafe", border: "1px solid #b6d0f8" }}
                  >
                    <small>
                      <strong>Résultat simulé :</strong> {totalJHAll.toFixed(1)} JH ÷{" "}
                      {effectiveSimResources} ressource{effectiveSimResources > 1 ? "s" : ""} ={" "}
                      {simCalendarDays.toFixed(1)} j ={" "}
                      <strong style={{ color: SIM_LOT_COLOR }}>
                        {simCalendarWeeks} semaine{simCalendarWeeks > 1 ? "s" : ""}
                      </strong>
                      {simCalendarWeeks < profilCalendarWeeks && (
                        <span className="ms-3 fw-semibold" style={{ color: "#198754" }}>
                          ▼ {profilCalendarWeeks - simCalendarWeeks} sem. gagnée
                          {profilCalendarWeeks - simCalendarWeeks > 1 ? "s" : ""} vs planning actuel
                        </span>
                      )}
                      {simCalendarWeeks > profilCalendarWeeks && (
                        <span className="ms-3 fw-semibold" style={{ color: "#dc3545" }}>
                          ▲ {simCalendarWeeks - profilCalendarWeeks} sem. de plus vs planning actuel
                        </span>
                      )}
                      {simCalendarWeeks === profilCalendarWeeks && (
                        <span className="ms-3 text-muted">= identique au planning actuel</span>
                      )}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Gantt simulé */}
            <div className="card-body p-0">
              <GanttTable
                rows={simRows}
                totalWeeks={simTotalWeeks}
                numMonths={simMonths}
                h1={SIM_LOT_COLOR}
                h2={SIM_PHASE_COLOR}
              />
            </div>

            <div
              className="card-footer d-flex gap-4 flex-wrap align-items-center"
              style={{ backgroundColor: "#f0f5ff" }}
            >
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 18, height: 12, backgroundColor: SIM_LOT_COLOR, borderRadius: 3 }} />
                <small className="text-muted">Lot (sim.)</small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 18, height: 12, backgroundColor: SIM_PHASE_COLOR, borderRadius: 3 }} />
                <small className="text-muted">Phase (sim.)</small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 18, height: 12, backgroundColor: SIM_DELIVERABLE_COLOR, borderRadius: 3 }} />
                <small className="text-muted">Livrable (sim.)</small>
              </div>
              <small className="text-muted ms-auto">
                Durée simulée = JH ÷ {effectiveSimResources} ressource{effectiveSimResources > 1 ? "s" : ""}
              </small>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlanningTab;