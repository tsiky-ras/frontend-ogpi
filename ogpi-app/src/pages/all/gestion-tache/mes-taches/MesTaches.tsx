import React, { useState, useEffect, useCallback } from "react";
import {
  FaClock,
  FaHourglassHalf,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaFileAlt,
  FaFolder,
  FaUser,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaTimesCircle,
  FaTag,
  FaSpinner,
  FaInbox,
} from "react-icons/fa";
import "./MesTaches.css";

/* ─────────────── Types ─────────────── */
interface LeadTaskStatus {
  leadTaskStatusId: number;
  leadTaskStatusLabel: string;
}

interface LeadTaskUserSummary {
  leadTaskUserId: number;
  dateAffectation: string;
  leadTaskUserDeadline: string | null;
  leadTask: {
    leadTaskId: number;
    leadTaskName: string;
    leadTaskDesc: string;
  };
  leadId: number;
  leadTaskUserStatus: {
    leadTaskStatus: LeadTaskStatus;
  };
  leadDetails: {
    leadName: string;
    leadRef: string;
  };
}

interface LeadTaskUserDetails extends LeadTaskUserSummary {
  leadTaskUserStatusList: Array<{
    leadTaskUserStatusId: number;
    leadTaskUserStatusDate: string;
    leadTaskUserStatusCommentaire: string;
    leadTaskStatus: LeadTaskStatus;
  }> | null;
  leadTaskValidations: Array<{
    id: number;
    validationTime: string;
    decision: number;
    user: { id: number; username: string; email: string };
    role: { roleId: number; roleLabel: string };
  }> | null;
  leadTaskFiles: Array<{
    id: number;
    commentaire: string;
    driveFile: { id: number; name: string; link: string; description: string };
  }> | null;
  leadDetails: {
    leadName: string;
    leadRef: string;
    leadInternalDeadLine: string | null;
    leadRealDeadLine: string | null;
    client: { id: number; name: string; email: string; phone: string } | null;
    mainDriveFile: { id: number; name: string; link: string; description: string } | null;
    driveFolder: { id: number; name: string; link: string } | null;
  };
}

// Interface minimale pour le service — évite l'import direct
interface ILeadTaskUserService {
  getAll(): Promise<LeadTaskUserSummary[]>;
  getById(id: number): Promise<LeadTaskUserDetails>;
}

/* ─────────────── Helpers ─────────────── */
const fmt = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const STATUS_COLORS: Record<number, string> = {
  1: "#94a3b8",
  2: "#f59e0b",
  3: "#3b82f6",
  4: "#8b5cf6",
  5: "#10b981",
};
const statusColor = (id: number) => STATUS_COLORS[id] ?? "#64748b";
const isOverdue = (d: string | null) => !!d && new Date(d).getTime() < Date.now();
const isSoon = (d: string | null) => {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 2 * 3600 * 1000;
};

/* ─────────────── Status Badge ─────────────── */
const StatusBadge: React.FC<{ statusId: number; label: string }> = ({ statusId, label }) => {
  const c = statusColor(statusId);
  return (
    <span className="mt-badge" style={{ color: c, background: c + "18", border: `1px solid ${c}33` }}>
      {label}
    </span>
  );
};

