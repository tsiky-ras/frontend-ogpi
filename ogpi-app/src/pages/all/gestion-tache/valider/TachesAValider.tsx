import React, { useState, useEffect, useCallback } from "react";
import {
  FaClock, FaCheckCircle, FaChevronDown, FaChevronUp,
  FaFileAlt, FaFolder, FaUser, FaCalendarAlt, FaExternalLinkAlt,
  FaTimesCircle, FaTag, FaSpinner, FaInbox, FaThumbsUp, FaThumbsDown,
  FaSearch, FaTimes,
} from "react-icons/fa";
import "./TachesAValider.css";

/* ═══════════════════════════════════════
   TYPES
═══════════════════════════════════════ */
interface LeadTaskStatus {
  leadTaskStatusId: number;
  leadTaskStatusLabel: string;
}
interface DriveFile {
  id?: number; name: string; link: string; description: string; driveFolderId?: number;
}
interface TaskFile {
  id?: number; commentaire: string; driveFile: DriveFile; leadTaskUserId: number;
}
interface StatusEntry {
  leadTaskUserStatusId: number; leadTaskUserStatusDate: string;
  leadTaskUserStatusCommentaire: string; leadTaskStatus: LeadTaskStatus;
}
interface LeadTaskUserSummary {
  leadTaskUserId: number; dateAffectation: string; leadTaskUserDeadline: string | null;
  leadTask: { leadTaskId: number; leadTaskName: string; leadTaskDesc: string };
  leadId: number;
  leadTaskUserStatus: { leadTaskStatus: LeadTaskStatus };
  leadDetails: { leadName: string; leadRef: string };
}
interface LeadTaskUserDetails extends LeadTaskUserSummary {
  leadTaskUserStatusList: StatusEntry[] | null;
  leadTaskValidations: Array<{
    id: number; validationTime: string; decision: number; comment?: string | null;
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
  create(data: { leadTaskUserId: number; decision: number; commentaire: string; comment: string }): Promise<unknown>;
}

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};
const STATUS_COLORS: Record<number, string> = {
  1: "#94a3b8", 2: "#f59e0b", 3: "#3b82f6", 4: "#8b5cf6", 5: "#ef4444", 6: "#f97316", 7: "#10b981",
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
  return <span className="mt-badge" style={{ color: c, background: c + "18", border: `1px solid ${c}33` }}>{label}</span>;
};

/* ═══════════════════════════════════════
   POPUP RÉSULTAT
═══════════════════════════════════════ */
const ResultPopup: React.FC<{ decision: 1 | 0; onClose: () => void }> = ({ decision, onClose }) => (
  <div className="tav-result-overlay" onClick={onClose}>
    <div className={`tav-result-popup ${decision === 1 ? "ok" : "ko"}`} onClick={(e) => e.stopPropagation()}>
      <button className="tav-result-close" onClick={onClose}><FaTimesCircle size={16} /></button>
      <div className="tav-result-icon">
        {decision === 1
          ? <FaCheckCircle size={42} className="tav-result-ok-icon" />
          : <FaTimesCircle size={42} className="tav-result-ko-icon" />}
      </div>
      <h5 className="tav-result-title">
        {decision === 1 ? "Décision OK enregistrée" : "Décision KO enregistrée"}
      </h5>
      <p className="tav-result-msg">
        {decision === 1
          ? "Votre validation a bien été prise en compte."
          : "Votre décision a bien été prise en compte. Le collaborateur a été informé qu'il devra corriger des éléments de la tâche."}
      </p>
      <button className="mt-btn mt-btn--primary tav-result-btn" onClick={onClose}>Fermer</button>
    </div>
  </div>
);

