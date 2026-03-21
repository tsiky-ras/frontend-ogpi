import React, { useState, useEffect, useCallback } from "react";
import {
  FaCheckCircle, FaTimesCircle, FaSpinner, FaInbox, FaClock,
  FaUser, FaFolderOpen, FaBriefcase, FaChevronDown, FaChevronUp,
  FaTag, FaLayerGroup, FaHistory, FaBoxOpen, FaStream, FaBolt,
} from "react-icons/fa";
import "./StatutCollaborateurTab.css";
import { BacklogTaskService } from "../../../../services/projet/backlog/BacklogTaskService.tsx";
import {
  BacklogLineProfilAsTask, BacklogTaskStatusHistory, PROJECT_TASK_STATUS, ChangingStatusDTO,
} from "../../../../types/lead/Backlog/BacklogTaskTypes.tsx";

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

const STATUS_META: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Affecté",               color: "#3b82f6", bg: "#eff6ff" },
  2: { label: "Réattribué",            color: "#f59e0b", bg: "#fffbeb" },
  3: { label: "À modifier",            color: "#ef4444", bg: "#fef2f2" },
  4: { label: "En cours",              color: "#8b5cf6", bg: "#f5f3ff" },
  5: { label: "En attente validation", color: "#f97316", bg: "#fff7ed" },
  6: { label: "Validé",                color: "#10b981", bg: "#ecfdf5" },
};
const statusMeta = (id: number) => STATUS_META[id] ?? { label: "Inconnu", color: "#64748b", bg: "#f1f5f9" };

// ─── Statut collaborateur local (OK / KO) ────────────────────────────────────
// Indépendant du statut de tâche backend : stocké comme un historique commenté
// sur un statut spécial. Ici on le mappe sur Validé (6) = OK, À modifier (3) = KO.
// Le changement est tracé dans BacklogTaskStatusHistory avec modifiedBy.

type CollabDecision = "OK" | "KO" | null;

interface CollabStatusEntry {
  decision: CollabDecision;
  date: string;
  by: string;
  motif: string;
  historyId: number;
}

function deriveCollabStatus(history: BacklogTaskStatusHistory[]): CollabStatusEntry | null {
  // Prend le dernier événement Validé (6) ou À modifier (3) = décision CP/BA
  const relevant = [...history]
    .filter(h => h.status.id === PROJECT_TASK_STATUS.VALIDE || h.status.id === PROJECT_TASK_STATUS.A_MODIFIER)
    .sort((a, b) => new Date(b.dateChangement).getTime() - new Date(a.dateChangement).getTime());

  if (!relevant.length) return null;
  const last = relevant[0];
  return {
    decision: last.status.id === PROJECT_TASK_STATUS.VALIDE ? "OK" : "KO",
    date: last.dateChangement,
    by: last.modifiedBy?.username ?? "Inconnu",
    motif: last.commentaire ?? "",
    historyId: last.id,
  };
}

