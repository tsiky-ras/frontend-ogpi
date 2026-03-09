import React, { useState, useEffect, useCallback } from "react";
import {
  FaChevronDown, FaChevronUp, FaUser, FaClock, FaFolderOpen, FaBriefcase,
  FaCheckCircle, FaArrowRight, FaSpinner, FaInbox, FaTimesCircle,
  FaHourglassHalf, FaTag, FaLayerGroup, FaBook, FaCoins, FaEdit,
} from "react-icons/fa";

import "./MesTachesBacklog.css";
import { BacklogTaskService } from "../../../../services/projet/backlog/BacklogTaskService.tsx";
import {
  PROJECT_TASK_STATUS, BacklogTaskStatusHistory,
  ChangingStatusDTO, BacklogLineProfilAsTask,
} from "../../../../types/lead/Backlog/BacklogTaskTypes.tsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const n = iso.endsWith("Z") ? iso.slice(0, -1) : iso;
  try {
    return new Date(n).toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
};

const progressColor = (pct: number) =>
  pct > 100 ? "#dc3545" : pct >= 80 ? "#ffc107" : "#198754";

const STATUS_META: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Affecté",               color: "#3b82f6", bg: "#eff6ff" },
  2: { label: "Réattribué",            color: "#f59e0b", bg: "#fffbeb" },
  3: { label: "À modifier",            color: "#ef4444", bg: "#fef2f2" },
  4: { label: "En cours",              color: "#8b5cf6", bg: "#f5f3ff" },
  5: { label: "En attente validation", color: "#f97316", bg: "#fff7ed" },
  6: { label: "Validé",                color: "#10b981", bg: "#ecfdf5" },
};
const statusMeta = (id: number) => STATUS_META[id] ?? { label: "Inconnu", color: "#64748b", bg: "#f1f5f9" };

const NEXT_STATUS: Record<number, number> = {
  [PROJECT_TASK_STATUS.AFFECTE]:    PROJECT_TASK_STATUS.EN_COURS,
  [PROJECT_TASK_STATUS.REATTRIBUE]: PROJECT_TASK_STATUS.EN_COURS,
  [PROJECT_TASK_STATUS.A_MODIFIER]: PROJECT_TASK_STATUS.EN_COURS,
  [PROJECT_TASK_STATUS.EN_COURS]:   PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION,
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ statusId: number }> = ({ statusId }) => {
  const m = statusMeta(statusId);
  return (
    <span className="btb-badge" style={{ color: m.color, background: m.bg, borderColor: m.color + "33" }}>
      {m.label}
    </span>
  );
};

// ─── ProjetLeadChips ─────────────────────────────────────────────────────────
const ProjetLeadChips: React.FC<{ task: BacklogLineProfilAsTask }> = ({ task }) => (
  <>
    {task.projetNom && (
      <span className="btb-meta-chip btb-meta-chip--projet">
        <FaFolderOpen size={9} /> {task.projetNom}
      </span>
    )}
    {task.leadNom && (
      <span className="btb-meta-chip btb-meta-chip--lead">
        <FaBriefcase size={9} /> {task.leadNom}
      </span>
    )}
  </>
);

// ─── ProgressBar ─────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ timeSpent: number; volume: number }> = ({ timeSpent, volume }) => {
  const pct = volume > 0 ? Math.round((timeSpent / volume) * 100) : 0;
  return (
    <div className="btb-progress-wrap">
      <div className="btb-progress-track">
        <div className="btb-progress-fill"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: progressColor(pct) }} />
      </div>
      <span className="btb-progress-label" style={{ color: progressColor(pct) }}>
        {pct}%{pct > 100 && " ⚠"}
      </span>
    </div>
  );
};

