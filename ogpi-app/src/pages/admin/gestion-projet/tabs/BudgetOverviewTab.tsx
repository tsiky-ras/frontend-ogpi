import React, { useMemo } from "react";
import { FaCalendarAlt, FaLayerGroup, FaColumns, FaRunning } from "react-icons/fa";

type Sprint = {
  id: number;
  name: string;
  order: number;
  dateDebut?: string | null;
  dateFin?: string | null;
};

type Phase = {
  id: number;
  name: string;
  order: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  sprints?: Sprint[];
};

type Lot = {
  id: number;
  name: string;
  order: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  phases?: Phase[];
};

type PlanningOverviewTabProps = {
  lots: Lot[];
  projetDateDebut?: string | null;
  projetDateFin?: string | null;
  loading?: boolean;
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

type PlanningRow = {
  id: string;
  level: "lot" | "phase" | "sprint";
  label: string;
  dateDebut?: string | null;
  dateFin?: string | null;
  offsetPercent: number;
  widthPercent: number;
  isOutOfBounds: boolean;
};

const PlanningOverviewTab: React.FC<PlanningOverviewTabProps> = ({
  lots, projetDateDebut, projetDateFin, loading,
}) => {
  const rows = useMemo<PlanningRow[]>(() => {
    const pStart = projetDateDebut ? new Date(projetDateDebut).getTime() : null;
    const pEnd = projetDateFin ? new Date(projetDateFin).getTime() : null;
    const totalMs = pStart && pEnd ? pEnd - pStart : null;

    const calcBar = (start?: string | null, end?: string | null) => {
      if (!totalMs || !pStart || !pEnd || !start || !end) {
        return { offsetPercent: 0, widthPercent: 0, isOutOfBounds: false };
      }
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const offset = Math.max(0, ((s - pStart) / totalMs) * 100);
      const width = Math.max(1, (Math.min(e, pEnd) - Math.max(s, pStart)) / totalMs * 100);
      const isOutOfBounds = s < pStart || e > pEnd;
      return { offsetPercent: offset, widthPercent: width, isOutOfBounds };
    };

    const result: PlanningRow[] = [];
    lots.sort((a, b) => a.order - b.order).forEach(lot => {
      result.push({
        id: `lot-${lot.id}`, level: "lot",
        label: `${lot.order}. ${lot.name}`,
        dateDebut: lot.dateDebut, dateFin: lot.dateFin,
        ...calcBar(lot.dateDebut, lot.dateFin),
      });
      (lot.phases ?? []).sort((a, b) => a.order - b.order).forEach(phase => {
        result.push({
          id: `phase-${phase.id}`, level: "phase",
          label: `  ${phase.order}. ${phase.name}`,
          dateDebut: phase.dateDebut, dateFin: phase.dateFin,
          ...calcBar(phase.dateDebut, phase.dateFin),
        });
        (phase.sprints ?? []).sort((a, b) => a.order - b.order).forEach(sprint => {
          result.push({
            id: `sprint-${sprint.id}`, level: "sprint",
            label: `    Sprint ${sprint.order} — ${sprint.name}`,
            dateDebut: sprint.dateDebut, dateFin: sprint.dateFin,
            ...calcBar(sprint.dateDebut, sprint.dateFin),
          });
        });
      });
    });
    return result;
  }, [lots, projetDateDebut, projetDateFin]);

  if (loading) return (
    <div className="struct-loading"><div className="struct-spinner" /><span>Chargement du planning…</span></div>
  );

  if (!lots.length) return (
    <div className="struct-empty"><FaCalendarAlt size={32} opacity={0.3} /><p>Aucune donnée de planning disponible.</p></div>
  );

  const hasTimeline = !!(projetDateDebut && projetDateFin);

  return (
    <div className="planning-container">
      {hasTimeline && (
        <div className="planning-header-dates">
          <div className="planning-header-date">
            <FaCalendarAlt className="me-1" />
            Début projet : <strong>{fmt(projetDateDebut)}</strong>
          </div>
          <div className="planning-header-date">
            <FaCalendarAlt className="me-1" />
            Fin projet : <strong>{fmt(projetDateFin)}</strong>
          </div>
        </div>
      )}

      <div className="planning-table-wrapper">
        <table className="planning-table">
          <thead>
            <tr>
              <th className="planning-col-label">Élément</th>
              <th className="planning-col-dates">Début</th>
              <th className="planning-col-dates">Fin</th>
              {hasTimeline && <th className="planning-col-bar">Chronologie du projet</th>}
              {hasTimeline && <th className="planning-col-status">Statut</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className={`planning-row planning-row--${row.level}`}>
                <td className="planning-col-label">
                  <div className="planning-label-cell">
                    {row.level === "lot" && <FaLayerGroup size={11} className="planning-row-icon planning-row-icon--lot" />}
                    {row.level === "phase" && <FaColumns size={10} className="planning-row-icon planning-row-icon--phase" />}
                    {row.level === "sprint" && <FaRunning size={10} className="planning-row-icon planning-row-icon--sprint" />}
                    <span style={{ paddingLeft: row.level === "phase" ? "1rem" : row.level === "sprint" ? "2rem" : 0 }}>
                      {row.label.trimStart()}
                    </span>
                  </div>
                </td>
                <td className="planning-col-dates">{fmt(row.dateDebut)}</td>
                <td className="planning-col-dates">{fmt(row.dateFin)}</td>
                {hasTimeline && (
                  <td className="planning-col-bar">
                    <div className="planning-bar-track">
                      {row.dateDebut && row.dateFin && (
                        <div
                          className={`planning-bar planning-bar--${row.level} ${row.isOutOfBounds ? "planning-bar--oob" : ""}`}
                          style={{ left: `${row.offsetPercent}%`, width: `${row.widthPercent}%` }}
                          title={`${fmt(row.dateDebut)} → ${fmt(row.dateFin)}`}
                        />
                      )}
                    </div>
                  </td>
                )}
                {hasTimeline && (
                  <td className="planning-col-status">
                    {row.dateDebut && row.dateFin ? (
                      row.isOutOfBounds
                        ? <span className="planning-status planning-status--warn">⚠ Hors bornes</span>
                        : <span className="planning-status planning-status--ok">✓ OK</span>
                    ) : <span className="planning-status planning-status--nd">—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlanningOverviewTab;