import React, { useState, useEffect, useCallback } from "react";
import {
  FaChevronDown, FaChevronUp, FaUser, FaClock, FaFolderOpen, FaBriefcase,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaInbox, FaTag,
  FaLayerGroup, FaCoins, FaBook, FaTimes, FaHourglassHalf,
  FaBoxOpen, FaStream, FaBolt, FaGift, FaSearch,
} from "react-icons/fa";

import "./TachesAValiderBacklog.css";
import { BacklogTaskService } from "../../../../services/projet/backlog/BacklogTaskService.tsx";
import {
  BacklogTaskStatusHistory, PROJECT_TASK_STATUS,
  ChangingStatusDTO, BacklogLineProfilAsTask,
} from "../../../../types/lead/Backlog/BacklogTaskTypes.tsx";
import StatutCollaborateurTab from "../statut-collab/StatutCollaborateurTab.tsx";

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

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  const n = iso.endsWith("Z") ? iso.slice(0, -1) : iso;
  try {
    return new Date(n).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
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

const StatusBadge: React.FC<{ statusId: number }> = ({ statusId }) => {
  const m = statusMeta(statusId);
  return <span className="vld-badge" style={{ color: m.color, background: m.bg, borderColor: m.color + "40" }}>{m.label}</span>;
};

// ─── ProjetLeadChips ─────────────────────────────────────────────────────────
const ProjetLeadChips: React.FC<{ task: BacklogLineProfilAsTask }> = ({ task }) => (
  <>
    {task.projetNom && (
      <span className="vld-meta-chip vld-meta-chip--projet">
        <FaFolderOpen size={9} /> {task.projetNom}
      </span>
    )}
    {task.leadNom && (
      <span className="vld-meta-chip vld-meta-chip--lead">
        <FaBriefcase size={9} /> {task.leadNom}
      </span>
    )}
  </>
);

// ─── BacklogContextBreadcrumb — fil d'Ariane Lot › Phase › Sprint ─────────────
const BacklogContextBreadcrumb: React.FC<{ task: BacklogLineProfilAsTask }> = ({ task }) => {
  const lotNom    = (task.line as any).lotNom    ?? (task.line as any).lot?.name    ?? null;
  const phaseNom  = (task.line as any).phaseNom  ?? (task.line as any).phase?.name  ?? null;
  const sprintNom = (task.line as any).sprintNom ?? (task.line as any).sprint?.name ?? null;

  if (!lotNom && !phaseNom && !sprintNom) return null;

  return (
    <div className="vld-breadcrumb">
      {lotNom && (
        <span className="vld-breadcrumb-item vld-breadcrumb-item--lot">
          <FaBoxOpen size={9} /> {lotNom}
        </span>
      )}
      {phaseNom && (
        <>
          {lotNom && <span className="vld-breadcrumb-sep">›</span>}
          <span className="vld-breadcrumb-item vld-breadcrumb-item--phase">
            <FaStream size={9} /> {phaseNom}
          </span>
        </>
      )}
      {sprintNom && (
        <>
          {(lotNom || phaseNom) && <span className="vld-breadcrumb-sep">›</span>}
          <span className="vld-breadcrumb-item vld-breadcrumb-item--sprint">
            <FaBolt size={9} /> {sprintNom}
          </span>
        </>
      )}
    </div>
  );
};

// ─── DelivrablesList ─────────────────────────────────────────────────────────
const DelivrablesList: React.FC<{ task: BacklogLineProfilAsTask }> = ({ task }) => {
  const deliverables: any[] = (task.line as any).deliverables ?? (task.line as any).livrables ?? [];
  if (!deliverables.length) return null;

  return (
    <div className="vld-section">
      <div className="vld-section-title"><FaGift size={10} /> Livrables</div>
      <div className="vld-deliverables">
        {deliverables.map((d: any, i: number) => {
          const isDelivered = d.isDelivered ?? d.livre ?? false;
          const dlDate = d.deliveryDate ?? d.dateLivraison ?? null;
          const dlDateFmt = fmtDate(dlDate);
          const isLate = dlDate && !isDelivered && new Date(dlDate) < new Date();
          return (
            <div
              key={d.id ?? i}
              className={[
                "vld-deliverable-item",
                isDelivered ? "vld-deliverable-item--done" : "",
                isLate      ? "vld-deliverable-item--late" : "",
              ].filter(Boolean).join(" ")}
            >
              <span className="vld-deliverable-icon">
                {isDelivered
                  ? <FaCheckCircle size={11} style={{ color: "#10b981" }} />
                  : <FaGift size={11} style={{ color: isLate ? "#ef4444" : "#f97316" }} />
                }
              </span>
              <span className="vld-deliverable-name">{d.name ?? d.nom}</span>
              {dlDateFmt && (
                <span className={`vld-deliverable-date${isLate ? " vld-deliverable-date--late" : ""}`}>
                  {isLate ? "⚠ " : ""}{dlDateFmt}
                </span>
              )}
              {isDelivered && <span className="vld-deliverable-badge">Livré</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── HistoryTimeline ─────────────────────────────────────────────────────────
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
const ValidationPanel: React.FC<{
  taskId: number; service: BacklogTaskService;
  onDecision: (h: BacklogTaskStatusHistory) => void;
}> = ({ taskId, service, onDecision }) => {
  const [mode, setMode]       = useState<"valider" | "modifier" | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!mode) return;
    const newStatusId = mode === "valider" ? PROJECT_TASK_STATUS.VALIDE : PROJECT_TASK_STATUS.A_MODIFIER;
    setSaving(true); setError(null);
    try {
      const dto: ChangingStatusDTO = {
        idStatus: newStatusId,
        comment: comment.trim() || (mode === "valider" ? "Tâche validée" : "À retravailler"),
        backlogLineProfilId: taskId,
      };
      const result = await service.changeStatus(dto);
      setMode(null); setComment(""); onDecision(result);
    } catch { setError("Erreur lors de la validation."); }
    finally { setSaving(false); }
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
            {mode === "valider" ? <><FaCheckCircle size={13} /> Validation</> : <><FaTimes size={13} /> Demande de modification</>}
          </div>
          {error && <div className="vld-panel-error">{error}</div>}
          <textarea className="vld-panel-ta"
            placeholder={mode === "valider" ? "Commentaire (optionnel)…" : "Motif du refus (recommandé)…"}
            value={comment} onChange={e => setComment(e.target.value)} rows={3} autoFocus />
          <div className="vld-panel-footer">
            <button className="vld-btn vld-btn--ghost vld-btn--sm"
              onClick={() => { setMode(null); setComment(""); setError(null); }} disabled={saving}>Annuler</button>
            <button className={`vld-btn ${mode === "valider" ? "vld-btn--ok" : "vld-btn--ko"} vld-btn--sm`}
              onClick={handleSubmit} disabled={saving}>
              {saving ? <FaSpinner className="vld-spin" /> : mode === "valider" ? <FaCheckCircle size={11} /> : <FaTimes size={11} />}
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
  task: BacklogLineProfilAsTask; service: BacklogTaskService;
}> = ({ task, service }) => {
  const devise = task.deviseAbr || "€";
  const [open, setOpen]               = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.currentStatus);
  const [history, setHistory]         = useState(task.historyStatus);
  const [decided, setDecided]         = useState(false);

  const handleDecision = useCallback((h: BacklogTaskStatusHistory) => {
    setCurrentStatus(h); setHistory(prev => [...prev, h]); setDecided(true);
  }, []);

  const isValidated = currentStatus?.status?.id === PROJECT_TASK_STATUS.VALIDE;
  const isToModify  = currentStatus?.status?.id === PROJECT_TASK_STATUS.A_MODIFIER;
  const timeSpent   = task.timeSpent ?? null;
  const pct = task.volume > 0 && timeSpent != null
    ? Math.round((timeSpent / task.volume) * 100) : null;
  const isOverdue = !!task.deadLine && new Date(
    task.deadLine.endsWith("Z") ? task.deadLine.slice(0, -1) : task.deadLine
  ).getTime() < Date.now();

  return (
    <div className={["vld-card", open?"vld-card--open":"",
      isValidated?"vld-card--validated":"", isToModify?"vld-card--tomodify":""].filter(Boolean).join(" ")}>

      <div className="vld-card-header" onClick={() => setOpen(v => !v)} role="button" tabIndex={0}
        onKeyDown={e => e.key === "Enter" && setOpen(v => !v)}>
        <div className="vld-card-main">
          {/* Projet + Lead */}
          {(task.projetNom || task.leadNom) && (
            <div className="vld-card-context">
              <ProjetLeadChips task={task} />
            </div>
          )}

          {/* ── Fil d'Ariane Lot › Phase › Sprint ── */}
          <BacklogContextBreadcrumb task={task} />

          <div className="vld-card-toprow">
            <span className="vld-card-epic"><FaTag size={9} />{task.line.epic}</span>
            <StatusBadge statusId={currentStatus?.status?.id ?? 1} />
          </div>
          <p className="vld-card-story">{task.line.userStory}</p>
          <div className="vld-card-meta">
            {task.collaborateur && (
              <span className="vld-meta-chip vld-meta-chip--collab">
                <FaUser size={9} />{task.collaborateur.appellation ?? task.collaborateur.nom}
              </span>
            )}
            <span className="vld-meta-chip"><FaLayerGroup size={9} />{task.profil.name}</span>
            <span className="vld-meta-chip">
              <FaCoins size={9} />{task.volume} JH · {task.profil.tjm} {devise}/j
            </span>
            {task.deadLine && (
              <span className={`vld-meta-chip${isOverdue ? " overdue" : ""}`}>
                <FaClock size={9} />{isOverdue ? "⚠ " : ""}Deadline : {fmtDateTime(task.deadLine)}
              </span>
            )}
            {/* {timeSpent != null && (
              <span className="vld-meta-chip" style={{ color: progressColor(pct ?? 0) }}>
                <FaHourglassHalf size={9} />{timeSpent} JH passés{pct != null && ` (${pct}%)`}
              </span>
            )} */}
          </div>
          {pct != null && (
            <div className="vld-progress-wrap">
              <div className="vld-progress-track">
                <div className="vld-progress-fill"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: progressColor(pct) }} />
              </div>
              <span className="vld-progress-pct" style={{ color: progressColor(pct) }}>{pct}%</span>
            </div>
          )}
        </div>
        <div className="vld-chevron-wrap">
          {isValidated && <FaCheckCircle className="vld-done-icon" size={14} />}
          {isToModify  && <FaTimesCircle className="vld-ko-icon"   size={14} />}
          {open ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </div>
      </div>

      {open && (
        <div className="vld-card-body">

          {/* ── Section Contexte Backlog ── */}
          <div className="vld-section">
            <div className="vld-section-title"><FaBoxOpen size={10} /> Contexte backlog</div>
            <div className="vld-context-detail">
              {(() => {
                const lotNom    = (task.line as any).lotNom    ?? (task.line as any).lot?.name    ?? null;
                const phaseNom  = (task.line as any).phaseNom  ?? (task.line as any).phase?.name  ?? null;
                const sprintNom = (task.line as any).sprintNom ?? (task.line as any).sprint?.name ?? null;
                return (
                  <>
                    {lotNom && (
                      <div className="vld-context-row">
                        <span className="vld-context-label"><FaBoxOpen size={9} /> Lot</span>
                        <span className="vld-context-value">{lotNom}</span>
                      </div>
                    )}
                    {phaseNom && (
                      <div className="vld-context-row">
                        <span className="vld-context-label"><FaStream size={9} /> Phase</span>
                        <span className="vld-context-value">{phaseNom}</span>
                      </div>
                    )}
                    {sprintNom && (
                      <div className="vld-context-row">
                        <span className="vld-context-label"><FaBolt size={9} /> Sprint</span>
                        <span className="vld-context-value">{sprintNom}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* ── Livrables ── */}
          <DelivrablesList task={task} />

          {task.line.description && (
            <div className="vld-section">
              <div className="vld-section-title"><FaBook size={10} /> Description</div>
              <p className="vld-desc">{task.line.description}</p>
            </div>
          )}
          <div className="vld-section">
            <div className="vld-section-title"><FaCheckCircle size={10} /> Résultat attendu</div>
            <p className="vld-desc">{task.line.resultat}</p>
          </div>

          {/* Charge & Coût */}
          <div className="vld-section">
            <div className="vld-section-title"><FaCoins size={10} /> Charge & Coût</div>
            <div className="vld-kpi-row">
              <div className="vld-kpi">
                <span className="vld-kpi-val">{task.volume} JH</span>
                <span className="vld-kpi-lbl">Planifié</span>
              </div>
              <div className="vld-kpi">
                <span className="vld-kpi-val">{task.profil.tjm} {devise}</span>
                <span className="vld-kpi-lbl">TJM</span>
              </div>
              <div className="vld-kpi">
                <span className="vld-kpi-val">{(task.volume * task.profil.tjm).toFixed(0)} {devise}</span>
                <span className="vld-kpi-lbl">Coût estimé</span>
              </div>
              {timeSpent != null && (
                <div className="vld-kpi">
                  <span className="vld-kpi-val" style={{ color: progressColor(pct ?? 0) }}>{timeSpent} JH</span>
                  <span className="vld-kpi-lbl">Temps passé</span>
                </div>
              )}
            </div>
            {task.deadLine && (
              <div className="vld-deadline-detail" style={{ borderColor: isOverdue ? "#dc3545" : "#e2e8f0" }}>
                <FaClock size={11} style={{ color: isOverdue ? "#dc3545" : "#64748b" }} />
                <span style={{ color: isOverdue ? "#dc3545" : "#64748b", fontWeight: isOverdue ? "bold" : "normal" }}>
                  {isOverdue ? "⚠ Deadline dépassée : " : "Deadline : "}{fmtDateTime(task.deadLine)}
                </span>
              </div>
            )}
            {pct != null && (
              <div className="vld-progress-wrap" style={{ marginTop: 8 }}>
                <div className="vld-progress-track" style={{ height: 8 }}>
                  <div className="vld-progress-fill"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: progressColor(pct) }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: progressColor(pct), marginTop: 4 }}>
                  {timeSpent} JH passés sur {task.volume} JH
                  {timeSpent! > task.volume && " — ⚠ Dépassement"}
                </p>
              </div>
            )}
          </div>

          {task.collaborateur && (
            <div className="vld-section">
              <div className="vld-section-title"><FaUser size={10} /> Collaborateur</div>
              <div className="vld-collab-card">
                <div className="vld-collab-avatar">{(task.collaborateur.nom?.[0] ?? "?").toUpperCase()}</div>
                <div className="vld-collab-info">
                  <span className="vld-collab-name">
                    {task.collaborateur.appellation ?? `${task.collaborateur.nom} ${task.collaborateur.prenom}`}
                  </span>
                  {task.collaborateur.matricule && <span className="vld-collab-meta">Matricule : {task.collaborateur.matricule}</span>}
                  {task.collaborateur.emailPro   && <span className="vld-collab-meta">{task.collaborateur.emailPro}</span>}
                  <span className="vld-collab-profil">Profil : {task.profil.name} — TJM {task.profil.tjm} {devise}</span>
                </div>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="vld-section">
              <div className="vld-section-title"><FaClock size={10} /> Historique</div>
              <HistoryTimeline history={history} />
            </div>
          )}

          {!decided && !isValidated && !isToModify && (
            <div className="vld-section">
              <div className="vld-section-title"><FaHourglassHalf size={10} /> Décision</div>
              <ValidationPanel taskId={task.id} service={service} onDecision={handleDecision} />
            </div>
          )}
          {isValidated && <div className="vld-decided-banner vld-decided-banner--ok"><FaCheckCircle size={14} /> Tâche validée</div>}
          {isToModify  && <div className="vld-decided-banner vld-decided-banner--ko"><FaTimesCircle size={14} /> Renvoyée en modification</div>}
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props { service: BacklogTaskService; currentUserName?: string; deviseAbr?: string; hiddenProjetIds?: Set<number>; }

const TachesAValiderBacklog: React.FC<Props> = ({ service, currentUserName = "Utilisateur", deviseAbr: _deviseAbr, hiddenProjetIds }) => {
  const [tasks, setTasks]     = useState<BacklogLineProfilAsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await service.getTasksToValidate();
        if (!cancelled) setTasks(data);
      } catch { if (!cancelled) setError("Impossible de charger les tâches à valider."); }
      finally  { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [service]);

  const visible = tasks.filter(t => !hiddenProjetIds?.has(t.projetId!));

  const filtered = visible.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.projetNom ?? "").toLowerCase().includes(q) ||
      (t.leadNom ?? "").toLowerCase().includes(q) ||
      t.line.epic.toLowerCase().includes(q) ||
      t.line.userStory.toLowerCase().includes(q)
    );
  });

  const pending = visible.filter(t => t.currentStatus?.status?.id === PROJECT_TASK_STATUS.EN_ATTENTE_VALIDATION).length;

  return (
    <div className="mes-taches-wrapper">
      <div className="vld-page-header">
        <div>
          <h4 className="vld-page-title">Tâches à valider</h4>
          <p className="vld-page-sub">
            {loading ? "Chargement…" : `${visible.length} tâche${visible.length !== 1 ? "s" : ""} · ${pending} en attente`}
          </p>
        </div>
      </div>

      {!loading && !error && (
        <div className="vld-stats">
          <div className="vld-stat-pill">
            <FaHourglassHalf className="sp-icon sp-wait" />
            <div><span className="sp-num">{pending}</span><span className="sp-lbl">En attente</span></div>
          </div>
          <div className="vld-stat-pill">
            <FaCheckCircle className="sp-icon sp-progress" />
            <div><span className="sp-num">{visible.filter(t => t.currentStatus?.status?.id === PROJECT_TASK_STATUS.VALIDE).length}</span><span className="sp-lbl">Validées</span></div>
          </div>
          <div className="vld-stat-pill">
            <FaTimes className="sp-icon sp-ko" />
            <div><span className="sp-num">{visible.filter(t => t.currentStatus?.status?.id === PROJECT_TASK_STATUS.A_MODIFIER).length}</span><span className="sp-lbl">Refusées</span></div>
          </div>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="btb-search-bar">
          <FaSearch className="btb-search-icon" />
          <input
            type="text"
            className="btb-search-input"
            placeholder="Rechercher par projet, épic, user story…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="btb-search-clear" onClick={() => setSearch("")}><FaTimes size={12} /></button>
          )}
        </div>
      )}

      {loading  && <div className="vld-state-box"><FaSpinner className="vld-spin vld-spin--lg" /><p>Chargement…</p></div>}
      {!loading && error && <div className="vld-state-box vld-state-box--error"><FaTimesCircle size={28} /><p>{error}</p></div>}
      {!loading && !error && visible.length === 0 && (
        <div className="vld-state-box vld-state-box--empty"><FaInbox size={34} /><p>Aucune tâche à valider</p></div>
      )}
      {!loading && !error && visible.length > 0 && filtered.length === 0 && (
        <div className="vld-state-box vld-state-box--empty">
          <FaSearch size={28} /><p>Aucun résultat pour « {search} »</p>
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="vld-list">
          {filtered.map(t => <ValidateTaskCard key={t.id} task={t} service={service} />)}
        </div>
      )}
    </div>
  );
};

export default TachesAValiderBacklog;