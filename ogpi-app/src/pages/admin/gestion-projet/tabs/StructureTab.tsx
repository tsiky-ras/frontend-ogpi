import React, { useEffect, useState } from "react";
import { FaChevronDown, FaChevronRight, FaLayerGroup, FaColumns, FaRunning, FaCalendarAlt } from "react-icons/fa";

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
  desc?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  phases?: Phase[];
};

type StructureTabProps = {
  lots: Lot[];
  loading?: boolean;
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : null;

const DateRange: React.FC<{ start?: string | null; end?: string | null }> = ({ start, end }) => {
  const s = fmt(start);
  const e = fmt(end);
  if (!s && !e) return null;
  return (
    <span className="struct-dates">
      <FaCalendarAlt size={10} className="me-1" />
      {s ?? "?"} → {e ?? "?"}
    </span>
  );
};

const StructureTab: React.FC<StructureTabProps> = ({ lots, loading }) => {
  const [expandedLots, setExpandedLots] = useState<Set<number>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (lots.length > 0) setExpandedLots(new Set([lots[0].id]));
  }, [lots]);

  const toggleLot = (id: number) =>
    setExpandedLots(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const togglePhase = (id: number) =>
    setExpandedPhases(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  if (loading) return (
    <div className="struct-loading"><div className="struct-spinner" /><span>Chargement de la structure…</span></div>
  );

  if (!lots.length) return (
    <div className="struct-empty"><FaLayerGroup size={32} opacity={0.3} /><p>Aucun lot défini pour ce projet.</p></div>
  );

  return (
    <div className="struct-tree">
      {lots.sort((a, b) => a.order - b.order).map(lot => {
        const lotOpen = expandedLots.has(lot.id);
        const phases = lot.phases ?? [];
        return (
          <div key={lot.id} className="struct-lot">
            <div className={`struct-row struct-row--lot ${lotOpen ? "struct-row--open" : ""}`} onClick={() => toggleLot(lot.id)}>
              <span className="struct-toggle">{lotOpen ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}</span>
              <FaLayerGroup size={13} className="struct-icon struct-icon--lot" />
              <span className="struct-label"><strong>{lot.order}.</strong> {lot.name}</span>
              {lot.desc && <span className="struct-desc">{lot.desc}</span>}
              <div className="struct-meta">
                <DateRange start={lot.dateDebut} end={lot.dateFin} />
                <span className="struct-badge struct-badge--lot">{phases.length} phase{phases.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            {lotOpen && (
              <div className="struct-phases">
                {phases.length === 0 ? (
                  <div className="struct-empty-child">Aucune phase</div>
                ) : phases.sort((a, b) => a.order - b.order).map(phase => {
                  const phaseOpen = expandedPhases.has(phase.id);
                  const sprints = phase.sprints ?? [];
                  return (
                    <div key={phase.id} className="struct-phase">
                      <div className={`struct-row struct-row--phase ${phaseOpen ? "struct-row--open" : ""}`} onClick={() => togglePhase(phase.id)}>
                        <span className="struct-toggle">{phaseOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}</span>
                        <FaColumns size={12} className="struct-icon struct-icon--phase" />
                        <span className="struct-label">{phase.order}. {phase.name}</span>
                        <div className="struct-meta">
                          <DateRange start={phase.dateDebut} end={phase.dateFin} />
                          <span className="struct-badge struct-badge--phase">{sprints.length} sprint{sprints.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      {phaseOpen && (
                        <div className="struct-sprints">
                          {sprints.length === 0 ? (
                            <div className="struct-empty-child">Aucun sprint</div>
                          ) : sprints.sort((a, b) => a.order - b.order).map(sprint => (
                            <div key={sprint.id} className="struct-row struct-row--sprint">
                              <span className="struct-toggle" />
                              <FaRunning size={11} className="struct-icon struct-icon--sprint" />
                              <span className="struct-label">Sprint {sprint.order} — {sprint.name}</span>
                              <div className="struct-meta"><DateRange start={sprint.dateDebut} end={sprint.dateFin} /></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StructureTab;