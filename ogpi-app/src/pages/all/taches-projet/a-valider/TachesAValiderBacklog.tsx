import React, { useState, useEffect, useCallback } from "react";
import {
  FaChevronDown, FaChevronUp, FaUser, FaCalendarAlt, FaClock,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaInbox, FaTag,
  FaLayerGroup, FaCoins, FaBook, FaTimes, FaHourglassHalf,
} from "react-icons/fa";

import "./TachesAValiderBacklog.css";
import { BacklogTaskService } from "../../../../services/projet/backlog/BacklogTaskService.tsx";
import { BacklogTaskStatusHistory, PROJECT_TASK_STATUS, ChangingStatusDTO, BacklogLineProfilAsTask } from "../../../../types/lead/Backlog/BacklogTaskTypes.tsx";

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

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ statusId: number }> = ({ statusId }) => {
  const m = statusMeta(statusId);
  return (
    <span className="vld-badge" style={{ color: m.color, background: m.bg, borderColor: m.color + "40" }}>
      {m.label}
    </span>
  );
};

// ─── HistoryTimeline ──────────────────────────────────────────────────────────
const HistoryTimeline: React.FC<{ history: BacklogTaskStatusHistory[] }> = ({ history }) => (
  <div className="vld-history">
    {[...history].reverse().map(h => {
      const m = statusMeta(h.status.id);
      return (
        <div key={h.id} className="vld-history-item">
          <div className="vld-history-dot" style={{ background: m.color }} />
          <div className="vld-history-body">
            <span className="vld-history-status" style={{ color: m.color }}>{h.status.label}</span>
            {h.modifiedBy && <span className="vld-history-user">par {h.modifiedBy.username}</span>}
            <span className="vld-history-comment">{h.commentaire}</span>
            <span className="vld-history-date">{fmtDateTime(h.dateChangement)}</span>
          </div>
        </div>
      );
    })}
  </div>
);

// ─── ValidationPanel ─────────────────────────────────────────────────────────
interface ValidationPanelProps {
  taskId: number;
  service: BacklogTaskService;
  onDecision: (newHistory: BacklogTaskStatusHistory) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({ taskId, service, onDecision }) => {
  const [mode, setMode] = useState<"valider" | "modifier" | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!mode) return;
    const newStatusId = mode === "valider"
      ? PROJECT_TASK_STATUS.VALIDE
      : PROJECT_TASK_STATUS.A_MODIFIER;

