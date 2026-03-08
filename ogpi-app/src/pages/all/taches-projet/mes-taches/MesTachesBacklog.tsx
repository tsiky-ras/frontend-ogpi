import React, { useState, useEffect, useCallback } from "react";
import {
  FaChevronDown, FaChevronUp, FaUser, FaCalendarAlt, FaClock,
  FaCheckCircle, FaArrowRight, FaSpinner, FaInbox, FaTimesCircle,
  FaHourglassHalf, FaTag, FaLayerGroup, FaBook, FaCoins,
} from "react-icons/fa";

import "./MesTachesBacklog.css";
import { BacklogTaskService } from "../../../../services/projet/backlog/BacklogTaskService.tsx";
import { PROJECT_TASK_STATUS, BacklogTaskStatusHistory, ChangingStatusDTO, BacklogLineProfilAsTask } from "../../../../types/lead/Backlog/BacklogTaskTypes.tsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const STATUS_META: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Affecté",              color: "#3b82f6", bg: "#eff6ff" },
  2: { label: "Réattribué",           color: "#f59e0b", bg: "#fffbeb" },
  3: { label: "À modifier",           color: "#ef4444", bg: "#fef2f2" },
  4: { label: "En cours",             color: "#8b5cf6", bg: "#f5f3ff" },
  5: { label: "En attente validation",color: "#f97316", bg: "#fff7ed" },
  6: { label: "Validé",               color: "#10b981", bg: "#ecfdf5" },
};
const statusMeta = (id: number) => STATUS_META[id] ?? { label: "Inconnu", color: "#64748b", bg: "#f1f5f9" };

// Les statuts 1,2,3 permettent de passer → EN_COURS(4) → EN_ATTENTE(5)
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

// ─── StatusSlider (À faire) ───────────────────────────────────────────────────
const STEPS_TODO = [
  { id: PROJECT_TASK_STATUS.AFFECTE,               label: "Affecté" },
  { id: PROJECT_TASK_STATUS.EN_COURS,              label: "En cours" },
  { id: PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION, label: "Soumis" },
];

interface SliderProps {
  currentStatusId: number;
  taskId: number;
  service: BacklogTaskService;
  onStatusChanged: (newHistory: BacklogTaskStatusHistory) => void;
}