/* ═══════════════════════════════════════
   VALIDATIONS EXISTANTES (lecture seule)
═══════════════════════════════════════ */
const ValidationsList: React.FC<{ validations: LeadTaskUserDetails["leadTaskValidations"] }> = ({ validations }) => {
  if (!validations || validations.length === 0) return null;
  return (
    <div className="mt-section">
      <div className="mt-section-title"><FaCheckCircle size={11} /> Validations existantes</div>
      <div className="mt-validations">
        {validations.map((v) => (
          <div key={v.id} className={`mt-val-item ${v.decision === 1 ? "go" : "nogo"}`}>
            <div className="mt-val-decision">
              {v.decision === 1 ? <FaCheckCircle className="go-icon" /> : <FaTimesCircle className="nogo-icon" />}
              <strong>{v.decision === 1 ? "OK" : "KO"}</strong>
            </div>
            <div className="mt-val-body">
              <span className="mt-val-user">{v.user.username}</span>
              <span className="mt-val-role">{v.role.roleLabel}</span>
              {v.comment && <span className="mt-val-comment">"{v.comment}"</span>}
              <span className="mt-val-date">{fmt(v.validationTime)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   OK / KO PANEL
═══════════════════════════════════════ */
interface OkKoPanelProps {
  leadTaskUserId: number;
  validationService: ILeadTaskValidationService;
  onValidated: (decision: 1 | 0) => void;
  existingValidations: LeadTaskUserDetails["leadTaskValidations"];
}

const OkKoPanel: React.FC<OkKoPanelProps> = ({ leadTaskUserId, validationService, onValidated, existingValidations }) => {
  const [pending, setPending] = useState<1 | 0 | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = existingValidations?.length ?? 0;

  const handleDecision = (d: 1 | 0) => { setPending(d); setCommentaire(""); setError(null); };
  const handleCancel = () => { setPending(null); setCommentaire(""); setError(null); };

  const handleConfirm = async () => {
    if (pending === null) return;
    setSaving(true); setError(null);
    try {
      const commentText = commentaire.trim() || (pending === 1 ? "OK" : "KO");
      await validationService.create({
        leadTaskUserId,
        decision: pending,
        commentaire: commentText,
        comment: commentText,   // ← les deux champs sont envoyés
      });
      const decided = pending;
      setPending(null);
      setCommentaire("");
      onValidated(decided);
    } catch {
      setError("Erreur lors de la validation. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tav-gonogo-wrapper">
      <div className="tav-gonogo-label">
        Votre décision
        {count > 0 && (
          <span className="tav-gonogo-already">
            ({count} décision{count > 1 ? "s" : ""} déjà enregistrée{count > 1 ? "s" : ""})
          </span>
        )}
      </div>
      <div className="tav-gonogo-buttons">
        <button className={`tav-gonogo-btn go${pending === 1 ? " active" : ""}`} onClick={() => handleDecision(1)} disabled={saving}>
          <FaThumbsUp size={14} /> OK
        </button>
        <button className={`tav-gonogo-btn nogo${pending === 0 ? " active" : ""}`} onClick={() => handleDecision(0)} disabled={saving}>
          <FaThumbsDown size={14} /> KO
        </button>
      </div>
      {pending !== null && (
        <div className="tav-gonogo-confirm-box">
          <div className="tav-gonogo-confirm-header">
            {pending === 1
              ? <><FaCheckCircle className="go-icon" /><span>Confirmer la décision <strong>OK</strong></span></>
              : <><FaTimesCircle className="nogo-icon" /><span>Confirmer la décision <strong>KO</strong></span></>}
          </div>
          {error && <div className="mt-scb-error">{error}</div>}
          <textarea
            className="mt-scb-textarea"
            placeholder={pending === 1 ? "Commentaire (optionnel)…" : "Raison du refus (optionnel)…"}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3} autoFocus
          />
          <div className="mt-scb-footer">
            <button className="mt-btn mt-btn--ghost mt-btn--sm" onClick={handleCancel} disabled={saving}>Annuler</button>
            <button
              className={`mt-btn mt-btn--sm${pending === 1 ? " mt-btn--primary" : " mt-btn--danger"}`}
              onClick={handleConfirm} disabled={saving}
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
   EXPANDED DETAILS (validation)
═══════════════════════════════════════ */
interface ExpandedDetailsValidationProps {
  details: LeadTaskUserDetails;
  validationService: ILeadTaskValidationService;
  onReload: () => void;
}

const ExpandedDetailsValidation: React.FC<ExpandedDetailsValidationProps> = ({ details, validationService, onReload }) => {
  const lead = details.leadDetails;
  const [popupDecision, setPopupDecision] = useState<1 | 0 | null>(null);

  const handleValidated = (decision: 1 | 0) => setPopupDecision(decision);
  const handlePopupClose = () => { setPopupDecision(null); onReload(); };

  return (
    <div className="mt-expanded">
      {popupDecision !== null && <ResultPopup decision={popupDecision} onClose={handlePopupClose} />}

      {/* ① Validations existantes */}
      <ValidationsList validations={details.leadTaskValidations} />

      {/* ② Panel OK / KO */}
      <div className="mt-section">
        <OkKoPanel
          leadTaskUserId={details.leadTaskUserId}
          validationService={validationService}
          onValidated={handleValidated}
          existingValidations={details.leadTaskValidations}
        />
      </div>

      {/* ③ Informations Lead */}
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
              <div><span className="mt-info-label">Deadline interne</span><span className="mt-info-value">{fmtDate(lead.leadInternalDeadLine)}</span></div>
            </div>
          )}
          {lead.leadRealDeadLine && (
            <div className="mt-info-block">
              <FaCalendarAlt className="mt-info-icon" />
              <div><span className="mt-info-label">Deadline réelle</span><span className="mt-info-value">{fmtDate(lead.leadRealDeadLine)}</span></div>
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

      {/* ④ Fichiers (lecture seule) */}
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

      {/* ⑤ Historique statuts */}
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
  onGlobalReload: () => void;
}> = ({ tache, taskService, validationService, onGlobalReload }) => {
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

  const overdue = isOverdue(tache.leadTaskUserDeadline);
  const soon = isSoon(tache.leadTaskUserDeadline);

  return (
    <div className={["mt-card", open ? "mt-card--open" : "", overdue ? "mt-card--overdue" : "", soon && !overdue ? "mt-card--soon" : ""].filter(Boolean).join(" ")}>
      <div className="mt-card-header" onClick={handleToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleToggle()}>
        <div className="mt-card-main">
          <div className="mt-card-toprow">
            <span className="mt-card-name">{tache.leadTask.leadTaskName}</span>
            <StatusBadge statusId={tache.leadTaskUserStatus.leadTaskStatus.leadTaskStatusId} label={tache.leadTaskUserStatus.leadTaskStatus.leadTaskStatusLabel} />
          </div>
          <div className="mt-card-meta">
            <span className="mt-meta-chip mt-meta-lead"><FaTag size={9} />{tache.leadDetails.leadRef} · {tache.leadDetails.leadName}</span>
            <span className="mt-meta-chip"><FaCalendarAlt size={9} />Affecté le {fmtDate(tache.dateAffectation)}</span>
            {tache.leadTaskUserDeadline && (
              <span className={`mt-meta-chip mt-meta-deadline${overdue ? " overdue" : soon ? " soon" : ""}`}>
                <FaClock size={9} />Deadline : {fmt(tache.leadTaskUserDeadline)}
              </span>
            )}
          </div>
        </div>
        <button className="mt-chevron-btn" aria-label="Voir les détails">
          {loadingDetail ? <FaSpinner className="mt-spin" /> : open ? <FaChevronUp size={13} /> : <FaChevronDown size={13} />}
        </button>
      </div>

      {open && !loadingDetail && details && (
        <ExpandedDetailsValidation details={details} validationService={validationService} onReload={onGlobalReload} />
      )}
      {open && loadingDetail && <div className="mt-detail-loading"><FaSpinner className="mt-spin" /> Chargement…</div>}
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
  hiddenLeadIds?: Set<number>;
}

const TachesAValider: React.FC<Props> = ({ taskService, validationService, currentUserName = "Utilisateur", hiddenLeadIds }) => {
  const [taches, setTaches] = useState<LeadTaskUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadAll = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await taskService.getAll();
      setTaches(data);
    } catch (e) {
      setError("Impossible de charger les tâches à valider.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [taskService]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
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

  const visible = taches.filter((t) => !hiddenLeadIds?.has(t.leadId));

  const filtered = visible.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.leadDetails.leadName.toLowerCase().includes(q) ||
      t.leadDetails.leadRef.toLowerCase().includes(q) ||
      t.leadTask.leadTaskName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mes-taches-wrapper">
      <div className="mt-header">
        <div>
          <h4 className="mt-title">Tâches à valider</h4>
          <p className="mt-subtitle">
            Bonjour <strong>{currentUserName}</strong> —{" "}
            {loading ? "chargement…" : `${visible.length} tâche${visible.length !== 1 ? "s" : ""} en attente de validation`}
          </p>
        </div>
      </div>

      {!loading && !error && visible.length > 0 && (
        <div className="mt-search-bar">
          <FaSearch className="mt-search-icon" />
          <input
            type="text"
            className="mt-search-input"
            placeholder="Rechercher par nom de lead, référence ou tâche…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="mt-search-clear" onClick={() => setSearch("")}><FaTimes size={12} /></button>
          )}
        </div>
      )}

      {loading && <div className="mt-state-box"><FaSpinner className="mt-spin mt-spin--lg" /><p>Chargement des tâches…</p></div>}
      {!loading && error && <div className="mt-state-box mt-state-box--error"><FaTimesCircle size={30} /><p>{error}</p></div>}
      {!loading && !error && visible.length === 0 && (
        <div className="mt-state-box mt-state-box--empty">
          <FaInbox size={36} className="mt-empty-icon" />
          <p>Aucune tâche à valider pour le moment</p><span>Tout est à jour !</span>
        </div>
      )}
      {!loading && !error && visible.length > 0 && filtered.length === 0 && (
        <div className="mt-state-box mt-state-box--empty">
          <FaSearch size={30} className="mt-empty-icon" />
          <p>Aucun résultat pour « {search} »</p>
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="mt-list">
          {filtered.map((t) => (
            <TacheAValiderCard
              key={t.leadTaskUserId}
              tache={t}
              taskService={taskService}
              validationService={validationService}
              onGlobalReload={loadAll}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TachesAValider;