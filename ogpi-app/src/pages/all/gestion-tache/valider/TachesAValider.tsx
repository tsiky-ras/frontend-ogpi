import React, { useState, useEffect, useCallback } from "react";
import {
  FaClock, FaCheckCircle, FaChevronDown, FaChevronUp,
  FaFileAlt, FaFolder, FaUser, FaCalendarAlt, FaExternalLinkAlt,
  FaTimesCircle, FaTag, FaSpinner, FaInbox, FaThumbsUp, FaThumbsDown,
} from "react-icons/fa";
import "./TachesAValider.css";
/* ═══════════════════════════════════════
   TYPES (réutilisés depuis MesTaches)
═══════════════════════════════════════ */
interface LeadTaskStatus {
  leadTaskStatusId: number;
  leadTaskStatusLabel: string;
}

interface DriveFile {
  id?: number;
  name: string;
  link: string;
  description: string;
  driveFolderId?: number;
}

interface TaskFile {
  id?: number;
  commentaire: string;
  driveFile: DriveFile;
  leadTaskUserId: number;
}

interface StatusEntry {
  leadTaskUserStatusId: number;
  leadTaskUserStatusDate: string;
  leadTaskUserStatusCommentaire: string;
  leadTaskStatus: LeadTaskStatus;
}

interface LeadTaskUserSummary {
  leadTaskUserId: number;
  dateAffectation: string;
  leadTaskUserDeadline: string | null;
  leadTask: { leadTaskId: number; leadTaskName: string; leadTaskDesc: string };
  leadId: number;
  leadTaskUserStatus: { leadTaskStatus: LeadTaskStatus };
  leadDetails: { leadName: string; leadRef: string };
}

interface LeadTaskUserDetails extends LeadTaskUserSummary {
  leadTaskUserStatusList: StatusEntry[] | null;
  leadTaskValidations: Array<{
    id: number; validationTime: string; decision: number;
    user: { id: number; username: string; email: string };
    role: { roleId: number; roleLabel: string };
  }> | null;
  leadTaskFiles: TaskFile[] | null;
  leadDetails: {
    leadName: string; leadRef: string;
    leadInternalDeadLine: string | null; leadRealDeadLine: string | null;
    client: { id: number; name: string; email: string; phone: string } | null;
    mainDriveFile: { id: number; name: string; link: string; description: string } | null;
    driveFolder: { id: number; name: string; link: string } | null;
  };
}

interface ILeadTaskUserService {
  getAll(): Promise<LeadTaskUserSummary[]>;
  getById(id: number): Promise<LeadTaskUserDetails>;
}

interface ILeadTaskValidationService {
  create(data: {
    leadTaskUserId: number;
    decision: number; // 1 = GO, 0 = NO GO
    commentaire: string;
  }): Promise<unknown>;
}

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const STATUS_COLORS: Record<number, string> = {
  1: "#94a3b8", 2: "#f59e0b", 3: "#3b82f6",
  4: "#8b5cf6", 5: "#ef4444", 6: "#f97316", 7: "#10b981",
};
const statusColor = (id: number) => STATUS_COLORS[id] ?? "#64748b";
const isOverdue = (d: string | null) => !!d && new Date(d).getTime() < Date.now();
const isSoon = (d: string | null) => {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 2 * 3600 * 1000;
};

/* ═══════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════ */
const StatusBadge: React.FC<{ statusId: number; label: string }> = ({ statusId, label }) => {
  const c = statusColor(statusId);
  return (
    <span className="mt-badge" style={{ color: c, background: c + "18", border: `1px solid ${c}33` }}>
      {label}
    </span>
  );
};

/* ═══════════════════════════════════════
   GO / NO GO PANEL
═══════════════════════════════════════ */
interface GoNogoPanelProps {
  leadTaskUserId: number;
  validationService: ILeadTaskValidationService;
  onValidated: () => void;
  existingValidations: LeadTaskUserDetails["leadTaskValidations"];
}