// ─── DecisionPanel ───────────────────────────────────────────────────────────
const DecisionPanel: React.FC<{
  taskId: number;
  service: BacklogTaskService;
  onDecision: (h: BacklogTaskStatusHistory) => void;
  currentDecision: CollabDecision;
}> = ({ taskId, service, onDecision, currentDecision }) => {
  const [mode, setMode]       = useState<"OK" | "KO" | null>(null);
  const [motif, setMotif]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!mode) return;
    const newStatusId = mode === "OK" ? PROJECT_TASK_STATUS.VALIDE : PROJECT_TASK_STATUS.A_MODIFIER;
    setSaving(true); setError(null);
    try {
      const dto: ChangingStatusDTO = {
        idStatus: newStatusId,
        comment: motif.trim() || (mode === "OK" ? "Tâche validée (OK)" : "Tâche à refaire (KO)"),
        backlogLineProfilId: taskId,
      };
      const result = await service.changeStatus(dto);
      setMode(null); setMotif(""); onDecision(result);
    } catch { setError("Erreur lors de l'enregistrement."); }
    finally { setSaving(false); }
  };

  return (
    <div className="sc-decision-panel">
      {!mode && (
        <div className="sc-decision-actions">
          <button
            className={`sc-btn-decision sc-btn-ok${currentDecision === "OK" ? " sc-btn-decision--active" : ""}`}
            onClick={() => { setMode("OK"); setMotif(""); }}>
            <FaCheckCircle size={14} /> OK — Validé
          </button>
          <button
            className={`sc-btn-decision sc-btn-ko${currentDecision === "KO" ? " sc-btn-decision--active sc-btn-decision--active-ko" : ""}`}
            onClick={() => { setMode("KO"); setMotif(""); }}>
            <FaTimesCircle size={14} /> KO — À refaire
          </button>
        </div>
      )}

      {mode && (
        <div className={`sc-decision-form sc-decision-form--${mode.toLowerCase()}`}>
          <div className="sc-decision-form__header">
            {mode === "OK"
              ? <><FaCheckCircle size={13} /> Validation OK</>
              : <><FaTimesCircle size={13} /> Refus KO — motif requis</>
            }
          </div>
          {error && <div className="sc-form-error">{error}</div>}
          <textarea
            className="sc-form-ta"
            placeholder={mode === "OK" ? "Commentaire de validation (optionnel)…" : "Motif du refus (recommandé)…"}
            value={motif}
            onChange={e => setMotif(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="sc-decision-form__footer">
            <button className="sc-btn sc-btn--ghost sc-btn--sm"
              onClick={() => { setMode(null); setMotif(""); setError(null); }} disabled={saving}>
              Annuler
            </button>
            <button
              className={`sc-btn sc-btn--sm ${mode === "OK" ? "sc-btn--ok" : "sc-btn--ko"}`}
              onClick={handleSubmit} disabled={saving}>
              {saving ? <FaSpinner className="sc-spin" /> : mode === "OK" ? <FaCheckCircle size={11} /> : <FaTimesCircle size={11} />}
              {mode === "OK" ? "Confirmer OK" : "Confirmer KO"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── HistoryTimeline ──────────────────────────────────────────────────────────
const HistoryTimeline: React.FC<{ history: BacklogTaskStatusHistory[]; showAll: boolean }> = ({ history, showAll }) => {
  const relevant = history
    .filter(h => showAll || [PROJECT_TASK_STATUS.VALIDE, PROJECT_TASK_STATUS.A_MODIFIER].includes(h.status.id))
    .slice().reverse();

  if (!relevant.length) return <p className="sc-no-history">Aucun historique de décision.</p>;

  return (
    <div className="sc-history">
      {relevant.map(h => {
        const m = statusMeta(h.status.id);
        const isOK = h.status.id === PROJECT_TASK_STATUS.VALIDE;
        const isKO = h.status.id === PROJECT_TASK_STATUS.A_MODIFIER;
        return (
          <div key={h.id} className={`sc-history-item${isOK ? " sc-history-item--ok" : ""}${isKO ? " sc-history-item--ko" : ""}`}>
            <div className="sc-history-dot" style={{ background: m.color }} />
            <div className="sc-history-body">
              <div className="sc-history-top">
                <span className="sc-history-status" style={{ color: m.color }}>
                  {isOK && <FaCheckCircle size={10} />}
                  {isKO && <FaTimesCircle size={10} />}
                  {" "}{h.status.label}
                </span>
                {h.modifiedBy && (
                  <span className="sc-history-user"><FaUser size={9} /> {h.modifiedBy.username}</span>
                )}
                <span className="sc-history-date"><FaClock size={9} /> {fmtDateTime(h.dateChangement)}</span>
              </div>
              {h.commentaire && <div className="sc-history-motif">{h.commentaire}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── TaskRow ──────────────────────────────────────────────────────────────────
const TaskRow: React.FC<{
  task: BacklogLineProfilAsTask;
  service: BacklogTaskService;
  deviseAbr: string;
}> = ({ task, service, deviseAbr }) => {
  const [open, setOpen]         = useState(false);
  const [showAll, setShowAll]   = useState(false);
  const [history, setHistory]   = useState(task.historyStatus);
  const [currentStatus, setCurrent] = useState(task.currentStatus);

  const collabStatus = deriveCollabStatus(history);
  const decision = collabStatus?.decision ?? null;

  const handleDecision = useCallback((h: BacklogTaskStatusHistory) => {
    setHistory(prev => [...prev, h]);
    setCurrent(h);
  }, []);

  const isWaiting = currentStatus.status.id === PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION;
  const lotNom    = (task.line as any).lotNom    ?? null;
  const phaseNom  = (task.line as any).phaseNom  ?? null;
  const sprintNom = (task.line as any).sprintNom ?? null;
  const sm = statusMeta(currentStatus.status.id);

  return (
    <div className={[
      "sc-task-row",
      decision === "OK" ? "sc-task-row--ok" : "",
      decision === "KO" ? "sc-task-row--ko" : "",
      isWaiting && !decision ? "sc-task-row--pending" : "",
    ].filter(Boolean).join(" ")}>

      {/* ── Header cliquable ── */}
      <div className="sc-task-row__header" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}>
        {/* Indicateur OK/KO */}
        <div className="sc-status-indicator">
          {decision === "OK" && <FaCheckCircle className="sc-indicator-ok" size={18} />}
          {decision === "KO" && <FaTimesCircle className="sc-indicator-ko" size={18} />}
          {!decision && <div className="sc-indicator-pending" title="En attente de décision" />}
        </div>

        <div className="sc-task-row__main">
          {/* Projet / Lead chips */}
          {(task.projetNom || task.leadNom) && (
            <div className="sc-context-chips">
              {task.projetNom && <span className="sc-chip sc-chip--projet"><FaFolderOpen size={9} /> {task.projetNom}</span>}
              {task.leadNom   && <span className="sc-chip sc-chip--lead"><FaBriefcase size={9} /> {task.leadNom}</span>}
            </div>
          )}
          {/* Fil d'Ariane */}
          {(lotNom || phaseNom || sprintNom) && (
            <div className="sc-breadcrumb">
              {lotNom    && <span className="sc-bc-item sc-bc-item--lot"><FaBoxOpen size={9} /> {lotNom}</span>}
              {phaseNom  && <><span className="sc-bc-sep">›</span><span className="sc-bc-item sc-bc-item--phase"><FaStream size={9} /> {phaseNom}</span></>}
              {sprintNom && <><span className="sc-bc-sep">›</span><span className="sc-bc-item sc-bc-item--sprint"><FaBolt size={9} /> {sprintNom}</span></>}
            </div>
          )}
          <div className="sc-task-row__toprow">
            <span className="sc-epic"><FaTag size={9} /> {task.line.epic}</span>
            <span className="sc-task-status" style={{ color: sm.color, background: sm.bg, borderColor: sm.color + "33" }}>
              {sm.label}
            </span>
          </div>
          <p className="sc-story">{task.line.userStory}</p>
          <div className="sc-meta-row">
            {task.collaborateur && (
              <span className="sc-chip sc-chip--collab">
                <FaUser size={9} /> {task.collaborateur.appellation ?? task.collaborateur.nom}
              </span>
            )}
            <span className="sc-chip"><FaLayerGroup size={9} /> {task.profil.name}</span>
            <span className="sc-chip">{task.volume} JH · {task.profil.tjm} {deviseAbr}/j</span>
          </div>
          {/* Résumé décision */}
          {collabStatus && (
            <div className={`sc-decision-summary sc-decision-summary--${collabStatus.decision?.toLowerCase()}`}>
              {collabStatus.decision === "OK"
                ? <FaCheckCircle size={10} className="sc-ok-icon" />
                : <FaTimesCircle size={10} className="sc-ko-icon" />}
              <span>
                {collabStatus.decision === "OK" ? "Validé" : "Refusé"} par <strong>{collabStatus.by}</strong> le {fmtDateTime(collabStatus.date)}
                {collabStatus.motif && <> — <em>{collabStatus.motif}</em></>}
              </span>
            </div>
          )}
        </div>
        <span className="sc-chevron">{open ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}</span>
      </div>

      {/* ── Corps expandé ── */}
      {open && (
        <div className="sc-task-row__body">

          {/* Décision CP/BA */}
          <div className="sc-section">
            <div className="sc-section__title">
              <FaCheckCircle size={10} /> Décision (Chef de projet / BA)
            </div>
            <DecisionPanel
              taskId={task.id}
              service={service}
              onDecision={handleDecision}
              currentDecision={decision}
            />
          </div>

          {/* Historique */}
          <div className="sc-section">
            <div className="sc-section__title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span><FaHistory size={10} /> Historique des décisions</span>
              <button className="sc-toggle-all" onClick={() => setShowAll(v => !v)}>
                {showAll ? "Décisions seulement" : "Tout l'historique"}
              </button>
            </div>
            <HistoryTimeline history={history} showAll={showAll} />
          </div>

          {/* Collaborateur */}
          {task.collaborateur && (
            <div className="sc-section">
              <div className="sc-section__title"><FaUser size={10} /> Collaborateur assigné</div>
              <div className="sc-collab-card">
                <div className="sc-collab-avatar">
                  {(task.collaborateur.nom?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="sc-collab-info">
                  <span className="sc-collab-name">
                    {task.collaborateur.appellation ?? `${task.collaborateur.nom} ${task.collaborateur.prenom}`}
                  </span>
                  {task.collaborateur.matricule && <span className="sc-collab-meta">{task.collaborateur.matricule}</span>}
                  {task.collaborateur.emailPro   && <span className="sc-collab-meta">{task.collaborateur.emailPro}</span>}
                  <span className="sc-collab-profil">Profil : {task.profil.name} — TJM {task.profil.tjm} {deviseAbr}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  service: BacklogTaskService;
  currentUserName?: string;
  deviseAbr?: string;
}

const StatutCollaborateurTab: React.FC<Props> = ({ service, currentUserName = "Utilisateur", deviseAbr = "€" }) => {
  const [tasks, setTasks]     = useState<BacklogLineProfilAsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState<"all" | "pending" | "ok" | "ko">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        // On récupère toutes les tâches à valider (inclut EN_ATTENTE + déjà décidées)
        const data = await service.getTasksToValidate();
        if (!cancelled) setTasks(data);
      } catch { if (!cancelled) setError("Impossible de charger les tâches."); }
      finally  { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [service]);

  // Statistiques décision
  const stats = {
    ok:      tasks.filter(t => deriveCollabStatus(t.historyStatus)?.decision === "OK").length,
    ko:      tasks.filter(t => deriveCollabStatus(t.historyStatus)?.decision === "KO").length,
    pending: tasks.filter(t => !deriveCollabStatus(t.historyStatus)).length,
  };

  const filtered = tasks.filter(t => {
    const d = deriveCollabStatus(t.historyStatus)?.decision ?? null;
    if (filter === "ok")      return d === "OK";
    if (filter === "ko")      return d === "KO";
    if (filter === "pending") return d === null;
    return true;
  });

  return (
    <div className="sc-wrapper">
      {/* ── Page header ── */}
      <div className="sc-page-header">
        <div>
          <h4 className="sc-page-title">Statut Collaborateur</h4>
          <p className="sc-page-sub">
            Validation chef de projet / suppléant / BA —{" "}
            {loading ? "chargement…" : `${tasks.length} tâche${tasks.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      {!loading && !error && tasks.length > 0 && (
        <div className="sc-stats">
          <button className={`sc-stat-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
            <span className="sc-stat-num">{tasks.length}</span>
            <span className="sc-stat-lbl">Total</span>
          </button>
          <button className={`sc-stat-btn sc-stat-btn--pending${filter === "pending" ? " active" : ""}`} onClick={() => setFilter("pending")}>
            <span className="sc-stat-num">{stats.pending}</span>
            <span className="sc-stat-lbl">En attente</span>
          </button>
          <button className={`sc-stat-btn sc-stat-btn--ok${filter === "ok" ? " active" : ""}`} onClick={() => setFilter("ok")}>
            <span className="sc-stat-num">{stats.ok}</span>
            <span className="sc-stat-lbl">Validés (OK)</span>
          </button>
          <button className={`sc-stat-btn sc-stat-btn--ko${filter === "ko" ? " active" : ""}`} onClick={() => setFilter("ko")}>
            <span className="sc-stat-num">{stats.ko}</span>
            <span className="sc-stat-lbl">Refusés (KO)</span>
          </button>
        </div>
      )}

      {/* ── États ── */}
      {loading  && <div className="sc-state-box"><FaSpinner className="sc-spin sc-spin--lg" /><p>Chargement…</p></div>}
      {!loading && error && <div className="sc-state-box sc-state-box--error"><FaTimesCircle size={28} /><p>{error}</p></div>}
      {!loading && !error && tasks.length === 0 && (
        <div className="sc-state-box sc-state-box--empty"><FaInbox size={34} /><p>Aucune tâche soumise à valider</p></div>
      )}
      {!loading && !error && filtered.length === 0 && tasks.length > 0 && (
        <div className="sc-state-box sc-state-box--empty"><FaInbox size={28} /><p>Aucune tâche dans ce filtre</p></div>
      )}

      {/* ── Liste ── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="sc-list">
          {filtered.map(t => (
            <TaskRow key={t.id} task={t} service={service} deviseAbr={deviseAbr} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StatutCollaborateurTab;