// ─── TimeSpentModal ───────────────────────────────────────────────────────────
interface TimeSpentModalProps {
  task: BacklogLineProfilAsTask;
  service: BacklogTaskService;
  onUpdated: (ts: number | null) => void;
  onClose: () => void;
}
const TimeSpentModal: React.FC<TimeSpentModalProps> = ({ task, service, onUpdated, onClose }) => {
  const devise = task.deviseAbr || "€";
  const [value, setValue] = useState<string>(task.timeSpent != null ? String(task.timeSpent) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = task.volume > 0 && value !== ""
    ? Math.round((parseFloat(value) / task.volume) * 100) : null;

  const handleSave = async () => {
    const ts = value === "" ? null : parseFloat(value);
    if (ts !== null && isNaN(ts)) return;
    setSaving(true); setError(null);
    try {
      await service.updateTimeSpent(task.id, ts);
      onUpdated(ts); onClose();
    } catch { setError("Erreur lors de la mise à jour."); }
    finally { setSaving(false); }
  };

  return (
    <div className="btb-modal-backdrop" onClick={onClose}>
      <div className="btb-modal" onClick={e => e.stopPropagation()}>
        <div className="btb-modal-header">
          <span>Temps passé — <strong>{task.profil.name}</strong></span>
          <button className="btb-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="btb-modal-body">
          {/* Projet + Lead */}
          {(task.projetNom || task.leadNom) && (
            <div className="btb-modal-context">
              {task.projetNom && <span><FaFolderOpen size={10} /> <strong>{task.projetNom}</strong></span>}
              {task.leadNom   && <span><FaBriefcase size={10} /> {task.leadNom}</span>}
            </div>
          )}

          {error && <div className="btb-comment-error">{error}</div>}

          <label className="btb-modal-label">Temps passé (JH)</label>
          <input type="number" step="0.5" min="0" className="btb-modal-input"
            value={value} onChange={e => setValue(e.target.value)}
            onWheel={e => (e.target as HTMLInputElement).blur()} autoFocus />

          {pct != null && (
            <div className="btb-modal-progress-wrap">
              <div className="btb-progress-track" style={{ height: 8 }}>
                <div className="btb-progress-fill"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: progressColor(pct) }} />
              </div>
              <p className="btb-modal-progress-text" style={{ color: progressColor(pct) }}>
                {value} JH passés sur {task.volume} JH planifiés
                {parseFloat(value) > task.volume && " — ⚠ Dépassement"}
              </p>
            </div>
          )}

          {task.deadLine && (
            <div className="btb-modal-info">
              <FaClock size={10} /> 
              <span> Deadline : {fmtDateTime(task.deadLine)}</span>
            </div>
          )}

          <div className="btb-modal-kpi-row">
            <div className="btb-kpi">
              <span className="btb-kpi-val">{task.volume} JH</span>
              <span className="btb-kpi-lbl">Planifié</span>
            </div>
            <div className="btb-kpi">
              <span className="btb-kpi-val">{task.profil.tjm} {devise}</span>
              <span className="btb-kpi-lbl">TJM</span>
            </div>
            <div className="btb-kpi">
              <span className="btb-kpi-val">{(task.volume * task.profil.tjm).toFixed(0)} {devise}</span>
              <span className="btb-kpi-lbl">Coût estimé</span>
            </div>
          </div>
        </div>
        <div className="btb-modal-footer">
          <button className="btb-btn btb-btn--ghost btb-btn--sm" onClick={onClose} disabled={saving}>Annuler</button>
          <button className="btb-btn btb-btn--primary btb-btn--sm" onClick={handleSave} disabled={saving}>
            {saving ? <FaSpinner className="btb-spin" /> : <FaCheckCircle size={11} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── StatusSlider ─────────────────────────────────────────────────────────────
const STEPS_TODO = [
  { id: PROJECT_TASK_STATUS.AFFECTE,               label: "Affecté" },
  { id: PROJECT_TASK_STATUS.EN_COURS,              label: "En cours" },
  { id: PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION, label: "Soumis" },
];

const StatusSlider: React.FC<{
  currentStatusId: number; taskId: number;
  service: BacklogTaskService;
  onStatusChanged: (h: BacklogTaskStatusHistory) => void;
}> = ({ currentStatusId, taskId, service, onStatusChanged }) => {
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const nextId = NEXT_STATUS[currentStatusId] ?? null;
  const isTerminal = currentStatusId === PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION
    || currentStatusId === PROJECT_TASK_STATUS.VALIDE;
  const currentIdx = currentStatusId === PROJECT_TASK_STATUS.A_MODIFIER
    ? 0 : STEPS_TODO.findIndex(s => s.id === currentStatusId);
  const displayIdx = currentIdx >= 0 ? currentIdx : 0;

  const handleConfirm = async () => {
    if (!nextId) return;
    setSaving(true); setError(null);
    try {
      const dto: ChangingStatusDTO = { idStatus: nextId, comment: comment.trim() || "Changement de statut", backlogLineProfilId: taskId };
      const result = await service.changeStatus(dto);
      setPending(false); setComment(""); onStatusChanged(result);
    } catch { setError("Erreur lors du changement de statut."); }
    finally { setSaving(false); }
  };

  return (
    <div className="btb-slider-wrapper">
      <div className="btb-slider-track">
        {STEPS_TODO.map((step, idx) => {
          const isDone = idx < displayIdx;
          const isCurrent = idx === displayIdx;
          const isClickable = step.id === nextId && !isTerminal;
          return (
            <React.Fragment key={step.id}>
              <div
                className={["btb-step", isDone?"done":"", isCurrent?"current":"",
                  isClickable?"clickable":"",
                  currentStatusId===PROJECT_TASK_STATUS.A_MODIFIER&&isCurrent?"error":""].filter(Boolean).join(" ")}
                onClick={() => isClickable && setPending(true)}>
                <div className="btb-step-circle">
                  {isDone ? <FaCheckCircle size={12} /> : <span>{idx + 1}</span>}
                </div>
                <span className="btb-step-label">{step.label}</span>
                {isClickable && <span className="btb-step-hint"><FaArrowRight size={8} /></span>}
              </div>
              {idx < STEPS_TODO.length - 1 && <div className={`btb-step-line${idx < displayIdx ? " done" : ""}`} />}
            </React.Fragment>
          );
        })}
      </div>
      {isTerminal && <p className="btb-slider-terminal">✓ En attente de validation par le chef de projet</p>}
      {pending && !isTerminal && (
        <div className="btb-comment-box">
          <p className="btb-comment-label"><FaArrowRight size={10} /> Passage vers <strong>{statusMeta(nextId!).label}</strong></p>
          {error && <div className="btb-comment-error">{error}</div>}
          <textarea className="btb-comment-ta" placeholder="Commentaire (optionnel)…"
            value={comment} onChange={e => setComment(e.target.value)} rows={3} autoFocus />
          <div className="btb-comment-actions">
            <button className="btb-btn btb-btn--ghost btb-btn--sm"
              onClick={() => { setPending(false); setComment(""); }} disabled={saving}>Annuler</button>
            <button className="btb-btn btb-btn--primary btb-btn--sm" onClick={handleConfirm} disabled={saving}>
              {saving ? <FaSpinner className="btb-spin" /> : <FaCheckCircle size={11} />} Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── HistoryTimeline ──────────────────────────────────────────────────────────
const HistoryTimeline: React.FC<{ history: BacklogTaskStatusHistory[] }> = ({ history }) => (
  <div className="btb-history">
    {[...history].reverse().map(h => {
      const m = statusMeta(h.status.id);
      return (
        <div key={h.id} className="btb-history-item">
          <div className="btb-history-dot" style={{ background: m.color }} />
          <div className="btb-history-body">
            <span className="btb-history-status" style={{ color: m.color }}>{h.status.label}</span>
            {h.modifiedBy && <span className="btb-history-user">par {h.modifiedBy.username}</span>}
            <span className="btb-history-comment">{h.commentaire}</span>
            <span className="btb-history-date">{fmtDateTime(h.dateChangement)}</span>
          </div>
        </div>
      );
    })}
  </div>
);

// ─── TaskCard ─────────────────────────────────────────────────────────────────
const TaskCard: React.FC<{ task: BacklogLineProfilAsTask; service: BacklogTaskService }> = ({ task, service }) => {
  const devise = task.deviseAbr || "€";
  const [open, setOpen]               = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.currentStatus);
  const [history, setHistory]         = useState(task.historyStatus);
  const [timeSpent, setTimeSpent]     = useState<number | null>(task.timeSpent ?? null);
  const [showTimeModal, setShowTimeModal] = useState(false);

  const handleStatusChanged = useCallback((h: BacklogTaskStatusHistory) => {
    setCurrentStatus(h); setHistory(prev => [...prev, h]);
  }, []);

  const isOverdue = !!task.deadLine && new Date(
    task.deadLine.endsWith("Z") ? task.deadLine.slice(0, -1) : task.deadLine
  ).getTime() < Date.now();

  const pct = task.volume > 0 && timeSpent != null
    ? Math.round((timeSpent / task.volume) * 100) : null;

  return (
    <>
      <div className={["btb-card", open?"btb-card--open":"", isOverdue?"btb-card--overdue":""].filter(Boolean).join(" ")}>
        <div className="btb-card-header" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}
          onKeyDown={e => e.key === "Enter" && setOpen(v => !v)}>
          <div className="btb-card-main">
            {/* Projet + Lead en bandeau */}
            {(task.projetNom || task.leadNom) && (
              <div className="btb-card-context">
                <ProjetLeadChips task={task} />
              </div>
            )}
            <div className="btb-card-toprow">
              <span className="btb-card-epic"><FaTag size={9} />{task.line.epic}</span>
              <StatusBadge statusId={currentStatus.status.id} />
            </div>
            <p className="btb-card-story">{task.line.userStory}</p>
            <div className="btb-card-meta">
              <span className="btb-meta-chip"><FaLayerGroup size={9} />{task.profil.name}</span>
              <span className="btb-meta-chip">
                <FaCoins size={9} />{task.volume} JH · {task.profil.tjm} {devise}/j
              </span>
              {task.deadLine && (
                <span className={`btb-meta-chip${isOverdue ? " overdue" : ""}`}>
                  <FaClock size={9} />{isOverdue ? "⚠ " : ""} Deadline : {fmtDateTime(task.deadLine)}
                </span>
              )}
              {timeSpent != null && (
                <span className="btb-meta-chip" style={{ color: progressColor(pct ?? 0) }}>
                  <FaHourglassHalf size={9} />{timeSpent} JH passés{pct != null && ` (${pct}%)`}
                </span>
              )}
              {task.collaborateur && (
                <span className="btb-meta-chip btb-meta-chip--collab">
                  <FaUser size={9} />{task.collaborateur.appellation ?? task.collaborateur.nom}
                </span>
              )}
            </div>
            {pct != null && <ProgressBar timeSpent={timeSpent!} volume={task.volume} />}
          </div>
          <button className="btb-chevron">{open ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}</button>
        </div>

        {open && (
          <div className="btb-card-body">
            {task.line.description && (
              <div className="btb-section">
                <div className="btb-section-title"><FaBook size={10} /> Description</div>
                <p className="btb-desc">{task.line.description}</p>
              </div>
            )}
            <div className="btb-section">
              <div className="btb-section-title"><FaCheckCircle size={10} /> Résultat attendu</div>
              <p className="btb-desc">{task.line.resultat}</p>
            </div>

            {/* Charge & Coût */}
            <div className="btb-section">
              <div className="btb-section-title" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span><FaCoins size={10} /> Charge & Coût</span>
                <button className="btb-btn btb-btn--ghost btb-btn--sm" onClick={() => setShowTimeModal(true)}>
                  <FaEdit size={10} /> Saisir temps passé
                </button>
              </div>
              <div className="btb-kpi-row">
                <div className="btb-kpi">
                  <span className="btb-kpi-val">{task.volume} JH</span>
                  <span className="btb-kpi-lbl">Planifié</span>
                </div>
                <div className="btb-kpi">
                  <span className="btb-kpi-val">{task.profil.tjm} {devise}</span>
                  <span className="btb-kpi-lbl">TJM</span>
                </div>
                <div className="btb-kpi">
                  <span className="btb-kpi-val">{(task.volume * task.profil.tjm).toFixed(0)} {devise}</span>
                  <span className="btb-kpi-lbl">Coût estimé</span>
                </div>
                {timeSpent != null && (
                  <div className="btb-kpi">
                    <span className="btb-kpi-val" style={{ color: progressColor(pct ?? 0) }}>{timeSpent} JH</span>
                    <span className="btb-kpi-lbl">Temps passé</span>
                  </div>
                )}
              </div>
              {task.deadLine && (
                <div className="btb-section-title" style={{ borderColor: isOverdue ? "#dc3545" : "#e2e8f0" }}>
                  <FaClock size={10} style={{ color: isOverdue ? "#dc3545" : "#64748b" }} />
                  <span style={{ color: isOverdue ? "#dc3545" : "#64748b", fontWeight: isOverdue ? "bold" : "normal" }}>
                    {isOverdue ? "⚠ Deadline dépassée : " : "Deadline : "}{fmtDateTime(task.deadLine)}
                  </span>
                </div>
              )}
              {pct != null && <ProgressBar timeSpent={timeSpent!} volume={task.volume} />}
            </div>

            {task.collaborateur && (
              <div className="btb-section">
                <div className="btb-section-title"><FaUser size={10} /> Collaborateur assigné</div>
                <div className="btb-collab-card">
                  <div className="btb-collab-avatar">{(task.collaborateur.nom?.[0] ?? "?").toUpperCase()}</div>
                  <div className="btb-collab-info">
                    <span className="btb-collab-name">
                      {task.collaborateur.appellation ?? `${task.collaborateur.nom} ${task.collaborateur.prenom}`}
                    </span>
                    {task.collaborateur.matricule && <span className="btb-collab-meta">{task.collaborateur.matricule}</span>}
                    {task.collaborateur.emailPro   && <span className="btb-collab-meta">{task.collaborateur.emailPro}</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="btb-section">
              <div className="btb-section-title"><FaHourglassHalf size={10} /> Progression</div>
              <StatusSlider currentStatusId={currentStatus.status.id} taskId={task.id}
                service={service} onStatusChanged={handleStatusChanged} />
            </div>

            {history.length > 0 && (
              <div className="btb-section">
                <div className="btb-section-title"><FaClock size={10} /> Historique des statuts</div>
                <HistoryTimeline history={history} />
              </div>
            )}
          </div>
        )}
      </div>

      {showTimeModal && (
        <TimeSpentModal
          task={{ ...task, timeSpent }}
          service={service}
          onUpdated={ts => setTimeSpent(ts)}
          onClose={() => setShowTimeModal(false)}
        />
      )}
    </>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props { service: BacklogTaskService; currentUserName?: string; }

const MesTachesBacklog: React.FC<Props> = ({ service, currentUserName = "Utilisateur" }) => {
  const [tasks, setTasks]   = useState<BacklogLineProfilAsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await service.getTasks();
        if (!cancelled) setTasks(data);
      } catch { if (!cancelled) setError("Impossible de charger les tâches."); }
      finally  { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [service]);

  const counts = {
    enCours:   tasks.filter(t => t.currentStatus.status.id === PROJECT_TASK_STATUS.EN_COURS).length,
    enAttente: tasks.filter(t => [1,2,3].includes(t.currentStatus.status.id)).length,
    soumis:    tasks.filter(t => t.currentStatus.status.id === PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION).length,
  };

  return (
    <div className="btb-wrapper">
      <div className="btb-page-header">
        <div>
          <h4 className="btb-page-title">Mes Tâches à faire</h4>
          <p className="btb-page-sub">
            Bonjour <strong>{currentUserName}</strong> —{" "}
            {loading ? "chargement…" : `${tasks.length} tâche${tasks.length !== 1 ? "s" : ""} assignée${tasks.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {!loading && !error && tasks.length > 0 && (
        <div className="btb-stats">
          <div className="btb-stat"><span className="btb-stat-num">{counts.enAttente}</span><span className="btb-stat-lbl">En attente</span></div>
          <div className="btb-stat"><span className="btb-stat-num" style={{ color:"#8b5cf6" }}>{counts.enCours}</span><span className="btb-stat-lbl">En cours</span></div>
          <div className="btb-stat"><span className="btb-stat-num" style={{ color:"#f97316" }}>{counts.soumis}</span><span className="btb-stat-lbl">Soumis</span></div>
        </div>
      )}

      {loading  && <div className="btb-state-box"><FaSpinner className="btb-spin btb-spin--lg" /><p>Chargement…</p></div>}
      {!loading && error && <div className="btb-state-box btb-state-box--error"><FaTimesCircle size={28} /><p>{error}</p></div>}
      {!loading && !error && tasks.length === 0 && (
        <div className="btb-state-box btb-state-box--empty"><FaInbox size={34} /><p>Aucune tâche assignée</p></div>
      )}
      {!loading && !error && tasks.length > 0 && (
        <div className="btb-list">
          {tasks.map(t => <TaskCard key={t.id} task={t} service={service} />)}
        </div>
      )}
    </div>
  );
};

export default MesTachesBacklog;