const GoNogoPanel: React.FC<GoNogoPanelProps> = ({
  leadTaskUserId, validationService, onValidated, existingValidations,
}) => {
  const [pending, setPending] = useState<1 | 0 | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasValidated = existingValidations && existingValidations.length > 0;

  const handleDecision = (decision: 1 | 0) => {
    setPending(decision);
    setCommentaire("");
    setError(null);
  };

  const handleConfirm = async () => {
    if (pending === null) return;
    setSaving(true);
    setError(null);
    try {
      await validationService.create({
        leadTaskUserId,
        decision: pending,
        commentaire: commentaire.trim() || (pending === 1 ? "GO" : "NO GO"),
      });
      setSuccess(true);
      setPending(null);
      onValidated();
    } catch {
      setError("Erreur lors de la validation. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPending(null);
    setCommentaire("");
    setError(null);
  };

  if (success) {
    return (
      <div className="tav-gonogo-wrapper">
        <div className="tav-gonogo-success">
          <FaCheckCircle className="tav-gonogo-success-icon" />
          <span>Votre décision a bien été enregistrée.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tav-gonogo-wrapper">
      <div className="tav-gonogo-label">
        Décision de validation
        {hasValidated && (
          <span className="tav-gonogo-already">
            (déjà validé par {existingValidations!.length} intervenant{existingValidations!.length > 1 ? "s" : ""})
          </span>
        )}
      </div>

      <div className="tav-gonogo-buttons">
        <button
          className={`tav-gonogo-btn go${pending === 1 ? " active" : ""}`}
          onClick={() => handleDecision(1)}
          disabled={saving}
        >
          <FaThumbsUp size={14} /> GO
        </button>
        <button
          className={`tav-gonogo-btn nogo${pending === 0 ? " active" : ""}`}
          onClick={() => handleDecision(0)}
          disabled={saving}
        >
          <FaThumbsDown size={14} /> NO GO
        </button>
      </div>

      {pending !== null && (
        <div className="tav-gonogo-confirm-box">
          <div className="tav-gonogo-confirm-header">
            {pending === 1
              ? <><FaCheckCircle className="go-icon" /> <span>Confirmer le <strong>GO</strong></span></>
              : <><FaTimesCircle className="nogo-icon" /> <span>Confirmer le <strong>NO GO</strong></span></>
            }
          </div>
          {error && <div className="mt-scb-error">{error}</div>}
          <textarea
            className="mt-scb-textarea"
            placeholder={pending === 1 ? "Commentaire GO (optionnel)…" : "Raison du refus (optionnel)…"}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="mt-scb-footer">
            <button className="mt-btn mt-btn--ghost mt-btn--sm" onClick={handleCancel} disabled={saving}>
              Annuler
            </button>
            <button
              className={`mt-btn mt-btn--sm${pending === 1 ? " mt-btn--primary" : " mt-btn--danger"}`}
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? <FaSpinner className="mt-spin" /> : pending === 1 ? <FaThumbsUp size={12} /> : <FaThumbsDown size={12} />}
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════
   EXPANDED DETAILS (version validation)
═══════════════════════════════════════ */
interface ExpandedDetailsValidationProps {
  details: LeadTaskUserDetails;
  validationService: ILeadTaskValidationService;
  onReload: () => void;
}

const ExpandedDetailsValidation: React.FC<ExpandedDetailsValidationProps> = ({
  details, validationService, onReload,
}) => {
  const lead = details.leadDetails;

  return (
    <div className="mt-expanded">

      {/* GO / NO GO panel */}
      <div className="mt-section">
        <GoNogoPanel
          leadTaskUserId={details.leadTaskUserId}
          validationService={validationService}
          onValidated={onReload}
          existingValidations={details.leadTaskValidations}
        />
      </div>

      {/* Lead info */}
      <div className="mt-section">
        <div className="mt-section-title"><FaTag size={11} /> Informations Lead</div>
        <div className="mt-info-grid">
          {lead.client && (
            <div className="mt-info-block">
              <FaUser className="mt-info-icon" />
              <div>
                <span className="mt-info-label">Client</span>
                <span className="mt-info-value">{lead.client.name}</span>
                <span className="mt-info-sub">{lead.client.email} · {lead.client.phone}</span>
              </div>
            </div>
          )}
          {lead.leadInternalDeadLine && (
            <div className="mt-info-block">
              <FaCalendarAlt className="mt-info-icon" />
              <div>
                <span className="mt-info-label">Deadline interne</span>
                <span className="mt-info-value">{fmtDate(lead.leadInternalDeadLine)}</span>
              </div>
            </div>
          )}
          {lead.leadRealDeadLine && (
            <div className="mt-info-block">
              <FaCalendarAlt className="mt-info-icon" />
              <div>
                <span className="mt-info-label">Deadline réelle</span>
                <span className="mt-info-value">{fmtDate(lead.leadRealDeadLine)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="mt-drive-row">
          {lead.mainDriveFile && (
            <a href={lead.mainDriveFile.link} target="_blank" rel="noreferrer" className="mt-drive-link mt-drive-link--file">
              <FaFileAlt size={12} /><span>{lead.mainDriveFile.name}</span><FaExternalLinkAlt size={9} />
            </a>
          )}
          {lead.driveFolder && (
            <a href={lead.driveFolder.link} target="_blank" rel="noreferrer" className="mt-drive-link mt-drive-link--folder">
              <FaFolder size={12} /><span>{lead.driveFolder.name}</span><FaExternalLinkAlt size={9} />
            </a>
          )}
        </div>
      </div>

      {/* Files (lecture seule) */}
      {details.leadTaskFiles && details.leadTaskFiles.length > 0 && (
        <div className="mt-section">
          <div className="mt-section-title">
            <FaFileAlt size={11} /> Fichiers de la tâche
            <span className="mt-section-count">{details.leadTaskFiles.length}</span>
          </div>
          <div className="mt-files">
            {details.leadTaskFiles.map((f) => (
              <div key={f.id} className="mt-file-item">
                <FaFileAlt size={14} className="mt-file-icon" />
                <div className="mt-file-info">
                  <a href={f.driveFile.link} target="_blank" rel="noreferrer" className="mt-file-name">
                    {f.driveFile.name} <FaExternalLinkAlt size={9} />
                  </a>
                  {f.commentaire && <span className="mt-file-comment">{f.commentaire}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status history */}
      {details.leadTaskUserStatusList && details.leadTaskUserStatusList.length > 0 && (
        <div className="mt-section">
          <div className="mt-section-title"><FaClock size={11} /> Historique des statuts</div>
          <div className="mt-history">
            {details.leadTaskUserStatusList.map((s) => (
              <div key={s.leadTaskUserStatusId} className="mt-history-item">
                <span className="mt-history-dot" style={{ background: statusColor(s.leadTaskStatus.leadTaskStatusId) }} />
                <div className="mt-history-body">
                  <span className="mt-history-label">{s.leadTaskStatus.leadTaskStatusLabel}</span>
                  <span className="mt-history-comment">{s.leadTaskUserStatusCommentaire}</span>
                  <span className="mt-history-date">{fmt(s.leadTaskUserStatusDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validations existantes */}
      {details.leadTaskValidations && details.leadTaskValidations.length > 0 && (
        <div className="mt-section">
          <div className="mt-section-title"><FaCheckCircle size={11} /> Validations</div>
          <div className="mt-validations">
            {details.leadTaskValidations.map((v) => (
              <div key={v.id} className={`mt-val-item ${v.decision === 1 ? "go" : "nogo"}`}>
                <div className="mt-val-decision">
                  {v.decision === 1
                    ? <FaCheckCircle className="go-icon" />
                    : <FaTimesCircle className="nogo-icon" />}
                  <strong>{v.decision === 1 ? "GO" : "NO GO"}</strong>
                </div>
                <div className="mt-val-body">
                  <span className="mt-val-user">{v.user.username}</span>
                  <span className="mt-val-role">{v.role.roleLabel}</span>
                  <span className="mt-val-date">{fmt(v.validationTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════
   TASK CARD (validation)
═══════════════════════════════════════ */
const TacheAValiderCard: React.FC<{
  tache: LeadTaskUserSummary;
  taskService: ILeadTaskUserService;
  validationService: ILeadTaskValidationService;
}> = ({ tache, taskService, validationService }) => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<LeadTaskUserDetails | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadDetails = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const d = await taskService.getById(tache.leadTaskUserId);
      setDetails(d);
    } catch (e) {
      console.error("Erreur chargement détails tâche:", e);
    } finally {
      setLoadingDetail(false);
    }
  }, [tache.leadTaskUserId, taskService]);

  const handleToggle = useCallback(async () => {
    if (!open && !details) await loadDetails();
    setOpen((v) => !v);
  }, [open, details, loadDetails]);

  const handleValidated = useCallback(async () => {
    await loadDetails();
  }, [loadDetails]);

  const overdue = isOverdue(tache.leadTaskUserDeadline);
  const soon = isSoon(tache.leadTaskUserDeadline);

  return (
    <div className={[
      "mt-card",
      open ? "mt-card--open" : "",
      overdue ? "mt-card--overdue" : "",
      soon && !overdue ? "mt-card--soon" : "",
    ].filter(Boolean).join(" ")}>
      <div
        className="mt-card-header"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleToggle()}
      >
        <div className="mt-card-main">
          <div className="mt-card-toprow">
            <span className="mt-card-name">{tache.leadTask.leadTaskName}</span>
            <StatusBadge
              statusId={tache.leadTaskUserStatus.leadTaskStatus.leadTaskStatusId}
              label={tache.leadTaskUserStatus.leadTaskStatus.leadTaskStatusLabel}
            />
          </div>
          <div className="mt-card-meta">
            <span className="mt-meta-chip mt-meta-lead">
              <FaTag size={9} />{tache.leadDetails.leadRef} · {tache.leadDetails.leadName}
            </span>
            <span className="mt-meta-chip">
              <FaCalendarAlt size={9} />Affecté le {fmtDate(tache.dateAffectation)}
            </span>
            {tache.leadTaskUserDeadline && (
              <span className={`mt-meta-chip mt-meta-deadline${overdue ? " overdue" : soon ? " soon" : ""}`}>
                <FaClock size={9} />Deadline : {fmt(tache.leadTaskUserDeadline)}
              </span>
            )}
          </div>
        </div>
        <button className="mt-chevron-btn" aria-label="Voir les détails">
          {loadingDetail
            ? <FaSpinner className="mt-spin" />
            : open ? <FaChevronUp size={13} /> : <FaChevronDown size={13} />}
        </button>
      </div>

      {open && !loadingDetail && details && (
        <ExpandedDetailsValidation
          details={details}
          validationService={validationService}
          onReload={handleValidated}
        />
      )}
      {open && loadingDetail && (
        <div className="mt-detail-loading"><FaSpinner className="mt-spin" /> Chargement…</div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
interface Props {
  taskService: ILeadTaskUserService;
  validationService: ILeadTaskValidationService;
  currentUserName?: string;
}

const TachesAValider: React.FC<Props> = ({
  taskService, validationService, currentUserName = "Utilisateur",
}) => {
  const [taches, setTaches] = useState<LeadTaskUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await taskService.getAll();
        if (!cancelled) setTaches(data);
      } catch (e) {
        if (!cancelled) setError("Impossible de charger les tâches à valider.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [taskService]);

  return (
    <div className="mes-taches-wrapper">
      <div className="mt-header">
        <div>
          <h4 className="mt-title">Tâches à valider</h4>
          <p className="mt-subtitle">
            Bonjour <strong>{currentUserName}</strong> —{" "}
            {loading
              ? "chargement…"
              : `${taches.length} tâche${taches.length !== 1 ? "s" : ""} en attente de validation`}
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-state-box">
          <FaSpinner className="mt-spin mt-spin--lg" /><p>Chargement des tâches…</p>
        </div>
      )}
      {!loading && error && (
        <div className="mt-state-box mt-state-box--error">
          <FaTimesCircle size={30} /><p>{error}</p>
        </div>
      )}
      {!loading && !error && taches.length === 0 && (
        <div className="mt-state-box mt-state-box--empty">
          <FaInbox size={36} className="mt-empty-icon" />
          <p>Aucune tâche à valider pour le moment</p>
          <span>Tout est à jour !</span>
        </div>
      )}

      {!loading && !error && taches.length > 0 && (
        <div className="mt-list">
          {taches.map((t) => (
            <TacheAValiderCard
              key={t.leadTaskUserId}
              tache={t}
              taskService={taskService}
              validationService={validationService}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TachesAValider;