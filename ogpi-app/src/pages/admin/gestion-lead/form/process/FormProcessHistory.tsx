import React, { useEffect, useState, useRef } from "react";
import { Spinner } from "react-bootstrap";
import {
  LeadProcessHistoryService,
  ProcessHistoryData,
  LeadStep,
  ProcessTask,
  TaskValidation,
} from "../../../../../services/lead/LeadProcessHistoryService.tsx";
import "./FormProcessHistory.css";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  lead: any;
  processHistoryService: LeadProcessHistoryService;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function statusDotClass(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("approuv")) return "fph-dot fph-dot--green";
  if (l.includes("modifier") || l.includes("ko")) return "fph-dot fph-dot--red";
  if (l.includes("soumis")) return "fph-dot fph-dot--blue";
  if (l.includes("cours")) return "fph-dot fph-dot--orange";
  return "fph-dot fph-dot--gray";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type DetailPanelProps = {
  step: LeadStep;
  dates: string[];
  task: ProcessTask | null;
  /** Validations provenant de la tâche de l'étape N-1 */
  prevValidations: TaskValidation[] | null;
};

const DetailPanel: React.FC<DetailPanelProps> = ({ step, dates, task, prevValidations }) => (
  <div className="fph-detail-card">
    <div className="fph-detail-header">
      <span className="fph-detail-title">{step.label}</span>
      <span className="fph-detail-count">{dates.length} passage(s)</span>
    </div>

    <div className="fph-detail-body">
      {/* ── Tâche ── */}
      <div className="fph-section">
        <h4 className="fph-section-title">
          {task ? `Tâche — ${task.leadTask.leadTaskName}` : "Tâche"}
        </h4>

        {task ? (
          <>
            <p className="fph-assignee">
              Assigné à&nbsp;:&nbsp;
              <strong>{task.user.username}</strong>
              &nbsp;({task.user.email})
            </p>
            <div className="fph-status-list">
              {[...task.leadTaskUserStatusList]
                .sort(
                  (a, b) =>
                    new Date(a.leadTaskUserStatusDate).getTime() -
                    new Date(b.leadTaskUserStatusDate).getTime()
                )
                .map((s) => (
                  <div key={s.leadTaskUserStatusId} className="fph-status-item">
                    <span className={statusDotClass(s.leadTaskStatus.leadTaskStatusLabel)} />
                    <div className="fph-status-text">
                      <span className="fph-status-label">
                        {s.leadTaskStatus.leadTaskStatusLabel}
                      </span>
                      <span className="fph-status-meta">
                        {fmtDateTime(s.leadTaskUserStatusDate)}
                        {s.leadTaskUserStatusCommentaire
                          ? ` — ${s.leadTaskUserStatusCommentaire}`
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <p className="fph-empty">Aucune tâche liée à cette étape.</p>
        )}
      </div>

      {/* ── Validations (issues de step N-1) ── */}
      {prevValidations && prevValidations.length > 0 && (
        <div className="fph-section">
          <h4 className="fph-section-title">Validations (étape précédente)</h4>
          <div className="fph-val-list">
            {prevValidations.map((v) => (
              <div key={v.id} className="fph-val-item">
                <span
                  className={
                    v.decision === 1
                      ? "fph-badge fph-badge--ok"
                      : "fph-badge fph-badge--ko"
                  }
                >
                  {v.decision === 1 ? "OK" : "KO"}
                </span>
                <div className="fph-val-text">
                  <span className="fph-val-user">
                    {v.user.username}&nbsp;
                    <span className="fph-val-role">({v.role.roleLabel})</span>
                  </span>
                  <span className="fph-status-meta">{fmtDateTime(v.validationTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const FormProcessHistory: React.FC<Props> = ({ lead, processHistoryService }) => {
  const [data, setData] = useState<ProcessHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);

  const fetchedRef = useRef(false);
  const leadId: number = lead?.leadId || lead?.id;

  // Reset when lead changes
  useEffect(() => {
    fetchedRef.current = false;
    setData(null);
    setSelectedStepId(null);
  }, [leadId]);

  useEffect(() => {
    if (!leadId || fetchedRef.current) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await processHistoryService.getProcessHistory(leadId);
        setData(result);
        fetchedRef.current = true;

        // Sélectionner par défaut la dernière étape de l'historique
        if (result.stepHistory.length > 0) {
          const last = result.stepHistory[result.stepHistory.length - 1];
          setSelectedStepId(last.leadStep.id);
        }
      } catch (err) {
        console.error("Erreur chargement historique :", err);
        setError("Impossible de charger l'historique de traitement.");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [leadId]);

  // ── Dérivations ──────────────────────────────────────────────────────────────

  /** Map stepId → liste de dates (ordre chronologique) */
  const stepDatesMap = React.useMemo<Record<number, string[]>>(() => {
    if (!data) return {};
    const map: Record<number, string[]> = {};
    for (const entry of data.stepHistory) {
      const sid = entry.leadStep.id;
      if (!map[sid]) map[sid] = [];
      map[sid].push(entry.dateChangement);
    }
    return map;
  }, [data]);

  const visitedIds = React.useMemo(
    () => new Set(Object.keys(stepDatesMap).map(Number)),
    [stepDatesMap]
  );

  /** Map leadStepId → tâche correspondante */
  const taskByStepId = React.useMemo<Record<number, ProcessTask>>(() => {
    if (!data) return {};
    const map: Record<number, ProcessTask> = {};
    for (const t of data.tasks) {
      map[t.leadTask.leadStepId] = t;
    }
    return map;
  }, [data]);

  const selectedStep = data?.fixedSteps.find((s) => s.id === selectedStepId) ?? null;
  const selectedDates = selectedStepId ? stepDatesMap[selectedStepId] ?? [] : [];
  const selectedTask = selectedStepId != null ? taskByStepId[selectedStepId] ?? null : null;

  /**
   * Validations affichées pour l'étape N = validations de la tâche de l'étape N-1.
   * (La validation Financière affiche les validations de l'Analyse Financière, etc.)
   */
  const prevValidations = React.useMemo<TaskValidation[] | null>(() => {
    if (selectedStepId == null || !data) return null;
    const prevStep = data.fixedSteps.find((s) => s.id === selectedStepId - 1);
    if (!prevStep) return null;
    const prevTask = taskByStepId[prevStep.id];
    return prevTask?.leadTaskValidations ?? null;
  }, [selectedStepId, data, taskByStepId]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fph-center">
        <Spinner animation="border" variant="primary" />
        <p className="fph-loading-text">Chargement de l'historique…</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!data) {
    return <div className="alert alert-warning">Aucune donnée disponible.</div>;
  }

  // Déterminer l'étape courante (dernière de l'historique)
  const currentStepId =
    data.stepHistory.length > 0
      ? data.stepHistory[data.stepHistory.length - 1].leadStep.id
      : null;

  return (
    <div className="fph-wrapper">
      {/* ── Timeline ── */}
      <div className="fph-timeline-scroll">
        <div className="fph-timeline-track">
          {data.fixedSteps.map((step, idx) => {
            const dates = stepDatesMap[step.id] ?? [];
            const visited = visitedIds.has(step.id);
            const isActive = step.id === currentStepId;
            const isNogo = step.id === 2 && visited;
            const isSelected = step.id === selectedStepId;
            const isLast = idx === data.fixedSteps.length - 1;

            let circleClass = "fph-circle";
            if (isNogo) circleClass += " fph-circle--nogo";
            else if (isActive) circleClass += " fph-circle--active";
            else if (visited) circleClass += " fph-circle--done";
            if (isSelected) circleClass += " fph-circle--selected";

            return (
              <React.Fragment key={step.id}>
                <div className="fph-step-col">
                  <div
                    className={circleClass}
                    title={step.label}
                    onClick={() => visited && setSelectedStepId(step.id)}
                    role={visited ? "button" : undefined}
                    tabIndex={visited ? 0 : undefined}
                    onKeyDown={(e) =>
                      visited && e.key === "Enter" && setSelectedStepId(step.id)
                    }
                  >
                    {step.order}
                  </div>
                  <span className="fph-step-label">{step.label}</span>
                  {dates.length > 0 && (
                    <div className="fph-date-pills">
                      {dates.map((d, i) => (
                        <span key={i} className="fph-pill">
                          {fmtDateTime(d)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {!isLast && (
                  <div className={`fph-conn${visited ? " fph-conn--done" : ""}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Panel de détails ── */}
      {selectedStep && (
        <DetailPanel
          step={selectedStep}
          dates={selectedDates}
          task={selectedTask}
          prevValidations={prevValidations}
        />
      )}
    </div>
  );
};

export default FormProcessHistory;