    setSaving(true); setError(null);
    try {
      const dto: ChangingStatusDTO = {
        idStatus: newStatusId,
        comment: comment.trim() || (mode === "valider" ? "Tâche validée" : "À retravailler"),
        backlogLineProfilId: taskId,
      };
      const result: BacklogTaskStatusHistory = await service.changeStatus(dto);
      setMode(null); setComment("");
      onDecision(result);
    } catch {
      setError("Erreur lors de la validation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vld-panel">
      {!mode && (
        <div className="vld-panel-actions">
          <button className="vld-btn vld-btn--ok" onClick={() => { setMode("valider"); setComment(""); }}>
            <FaCheckCircle size={13} /> Valider
          </button>
          <button className="vld-btn vld-btn--ko" onClick={() => { setMode("modifier"); setComment(""); }}>
            <FaTimes size={13} /> À modifier (KO)
          </button>
        </div>
      )}

      {mode && (
        <div className="vld-panel-confirm">
          <div className={`vld-panel-confirm-header ${mode === "valider" ? "ok" : "ko"}`}>
            {mode === "valider"
              ? <><FaCheckCircle size={13} /> Validation de la tâche</>
              : <><FaTimes size={13} /> Demande de modification</>
            }
          </div>
          {error && <div className="vld-panel-error">{error}</div>}
          <textarea
            className="vld-panel-ta"
            placeholder={mode === "valider"
              ? "Commentaire de validation (optionnel)…"
              : "Motif du refus (recommandé)…"}
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="vld-panel-footer">
            <button className="vld-btn vld-btn--ghost vld-btn--sm"
              onClick={() => { setMode(null); setComment(""); setError(null); }}
              disabled={saving}>
              Annuler
            </button>
            <button
              className={`vld-btn ${mode === "valider" ? "vld-btn--ok" : "vld-btn--ko"} vld-btn--sm`}
              onClick={handleSubmit}
              disabled={saving}>
              {saving ? <FaSpinner className="vld-spin" /> : (mode === "valider" ? <FaCheckCircle size={11} /> : <FaTimes size={11} />)}
              {mode === "valider" ? "Confirmer validation" : "Confirmer refus"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ValidateTaskCard ─────────────────────────────────────────────────────────
const ValidateTaskCard: React.FC<{
  task: BacklogLineProfilAsTask;
  service: BacklogTaskService;
}> = ({ task, service }) => {
  const [open, setOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.currentStatus);
  const [history, setHistory] = useState(task.historyStatus);
  const [decided, setDecided] = useState(false);

  const handleDecision = useCallback((newHistory: BacklogTaskStatusHistory) => {
    setCurrentStatus(newHistory);
    setHistory(prev => [...prev, newHistory]);
    setDecided(true);
  }, []);

  const isValidated = currentStatus.status.id === PROJECT_TASK_STATUS.VALIDE;
  const isToModify  = currentStatus.status.id === PROJECT_TASK_STATUS.A_MODIFIER;

  return (
    <div className={[
      "vld-card",
      open ? "vld-card--open" : "",
      isValidated ? "vld-card--validated" : "",
      isToModify ? "vld-card--tomodify" : "",
    ].filter(Boolean).join(" ")}>

      <div className="vld-card-header" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setOpen(v => !v)}>
        <div className="vld-card-main">
          <div className="vld-card-toprow">
            <span className="vld-card-epic"><FaTag size={9} />{task.line.epic}</span>
            <StatusBadge statusId={currentStatus.status.id} />
          </div>
          <p className="vld-card-story">{task.line.userStory}</p>
          <div className="vld-card-meta">
            {task.collaborateur && (
              <span className="vld-meta-chip vld-meta-chip--collab">
                <FaUser size={9} />{task.collaborateur.appellation ?? task.collaborateur.nom}
              </span>
            )}
            <span className="vld-meta-chip"><FaLayerGroup size={9} />{task.profil.name}</span>
            <span className="vld-meta-chip"><FaCoins size={9} />{task.volume} j/h · {task.profil.tjm} €/j</span>
            {task.deadLine && (
              <span className="vld-meta-chip"><FaCalendarAlt size={9} />{fmtDate(task.deadLine)}</span>
            )}
          </div>
        </div>
        <div className="vld-chevron-wrap">
          {isValidated && <FaCheckCircle className="vld-done-icon" size={14} />}
          {isToModify  && <FaTimesCircle className="vld-ko-icon" size={14} />}
          {open ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </div>
      </div>

      {open && (
        <div className="vld-card-body">
          {/* Description */}
          {task.line.description && (
            <div className="vld-section">
              <div className="vld-section-title"><FaBook size={10} /> Description</div>
              <p className="vld-desc">{task.line.description}</p>
            </div>
          )}

          {/* Résultat attendu */}
          <div className="vld-section">
            <div className="vld-section-title"><FaCheckCircle size={10} /> Résultat attendu</div>
            <p className="vld-desc">{task.line.resultat}</p>
          </div>

          {/* KPIs */}
          <div className="vld-section">
            <div className="vld-section-title"><FaCoins size={10} /> Charge & Coût</div>
            <div className="vld-kpi-row">
              <div className="vld-kpi">
                <span className="vld-kpi-val">{task.volume}</span>
                <span className="vld-kpi-lbl">Jours/homme</span>
              </div>
              <div className="vld-kpi">
                <span className="vld-kpi-val">{task.profil.tjm} €</span>
                <span className="vld-kpi-lbl">TJM profil</span>
              </div>
              <div className="vld-kpi">
                <span className="vld-kpi-val">{(task.volume * task.profil.tjm).toFixed(0)} €</span>
                <span className="vld-kpi-lbl">Coût estimé</span>
              </div>
              {task.timeSpent != null && (
                <div className="vld-kpi">
                  <span className="vld-kpi-val">{task.timeSpent}</span>
                  <span className="vld-kpi-lbl">Temps passé</span>
                </div>
              )}
            </div>
          </div>

          {/* Collaborateur */}
          {task.collaborateur && (
            <div className="vld-section">
              <div className="vld-section-title"><FaUser size={10} /> Collaborateur</div>
              <div className="vld-collab-card">
                <div className="vld-collab-avatar">
                  {(task.collaborateur.nom?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="vld-collab-info">
                  <span className="vld-collab-name">
                    {task.collaborateur.appellation ?? `${task.collaborateur.nom} ${task.collaborateur.prenom}`}
                  </span>
                  {task.collaborateur.matricule && (
                    <span className="vld-collab-meta">Matricule : {task.collaborateur.matricule}</span>
                  )}
                  {task.collaborateur.emailPro && (
                    <span className="vld-collab-meta">{task.collaborateur.emailPro}</span>
                  )}
                  {task.collaborateur.telephone && (
                    <span className="vld-collab-meta">{task.collaborateur.telephone}</span>
                  )}
                  <span className="vld-collab-profil">Profil : {task.profil.name} — TJM {task.profil.tjm} €</span>
                </div>
              </div>
            </div>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <div className="vld-section">
              <div className="vld-section-title"><FaClock size={10} /> Historique</div>
              <HistoryTimeline history={history} />
            </div>
          )}

          {/* Panneau de décision */}
          {!decided && !isValidated && !isToModify && (
            <div className="vld-section">
              <div className="vld-section-title"><FaHourglassHalf size={10} /> Décision</div>
              <ValidationPanel taskId={task.id} service={service} onDecision={handleDecision} />
            </div>
          )}

          {isValidated && (
            <div className="vld-decided-banner vld-decided-banner--ok">
              <FaCheckCircle size={14} /> Tâche validée
            </div>
          )}
          {isToModify && (
            <div className="vld-decided-banner vld-decided-banner--ko">
              <FaTimesCircle size={14} /> Renvoyée en modification
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main TachesAValiderBacklog ───────────────────────────────────────────────
interface Props {
  service: BacklogTaskService;
  currentUserName?: string;
}

const TachesAValiderBacklog: React.FC<Props> = ({ service, currentUserName = "Utilisateur" }) => {
  const [tasks, setTasks] = useState<BacklogLineProfilAsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await service.getTasksToValidate();
        if (!cancelled) setTasks(data);
      } catch {
        if (!cancelled) setError("Impossible de charger les tâches à valider.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [service]);

  const pending = tasks.filter(t => t.currentStatus.status.id === PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION).length;

  return (
    <div className="vld-wrapper">
      <div className="vld-page-header">
        <div>
          <h4 className="vld-page-title">Tâches à valider</h4>
          <p className="vld-page-sub">
            {loading ? "Chargement…" : `${tasks.length} tâche${tasks.length !== 1 ? "s" : ""} · ${pending} en attente`}
          </p>
        </div>
      </div>

      {!loading && !error && tasks.length > 0 && (
        <div className="vld-stats">
          <div className="vld-stat vld-stat--pending">
            <span className="vld-stat-num">{pending}</span>
            <span className="vld-stat-lbl">En attente</span>
          </div>
          <div className="vld-stat vld-stat--ok">
            <span className="vld-stat-num">
              {tasks.filter(t => t.currentStatus.status.id === PROJECT_TASK_STATUS.VALIDE).length}
            </span>
            <span className="vld-stat-lbl">Validées</span>
          </div>
          <div className="vld-stat vld-stat--ko">
            <span className="vld-stat-num">
              {tasks.filter(t => t.currentStatus.status.id === PROJECT_TASK_STATUS.A_MODIFIER).length}
            </span>
            <span className="vld-stat-lbl">Refusées</span>
          </div>
        </div>
      )}

      {loading && <div className="vld-state-box"><FaSpinner className="vld-spin vld-spin--lg" /><p>Chargement…</p></div>}
      {!loading && error && <div className="vld-state-box vld-state-box--error"><FaTimesCircle size={28} /><p>{error}</p></div>}
      {!loading && !error && tasks.length === 0 && (
        <div className="vld-state-box vld-state-box--empty">
          <FaInbox size={34} />
          <p>Aucune tâche à valider</p>
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="vld-list">
          {tasks.map(t => <ValidateTaskCard key={t.id} task={t} service={service} />)}
        </div>
      )}
    </div>
  );
};

export default TachesAValiderBacklog;