/* ─────────────── Expanded Details ─────────────── */
const ExpandedDetails: React.FC<{ details: LeadTaskUserDetails }> = ({ details }) => {
  const lead = details.leadDetails;

  return (
    <div className="mt-expanded">

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
              <FaFileAlt size={12} />
              <span>{lead.mainDriveFile.name}</span>
              <FaExternalLinkAlt size={9} />
            </a>
          )}
          {lead.driveFolder && (
            <a href={lead.driveFolder.link} target="_blank" rel="noreferrer" className="mt-drive-link mt-drive-link--folder">
              <FaFolder size={12} />
              <span>{lead.driveFolder.name}</span>
              <FaExternalLinkAlt size={9} />
            </a>
          )}
        </div>
      </div>

      {/* Task files */}
      {details.leadTaskFiles && details.leadTaskFiles.length > 0 && (
        <div className="mt-section">
          <div className="mt-section-title">
            <FaFileAlt size={11} /> Fichiers de la tâche
            <span className="mt-section-count">{details.leadTaskFiles.length}</span>
          </div>
          <div className="mt-files">
            {details.leadTaskFiles.map((f) => (
              <a key={f.id} href={f.driveFile.link} target="_blank" rel="noreferrer" className="mt-file-item">
                <FaFileAlt size={14} className="mt-file-icon" />
                <div className="mt-file-info">
                  <span className="mt-file-name">{f.driveFile.name}</span>
                  {f.commentaire && <span className="mt-file-comment">{f.commentaire}</span>}
                </div>
                <FaExternalLinkAlt size={10} className="mt-file-ext" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Status history */}
      {details.leadTaskUserStatusList && details.leadTaskUserStatusList.length > 0 && (
        <div className="mt-section">
          <div className="mt-section-title"><FaHourglassHalf size={11} /> Historique des statuts</div>
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

/* ─────────────── Task Card ─────────────── */
const TacheCard: React.FC<{
  tache: LeadTaskUserSummary;
  service: ILeadTaskUserService;
}> = ({ tache, service }) => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<LeadTaskUserDetails | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleToggle = useCallback(async () => {
    if (!open && !details) {
      setLoadingDetail(true);
      try {
        const d = await service.getById(tache.leadTaskUserId);
        setDetails(d);
      } catch (e) {
        console.error("Erreur chargement détails tâche:", e);
      } finally {
        setLoadingDetail(false);
      }
    }
    setOpen((v) => !v);
  }, [open, details, tache.leadTaskUserId, service]);

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
              <FaTag size={9} />
              {tache.leadDetails.leadRef} · {tache.leadDetails.leadName}
            </span>
            <span className="mt-meta-chip">
              <FaCalendarAlt size={9} />
              Affecté le {fmtDate(tache.dateAffectation)}
            </span>
            {tache.leadTaskUserDeadline && (
              <span className={`mt-meta-chip mt-meta-deadline${overdue ? " overdue" : soon ? " soon" : ""}`}>
                <FaClock size={9} />
                Deadline : {fmt(tache.leadTaskUserDeadline)}
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

      {open && !loadingDetail && details && <ExpandedDetails details={details} />}
      {open && loadingDetail && (
        <div className="mt-detail-loading">
          <FaSpinner className="mt-spin" /> Chargement des détails…
        </div>
      )}
    </div>
  );
};

/* ─────────────── Main Component ─────────────── */
interface Props {
  service: ILeadTaskUserService;
  currentUserName?: string;
}

const MesTaches: React.FC<Props> = ({ service, currentUserName = "Utilisateur" }) => {
  const [taches, setTaches] = useState<LeadTaskUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await service.getAll();
        if (!cancelled) setTaches(data);
      } catch (e) {
        if (!cancelled) setError("Impossible de charger les tâches. Vérifiez votre connexion.");
        console.error("MesTaches fetch error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [service]);

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
            {loading
              ? "chargement…"
              : `${counts.total} tâche${counts.total !== 1 ? "s" : ""} assignée${counts.total !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {!loading && !error && (
        <div className="mt-stats">
          <div className="mt-stat-pill">
            <FaClock className="sp-icon sp-wait" />
            <div><span className="sp-num">{counts.enAttente}</span><span className="sp-lbl">En attente</span></div>
          </div>
          <div className="mt-stat-pill">
            <FaHourglassHalf className="sp-icon sp-assigned" />
            <div><span className="sp-num">{counts.attribue}</span><span className="sp-lbl">Attribuées</span></div>
          </div>
          <div className="mt-stat-pill">
            <FaCheckCircle className="sp-icon sp-progress" />
            <div><span className="sp-num">{counts.enCours}</span><span className="sp-lbl">En cours</span></div>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-state-box">
          <FaSpinner className="mt-spin mt-spin--lg" />
          <p>Chargement des tâches…</p>
        </div>
      )}

      {!loading && error && (
        <div className="mt-state-box mt-state-box--error">
          <FaTimesCircle size={30} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && taches.length === 0 && (
        <div className="mt-state-box mt-state-box--empty">
          <FaInbox size={36} className="mt-empty-icon" />
          <p>Aucune tâche pour le moment</p>
          <span>Profitez de votre temps libre !</span>
        </div>
      )}

      {!loading && !error && taches.length > 0 && (
        <div className="mt-list">
          {taches.map((t) => (
            <TacheCard key={t.leadTaskUserId} tache={t} service={service} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MesTaches;