const StatusSlider: React.FC<SliderProps> = ({ currentStatusId, taskId, service, onStatusChanged }) => {
  const [pending, setPending] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextId = NEXT_STATUS[currentStatusId] ?? null;
  const isTerminal = currentStatusId === PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION
    || currentStatusId === PROJECT_TASK_STATUS.VALIDE;

  // Indice visuel : A_MODIFIER affiche comme Affecté (idx 0)
  const currentIdx = currentStatusId === PROJECT_TASK_STATUS.A_MODIFIER
    ? 0
    : STEPS_TODO.findIndex(s => s.id === currentStatusId);
  const displayIdx = currentIdx >= 0 ? currentIdx : 0;

  const handleConfirm = async () => {
    if (!nextId) return;
    setSaving(true); setError(null);
    try {
      const dto: ChangingStatusDTO = { idStatus: nextId, comment: comment.trim() || "Changement de statut", backlogLineProfilId: taskId };
      const result: BacklogTaskStatusHistory = await service.changeStatus(dto);
      setPending(false); setComment("");
      onStatusChanged(result);
    } catch {
      setError("Erreur lors du changement de statut.");
    } finally {
      setSaving(false);
    }
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
                className={["btb-step", isDone ? "done" : "", isCurrent ? "current" : "",
                  isClickable ? "clickable" : "",
                  currentStatusId === PROJECT_TASK_STATUS.A_MODIFIER && isCurrent ? "error" : ""].filter(Boolean).join(" ")}
                onClick={() => isClickable && setPending(true)}
                title={isClickable ? `Passer à "${step.label}"` : ""}
              >
                <div className="btb-step-circle">
                  {isDone ? <FaCheckCircle size={12} /> : <span>{idx + 1}</span>}
                </div>
                <span className="btb-step-label">{step.label}</span>
                {isClickable && <span className="btb-step-hint"><FaArrowRight size={8} /></span>}
              </div>
              {idx < STEPS_TODO.length - 1 && (
                <div className={`btb-step-line${idx < displayIdx ? " done" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {isTerminal && (
        <p className="btb-slider-terminal">✓ En attente de validation par le chef de projet</p>
      )}

      {pending && !isTerminal && (
        <div className="btb-comment-box">
          <p className="btb-comment-label">
            <FaArrowRight size={10} /> Passage vers <strong>{statusMeta(nextId!).label}</strong>
          </p>
          {error && <div className="btb-comment-error">{error}</div>}
          <textarea
            className="btb-comment-ta"
            placeholder="Commentaire (optionnel)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="btb-comment-actions">
            <button className="btb-btn btb-btn--ghost btb-btn--sm" onClick={() => { setPending(false); setComment(""); }} disabled={saving}>
              Annuler
            </button>
            <button className="btb-btn btb-btn--primary btb-btn--sm" onClick={handleConfirm} disabled={saving}>
              {saving ? <FaSpinner className="btb-spin" /> : <FaCheckCircle size={11} />}
              Confirmer
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
            {h.modifiedBy && (
              <span className="btb-history-user">par {h.modifiedBy.username}</span>
            )}
            <span className="btb-history-comment">{h.commentaire}</span>
            <span className="btb-history-date">{fmtDateTime(h.dateChangement)}</span>
          </div>
        </div>
      );
    })}
  </div>
);

// ─── TaskCard (À faire) ───────────────────────────────────────────────────────
const TaskCard: React.FC<{
  task: BacklogLineProfilAsTask;
  service: BacklogTaskService;
}> = ({ task, service }) => {
  const [open, setOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.currentStatus);
  const [history, setHistory] = useState(task.historyStatus);

  const handleStatusChanged = useCallback((newHistory: BacklogTaskStatusHistory) => {
    setCurrentStatus(newHistory);
    setHistory(prev => [...prev, newHistory]);
  }, []);

  const isOverdue = !!task.deadLine && new Date(task.deadLine).getTime() < Date.now();

  return (
    <div className={["btb-card", open ? "btb-card--open" : "", isOverdue ? "btb-card--overdue" : ""].filter(Boolean).join(" ")}>
      <div className="btb-card-header" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setOpen(v => !v)}>
        <div className="btb-card-main">
          <div className="btb-card-toprow">
            <span className="btb-card-epic"><FaTag size={9} />{task.line.epic}</span>
            <StatusBadge statusId={currentStatus.status.id} />
          </div>
          <p className="btb-card-story">{task.line.userStory}</p>
          <div className="btb-card-meta">
            <span className="btb-meta-chip"><FaLayerGroup size={9} />{task.profil.name}</span>
            <span className="btb-meta-chip"><FaCoins size={9} />{task.volume} j/h · {task.profil.tjm} €/j</span>
            {task.deadLine && (
              <span className={`btb-meta-chip${isOverdue ? " overdue" : ""}`}>
                <FaClock size={9} />Deadline {fmtDate(task.deadLine)}
              </span>
            )}
            {task.collaborateur && (
              <span className="btb-meta-chip btb-meta-chip--collab">
                <FaUser size={9} />{task.collaborateur.appellation ?? task.collaborateur.nom}
              </span>
            )}
          </div>
        </div>
        <button className="btb-chevron">{open ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}</button>
      </div>

      {open && (
        <div className="btb-card-body">
          {/* Description */}
          {task.line.description && (
            <div className="btb-section">
              <div className="btb-section-title"><FaBook size={10} /> Description</div>
              <p className="btb-desc">{task.line.description}</p>
            </div>
          )}

          {/* Résultat attendu */}
          <div className="btb-section">
            <div className="btb-section-title"><FaCheckCircle size={10} /> Résultat attendu</div>
            <p className="btb-desc">{task.line.resultat}</p>
          </div>

          {/* Détails volume/tjm */}
          <div className="btb-section">
            <div className="btb-section-title"><FaCoins size={10} /> Charge & Coût</div>
            <div className="btb-kpi-row">
              <div className="btb-kpi">
                <span className="btb-kpi-val">{task.volume}</span>
                <span className="btb-kpi-lbl">Jours/homme</span>
              </div>
              <div className="btb-kpi">
                <span className="btb-kpi-val">{task.profil.tjm} €</span>
                <span className="btb-kpi-lbl">TJM profil</span>
              </div>
              <div className="btb-kpi">
                <span className="btb-kpi-val">{(task.volume * task.profil.tjm).toFixed(0)} €</span>
                <span className="btb-kpi-lbl">Coût estimé</span>
              </div>
              {task.timeSpent !== null && task.timeSpent !== undefined && (
                <div className="btb-kpi">
                  <span className="btb-kpi-val">{task.timeSpent}</span>
                  <span className="btb-kpi-lbl">Temps passé</span>
                </div>
              )}
            </div>
          </div>

          {/* Collaborateur */}
          {task.collaborateur && (
            <div className="btb-section">
              <div className="btb-section-title"><FaUser size={10} /> Collaborateur assigné</div>
              <div className="btb-collab-card">
                <div className="btb-collab-avatar">{(task.collaborateur.nom?.[0] ?? "?").toUpperCase()}</div>
                <div className="btb-collab-info">
                  <span className="btb-collab-name">{task.collaborateur.appellation ?? `${task.collaborateur.nom} ${task.collaborateur.prenom}`}</span>
                  {task.collaborateur.matricule && <span className="btb-collab-meta">{task.collaborateur.matricule}</span>}
                  {task.collaborateur.emailPro && <span className="btb-collab-meta">{task.collaborateur.emailPro}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Slider statut */}
          <div className="btb-section">
            <div className="btb-section-title"><FaHourglassHalf size={10} /> Progression</div>
            <StatusSlider
              currentStatusId={currentStatus.status.id}
              taskId={task.id}
              service={service}
              onStatusChanged={handleStatusChanged}
            />
          </div>

          {/* Historique */}
          {history.length > 0 && (
            <div className="btb-section">
              <div className="btb-section-title"><FaClock size={10} /> Historique des statuts</div>
              <HistoryTimeline history={history} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main MesTachesBacklog ────────────────────────────────────────────────────
interface Props {
  service: BacklogTaskService;
  currentUserName?: string;
}

const MesTachesBacklog: React.FC<Props> = ({ service, currentUserName = "Utilisateur" }) => {
  const [tasks, setTasks] = useState<BacklogLineProfilAsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await service.getTasks();
        if (!cancelled) setTasks(data);
      } catch {
        if (!cancelled) setError("Impossible de charger les tâches.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [service]);

  const counts = {
    enCours: tasks.filter(t => t.currentStatus.status.id === PROJECT_TASK_STATUS.EN_COURS).length,
    enAttente: tasks.filter(t => [1, 2, 3].includes(t.currentStatus.status.id)).length,
    soumis: tasks.filter(t => t.currentStatus.status.id === PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION).length,
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
          <div className="btb-stat"><span className="btb-stat-num" style={{ color: "#8b5cf6" }}>{counts.enCours}</span><span className="btb-stat-lbl">En cours</span></div>
          <div className="btb-stat"><span className="btb-stat-num" style={{ color: "#f97316" }}>{counts.soumis}</span><span className="btb-stat-lbl">Soumis</span></div>
        </div>
      )}

      {loading && <div className="btb-state-box"><FaSpinner className="btb-spin btb-spin--lg" /><p>Chargement…</p></div>}
      {!loading && error && <div className="btb-state-box btb-state-box--error"><FaTimesCircle size={28} /><p>{error}</p></div>}
      {!loading && !error && tasks.length === 0 && (
        <div className="btb-state-box btb-state-box--empty">
          <FaInbox size={34} />
          <p>Aucune tâche assignée</p>
        </div>
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