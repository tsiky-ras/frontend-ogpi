import React, { useState, useEffect, useCallback } from "react";
import {
  FaClock, FaHourglassHalf, FaCheckCircle, FaChevronDown, FaChevronUp,
  FaFileAlt, FaFolder, FaUser, FaCalendarAlt, FaExternalLinkAlt,
  FaTimesCircle, FaTag, FaSpinner, FaInbox, FaPlus, FaEdit, FaTrash,
  FaTimes, FaSave, FaArrowRight,
} from "react-icons/fa";
import "./MesTaches.css";

/* ═══════════════════════════════════════
   CONSTANTES STATUTS
═══════════════════════════════════════ */
const STATUS = {
  EN_ATTENTE_ATTRIBUTION: 1,
  ATTRIBUE_EN_ATTENTE: 2,
  ATTRIBUE: 3,
  EN_COURS: 4,
  A_MODIFIER: 5,
  SOUMIS_POUR_VALIDATION: 6,
  APPROUVE: 7,
} as const;

const SLIDER_STEPS = [
  { id: STATUS.ATTRIBUE,               label: "Attribué",               short: "Attribué" },
  { id: STATUS.EN_COURS,               label: "En cours",               short: "En cours" },
  { id: STATUS.SOUMIS_POUR_VALIDATION, label: "Soumis pour validation", short: "Soumis" },
];

// A_MODIFIER se comporte comme ATTRIBUE : on peut repasser EN_COURS
const ALLOWED_TRANSITIONS: Record<number, number> = {
  [STATUS.ATTRIBUE]:   STATUS.EN_COURS,
  [STATUS.EN_COURS]:   STATUS.SOUMIS_POUR_VALIDATION,
  [STATUS.A_MODIFIER]: STATUS.EN_COURS,
};

/* ═══════════════════════════════════════
   TYPES
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

interface ILeadTaskFileService {
  create(data: TaskFile): Promise<TaskFile>;
  update(id: number, data: TaskFile): Promise<TaskFile>;
  delete(id: number): Promise<void>;
}

interface ILeadTaskUserStatusService {
  create(data: {
    leadTaskUserStatusCommentaire: string;
    leadTaskStatus: { leadTaskStatusId: number };
    leadTaskUserId: number;
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
   STATUS SLIDER
═══════════════════════════════════════ */
interface StatusSliderProps {
  currentStatusId: number;
  leadTaskUserId: number;
  statusService: ILeadTaskUserStatusService;
  onStatusChanged: (newStatusId: number, newStatusLabel: string) => void;
}

const StatusSlider: React.FC<StatusSliderProps> = ({
  currentStatusId, leadTaskUserId, statusService, onStatusChanged,
}) => {
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatusId = ALLOWED_TRANSITIONS[currentStatusId] ?? null;

  // A_MODIFIER se comporte visuellement comme ATTRIBUE (step 0), couleur rouge
  const currentIdx = currentStatusId === STATUS.A_MODIFIER
    ? 0
    : SLIDER_STEPS.findIndex((s) => s.id === currentStatusId);
  const displayIdx = currentIdx >= 0 ? currentIdx : 0;

  const handleStepClick = (stepId: number) => {
    if (stepId === nextStatusId) {
      setPendingStatusId(stepId);
      setCommentaire("");
      setError(null);
    }
  };

  const handleConfirm = async () => {
    if (!pendingStatusId) return;
    setSaving(true);
    setError(null);
    try {
      await statusService.create({
        leadTaskUserStatusCommentaire: commentaire.trim() || "Changement de statut",
        leadTaskStatus: { leadTaskStatusId: pendingStatusId },
        leadTaskUserId,
      });
      const newStep = SLIDER_STEPS.find(s => s.id === pendingStatusId);
      setPendingStatusId(null);
      setCommentaire("");
      // Notifie le parent avec le nouveau statut pour maj immédiate de la liste
      onStatusChanged(pendingStatusId, newStep?.label ?? "");
    } catch {
      setError("Erreur lors du changement de statut. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPendingStatusId(null);
    setCommentaire("");
    setError(null);
  };

  const isTerminal = ([STATUS.SOUMIS_POUR_VALIDATION, STATUS.APPROUVE] as number[]).includes(currentStatusId);

  return (
    <div className="mt-status-slider-wrapper">
      <div className="mt-slider-label">
        Progression de la tâche
        {currentStatusId === STATUS.A_MODIFIER && (
          <span className="mt-slider-warning">⚠ À modifier suite à un refus</span>
        )}
        {isTerminal && (
          <span className="mt-slider-info">✓ Statut final atteint</span>
        )}
      </div>

      <div className="mt-slider-track">
        {SLIDER_STEPS.map((step, idx) => {
          const isDone = idx < displayIdx;
          const isCurrent = idx === displayIdx;
          const isNext = step.id === nextStatusId;
          const isClickable = isNext && !isTerminal;

          return (
            <React.Fragment key={step.id}>
              <div
                className={[
                  "mt-slider-step",
                  isDone ? "done" : "",
                  isCurrent ? "current" : "",
                  isClickable ? "clickable" : "",
                  currentStatusId === STATUS.A_MODIFIER && isCurrent ? "error" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => isClickable && handleStepClick(step.id)}
                title={isClickable ? `Passer à "${step.label}"` : ""}
              >
                <div className="mt-slider-circle">
                  {isDone ? <FaCheckCircle size={14} /> : <span>{idx + 1}</span>}
                </div>
                <span className="mt-slider-step-label">{step.short}</span>
                {isClickable && (
                  <span className="mt-slider-hint">
                    <FaArrowRight size={9} /> Cliquer pour avancer
                  </span>
                )}
              </div>
              {idx < SLIDER_STEPS.length - 1 && (
                <div className={`mt-slider-line${idx < displayIdx ? " done" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {pendingStatusId && (
        <div className="mt-status-comment-box">
          <div className="mt-scb-header">
            <FaArrowRight size={12} />
            <span>
              Passage vers <strong>{SLIDER_STEPS.find(s => s.id === pendingStatusId)?.label}</strong>
            </span>
          </div>
          {error && <div className="mt-scb-error">{error}</div>}
          <textarea
            className="mt-scb-textarea"
            placeholder="Commentaire (optionnel)…"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="mt-scb-footer">
            <button className="mt-btn mt-btn--ghost mt-btn--sm" onClick={handleCancel} disabled={saving}>
              Annuler
            </button>
            <button className="mt-btn mt-btn--primary mt-btn--sm" onClick={handleConfirm} disabled={saving}>
              {saving ? <FaSpinner className="mt-spin" /> : <FaCheckCircle size={12} />}
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════
   FILE MODAL
═══════════════════════════════════════ */
const EMPTY_FILE = (leadTaskUserId: number): TaskFile => ({
  commentaire: "", driveFile: { name: "", link: "", description: "" }, leadTaskUserId,
});

interface FileModalProps {
  mode: "create" | "edit";
  initial: TaskFile;
  onSave: (file: TaskFile) => Promise<void>;
  onClose: () => void;
}

const FileModal: React.FC<FileModalProps> = ({ mode, initial, onSave, onClose }) => {
  const [form, setForm] = useState<TaskFile>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDrive = (field: keyof DriveFile, value: string) =>
    setForm((f) => ({ ...f, driveFile: { ...f.driveFile, [field]: value } }));

  const handleSave = async () => {
    if (!form.driveFile.name.trim()) { setError("Le nom du fichier est requis."); return; }
    if (!form.driveFile.link.trim()) { setError("Le lien est requis."); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { setError("Une erreur est survenue."); }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-modal-overlay" onClick={onClose}>
      <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mt-modal-header">
          <h5>{mode === "create" ? "Ajouter un fichier" : "Modifier le fichier"}</h5>
          <button className="mt-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="mt-modal-body">
          {error && <div className="mt-modal-error">{error}</div>}
          <div className="mt-field">
            <label>Nom <span className="mt-required">*</span></label>
            <input type="text" placeholder="document.pdf" value={form.driveFile.name}
              onChange={(e) => setDrive("name", e.target.value)} />
          </div>
          <div className="mt-field">
            <label>Lien Drive <span className="mt-required">*</span></label>
            <input type="url" placeholder="https://drive.google.com/..." value={form.driveFile.link}
              onChange={(e) => setDrive("link", e.target.value)} />
          </div>
          <div className="mt-field">
            <label>Description</label>
            <input type="text" placeholder="Description" value={form.driveFile.description}
              onChange={(e) => setDrive("description", e.target.value)} />
          </div>
          <div className="mt-field">
            <label>Commentaire</label>
            <textarea placeholder="Commentaire…" value={form.commentaire} rows={3}
              onChange={(e) => setForm((f) => ({ ...f, commentaire: e.target.value }))} />
          </div>
        </div>
        <div className="mt-modal-footer">
          <button className="mt-btn mt-btn--ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button className="mt-btn mt-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <FaSpinner className="mt-spin" /> : <FaSave size={13} />}
            {mode === "create" ? "Ajouter" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   DELETE MODAL
═══════════════════════════════════════ */
const DeleteModal: React.FC<{
  fileName: string; onConfirm: () => Promise<void>; onClose: () => void;
}> = ({ fileName, onConfirm, onClose }) => {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); } finally { setLoading(false); }
  };
  return (
    <div className="mt-modal-overlay" onClick={onClose}>
      <div className="mt-modal mt-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="mt-modal-header">
          <h5>Supprimer le fichier</h5>
          <button className="mt-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="mt-modal-body">
          <p className="mt-delete-msg">Voulez-vous supprimer <strong>{fileName}</strong> ? Cette action est irréversible.</p>
        </div>
        <div className="mt-modal-footer">
          <button className="mt-btn mt-btn--ghost" onClick={onClose} disabled={loading}>Annuler</button>
          <button className="mt-btn mt-btn--danger" onClick={handleConfirm} disabled={loading}>
            {loading ? <FaSpinner className="mt-spin" /> : <FaTrash size={12} />} Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   FILES SECTION
═══════════════════════════════════════ */
const FilesSection: React.FC<{
  files: TaskFile[]; leadTaskUserId: number;
  fileService: ILeadTaskFileService; onFilesChange: (files: TaskFile[]) => void;
}> = ({ files, leadTaskUserId, fileService, onFilesChange }) => {
  const [modal, setModal] = useState<
    { type: "create" } | { type: "edit"; file: TaskFile } | { type: "delete"; file: TaskFile } | null
  >(null);

  const handleCreate = async (data: TaskFile) => {
    const created = await fileService.create(data);
    onFilesChange([...files, created]);
  };
  const handleUpdate = async (data: TaskFile) => {
    const updated = await fileService.update(data.id!, data);
    onFilesChange(files.map((f) => (f.id === updated.id ? updated : f)));
  };
  const handleDelete = async (file: TaskFile) => {
    await fileService.delete(file.id!);
    onFilesChange(files.filter((f) => f.id !== file.id));
  };

  return (
    <div className="mt-section">
      <div className="mt-section-title">
        <FaFileAlt size={11} /> Fichiers de la tâche
        <span className="mt-section-count">{files.length}</span>
        <button className="mt-add-file-btn" onClick={() => setModal({ type: "create" })}>
          <FaPlus size={10} /> Ajouter
        </button>
      </div>
      {files.length === 0 && (
        <div className="mt-files-empty">
          Aucun fichier. <button className="mt-link-btn" onClick={() => setModal({ type: "create" })}>Ajouter</button>
        </div>
      )}
      {files.length > 0 && (
        <div className="mt-files">
          {files.map((f) => (
            <div key={f.id} className="mt-file-item">
              <FaFileAlt size={14} className="mt-file-icon" />
              <div className="mt-file-info">
                <a href={f.driveFile.link} target="_blank" rel="noreferrer" className="mt-file-name">
                  {f.driveFile.name} <FaExternalLinkAlt size={9} />
                </a>
                {f.commentaire && <span className="mt-file-comment">{f.commentaire}</span>}
              </div>
              <div className="mt-file-actions">
                <button className="mt-file-action-btn edit" onClick={() => setModal({ type: "edit", file: f })}><FaEdit size={12} /></button>
                <button className="mt-file-action-btn delete" onClick={() => setModal({ type: "delete", file: f })}><FaTrash size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal?.type === "create" && <FileModal mode="create" initial={EMPTY_FILE(leadTaskUserId)} onSave={handleCreate} onClose={() => setModal(null)} />}
      {modal?.type === "edit" && <FileModal mode="edit" initial={modal.file} onSave={handleUpdate} onClose={() => setModal(null)} />}
      {modal?.type === "delete" && <DeleteModal fileName={modal.file.driveFile.name} onConfirm={() => handleDelete(modal.file)} onClose={() => setModal(null)} />}
    </div>
  );
};

/* ═══════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════ */
const StatusBadge: React.FC<{ statusId: number; label: string }> = ({ statusId, label }) => {
  const c = statusColor(statusId);
  return <span className="mt-badge" style={{ color: c, background: c + "18", border: `1px solid ${c}33` }}>{label}</span>;
};

/* ═══════════════════════════════════════
   EXPANDED DETAILS
═══════════════════════════════════════ */
interface ExpandedDetailsProps {
  details: LeadTaskUserDetails;
  fileService: ILeadTaskFileService;
  statusService: ILeadTaskUserStatusService;
  onStatusChanged: (newStatusId: number, newStatusLabel: string) => void;
}

const ExpandedDetails: React.FC<ExpandedDetailsProps> = ({ details, fileService, statusService, onStatusChanged }) => {
  const lead = details.leadDetails;
  const [files, setFiles] = useState<TaskFile[]>(details.leadTaskFiles ?? []);
  const [currentStatusId, setCurrentStatusId] = useState(details.leadTaskUserStatus.leadTaskStatus.leadTaskStatusId);
  const [currentStatusLabel, setCurrentStatusLabel] = useState(details.leadTaskUserStatus.leadTaskStatus.leadTaskStatusLabel);

  const handleStatusChanged = (newStatusId: number, newStatusLabel: string) => {
    // Mise à jour immédiate dans les détails affichés
    setCurrentStatusId(newStatusId);
    setCurrentStatusLabel(newStatusLabel);
    // Propagation vers la carte parente pour sync dans la liste
    onStatusChanged(newStatusId, newStatusLabel);
  };

  return (
    <div className="mt-expanded">

      {/* Status slider */}
      <div className="mt-section">
        <div className="mt-section-title"><FaHourglassHalf size={11} /> Statut de la tâche</div>
        <StatusSlider
          currentStatusId={currentStatusId}
          leadTaskUserId={details.leadTaskUserId}
          statusService={statusService}
          onStatusChanged={handleStatusChanged}
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

      {/* Files */}
      <FilesSection files={files} leadTaskUserId={details.leadTaskUserId} fileService={fileService} onFilesChange={setFiles} />

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

      {/* Validations */}
      {details.leadTaskValidations && details.leadTaskValidations.length > 0 && (
        <div className="mt-section">
          <div className="mt-section-title"><FaCheckCircle size={11} /> Validations</div>
          <div className="mt-validations">
            {details.leadTaskValidations.map((v) => (
              <div key={v.id} className={`mt-val-item ${v.decision === 1 ? "go" : "nogo"}`}>
                <div className="mt-val-decision">
                  {v.decision === 1 ? <FaCheckCircle className="go-icon" /> : <FaTimesCircle className="nogo-icon" />}
                  <strong>{v.decision === 1 ? "OK" : "KO"}</strong>
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
   TASK CARD
═══════════════════════════════════════ */
const TacheCard: React.FC<{
  tache: LeadTaskUserSummary;
  taskService: ILeadTaskUserService;
  fileService: ILeadTaskFileService;
  statusService: ILeadTaskUserStatusService;
}> = ({ tache, taskService, fileService, statusService }) => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<LeadTaskUserDetails | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  // Statut local de la carte (mis à jour immédiatement sans refetch de la liste)
  const [localStatus, setLocalStatus] = useState<LeadTaskStatus>(
    tache.leadTaskUserStatus.leadTaskStatus
  );

  const loadDetails = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const d = await taskService.getById(tache.leadTaskUserId);
      setDetails(d);
      // Sync le statut local avec les données fraîches
      setLocalStatus(d.leadTaskUserStatus.leadTaskStatus);
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

  // Appelé par ExpandedDetails quand le statut change via le slider
  const handleStatusChanged = useCallback((newStatusId: number, newStatusLabel: string) => {
    // Mise à jour immédiate du badge dans la liste (sans refetch)
    setLocalStatus({ leadTaskStatusId: newStatusId, leadTaskStatusLabel: newStatusLabel });
  }, []);

  const overdue = isOverdue(tache.leadTaskUserDeadline);
  const soon = isSoon(tache.leadTaskUserDeadline);

  return (
    <div className={["mt-card", open ? "mt-card--open" : "", overdue ? "mt-card--overdue" : "", soon && !overdue ? "mt-card--soon" : ""].filter(Boolean).join(" ")}>
      <div className="mt-card-header" onClick={handleToggle} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleToggle()}>
        <div className="mt-card-main">
          <div className="mt-card-toprow">
            <span className="mt-card-name">{tache.leadTask.leadTaskName}</span>
            {/* Badge utilise localStatus pour refléter les changements immédiats */}
            <StatusBadge
              statusId={localStatus.leadTaskStatusId}
              label={localStatus.leadTaskStatusLabel}
            />
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
        <ExpandedDetails
          details={details}
          fileService={fileService}
          statusService={statusService}
          onStatusChanged={handleStatusChanged}
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
  fileService: ILeadTaskFileService;
  statusService: ILeadTaskUserStatusService;
  currentUserName?: string;
}

const MesTaches: React.FC<Props> = ({ taskService, fileService, statusService, currentUserName = "Utilisateur" }) => {
  const [taches, setTaches] = useState<LeadTaskUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await taskService.getAll();
      setTaches(data);
    } catch (e) {
      setError("Impossible de charger les tâches.");
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
        if (!cancelled) setError("Impossible de charger les tâches.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [taskService]);

  const counts = {
    total: taches.length,
    enAttente: taches.filter((t) => [1, 2].includes(t.leadTaskUserStatus.leadTaskStatus.leadTaskStatusId)).length,
    attribue: taches.filter((t) => t.leadTaskUserStatus.leadTaskStatus.leadTaskStatusId === 3).length,
    enCours: taches.filter((t) => t.leadTaskUserStatus.leadTaskStatus.leadTaskStatusId === 4).length,
  };

  return (
    <div className="mes-taches-wrapper">
      <div className="mt-header">
        <div>
          <h4 className="mt-title">Mes Tâches</h4>
          <p className="mt-subtitle">
            Bonjour <strong>{currentUserName}</strong> —{" "}
            {loading ? "chargement…" : `${counts.total} tâche${counts.total !== 1 ? "s" : ""} assignée${counts.total !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {!loading && !error && (
        <div className="mt-stats">
          <div className="mt-stat-pill"><FaClock className="sp-icon sp-wait" /><div><span className="sp-num">{counts.enAttente}</span><span className="sp-lbl">En attente</span></div></div>
          <div className="mt-stat-pill"><FaHourglassHalf className="sp-icon sp-assigned" /><div><span className="sp-num">{counts.attribue}</span><span className="sp-lbl">Attribuées</span></div></div>
          <div className="mt-stat-pill"><FaCheckCircle className="sp-icon sp-progress" /><div><span className="sp-num">{counts.enCours}</span><span className="sp-lbl">En cours</span></div></div>
        </div>
      )}

      {loading && <div className="mt-state-box"><FaSpinner className="mt-spin mt-spin--lg" /><p>Chargement des tâches…</p></div>}
      {!loading && error && <div className="mt-state-box mt-state-box--error"><FaTimesCircle size={30} /><p>{error}</p></div>}
      {!loading && !error && taches.length === 0 && (
        <div className="mt-state-box mt-state-box--empty">
          <FaInbox size={36} className="mt-empty-icon" />
          <p>Aucune tâche pour le moment</p><span>Profitez de votre temps libre !</span>
        </div>
      )}

      {!loading && !error && taches.length > 0 && (
        <div className="mt-list">
          {taches.map((t) => (
            <TacheCard key={t.leadTaskUserId} tache={t} taskService={taskService} fileService={fileService} statusService={statusService} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MesTaches;