import React, { useEffect, useMemo, useState } from "react";
import { FaTrophy, FaTimesCircle, FaChevronDown, FaChevronUp } from "react-icons/fa";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";

/* ================= POPUP COMPONENT ================= */
interface EvaluationPopupProps {
  type: "won" | "lost";
  onClose: () => void;
}

const EvaluationPopup: React.FC<EvaluationPopupProps> = ({ type, onClose }) => {
  const isWon = type === "won";
  const headerColor = isWon ? "#198754" : "#C93C29";
  const headerIcon = isWon ? <FaTrophy /> : <FaTimesCircle />;
  const title = isWon ? "Lead gagné !" : "Lead perdu";
  const message = isWon
    ? "Le lead a été changé en gagné. Vous pouvez créer un projet à partir de celui-ci et ses informations sont consultables dans l'archive."
    : "Le lead a été changé en perdu. Il sera consultable dans l'archive des leads.";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "440px",
          maxWidth: "90vw",
          overflow: "hidden",
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            backgroundColor: headerColor,
            color: "#fff",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "1.4rem" }}>{headerIcon}</span>
          <h5 style={{ margin: 0, fontWeight: 600 }}>{title}</h5>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <p>{message}</p>
        </div>
        <div style={{ padding: "12px 24px 20px", textAlign: "right" }}>
          <button className="btn btn-primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= LEAD CARD COMPONENT ================= */
interface LeadCardProps {
  lead: any;
  onWin: (leadId: number) => void;
  onLose: (leadId: number) => void;
  loadingAction: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onWin, onLose, loadingAction }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  return (
    <div
      className="card shadow-sm"
      style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e0e0e0" }}
    >
      {/* Header — always visible */}
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{ background: "#f8f9fa", cursor: "pointer", padding: "12px 16px" }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span className="fw-semibold text-dark" style={{ fontSize: "1rem" }}>
            {lead.leadName}
          </span>
          {lead.leadRef && (
            <span className="badge bg-secondary" style={{ fontWeight: 400 }}>
              {lead.leadRef}
            </span>
          )}
          {lead.client && (
            <span className="text-muted" style={{ fontSize: "0.88rem" }}>
              {lead.client.name}
            </span>
          )}
          {lead.businessUnit && (
            <span className="badge bg-light text-dark border" style={{ fontWeight: 400 }}>
              {lead.businessUnit.name}
            </span>
          )}
        </div>
        <span className="text-muted" style={{ fontSize: "1.1rem" }}>
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="card-body" style={{ padding: "16px 20px" }}>
          <div className="row g-3 mb-3">
            {/* Infos générales */}
            <div className="col-md-6">
              <h6
                className="text-uppercase text-muted mb-2"
                style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}
              >
                Informations générales
              </h6>
              <table className="table table-sm table-borderless mb-0" style={{ fontSize: "0.88rem" }}>
                <tbody>
                  <tr>
                    <td className="text-muted pe-3" style={{ whiteSpace: "nowrap" }}>Type</td>
                    <td>{lead.leadType?.label || "—"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pe-3">Catégorie</td>
                    <td>{lead.category?.label || "—"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pe-3">Secteur</td>
                    <td>{lead.leadSecteur?.label || "—"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pe-3">Période</td>
                    <td>{lead.leadPeriode ? formatDate(lead.leadPeriode) : "—"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pe-3">Échéance réelle</td>
                    <td>{formatDate(lead.leadRealDeadLine)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted pe-3">Échéance interne</td>
                    <td>{formatDate(lead.leadInternalDeadLine)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Client & partenaires */}
            <div className="col-md-6">
              <h6
                className="text-uppercase text-muted mb-2"
                style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}
              >
                Client & Partenaires
              </h6>
              {lead.client && (
                <div className="mb-2" style={{ fontSize: "0.88rem" }}>
                  <div className="fw-semibold">{lead.client.name}</div>
                  <div className="text-muted">{lead.client.email}</div>
                  <div className="text-muted">{lead.client.phone}</div>
                </div>
              )}
              {lead.leadPartenaires && lead.leadPartenaires.length > 0 && (
                <>
                  <div className="text-muted mb-1" style={{ fontSize: "0.8rem" }}>
                    Partenaires :
                  </div>
                  {lead.leadPartenaires.map((lp: any) => (
                    <div key={lp.id} className="mb-1" style={{ fontSize: "0.85rem" }}>
                      <span className="fw-semibold">{lp.partenaire.name}</span>
                      <span className="text-muted ms-2">{lp.partenaire.email}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Description & commentaire */}
            {(lead.leadDescription || lead.leadCommentaire) && (
              <div className="col-12">
                {lead.leadDescription && (
                  <div className="mb-2">
                    <span className="text-muted" style={{ fontSize: "0.8rem" }}>Description : </span>
                    <span style={{ fontSize: "0.88rem" }}>{lead.leadDescription}</span>
                  </div>
                )}
                {lead.leadCommentaire && (
                  <div>
                    <span className="text-muted" style={{ fontSize: "0.8rem" }}>Commentaire : </span>
                    <span style={{ fontSize: "0.88rem" }}>{lead.leadCommentaire}</span>
                  </div>
                )}
              </div>
            )}

            {/* Drive */}
            {(lead.mainDriveFile || lead.driveFolder) && (
              <div className="col-12 d-flex gap-3 flex-wrap">
                {lead.driveFolder?.link && (
                  <a
                    href={lead.driveFolder.link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-secondary"
                  >
                    📁 Dossier Drive
                  </a>
                )}
                {lead.mainDriveFile?.link && (
                  <a
                    href={lead.mainDriveFile.link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline-secondary"
                  >
                    📄 {lead.mainDriveFile.name}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="d-flex gap-2 justify-content-end border-top pt-3 mt-1">
            <button
              className="btn btn-danger"
              disabled={loadingAction}
              onClick={() => onLose(lead.leadId)}
            >
              <FaTimesCircle className="me-2" />
              Perdu
            </button>
            <button
              className="btn btn-success"
              disabled={loadingAction}
              onClick={() => onWin(lead.leadId)}
            >
              <FaTrophy className="me-2" />
              Gagné
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= MAIN COMPONENT ================= */
interface EvaluationLeadPageProps {
  onUpdated?: () => void;
}

const EvaluationLeadPage: React.FC<EvaluationLeadPageProps> = ({ onUpdated }) => {
  const { api } = useAuth();
  const leadService = new LeadService(api);

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  const [popup, setPopup] = useState<{ visible: boolean; type: "won" | "lost" }>({
    visible: false,
    type: "won",
  });

  /* ================= LOAD ================= */
  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await leadService.getEvaluating();
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erreur chargement leads en évaluation", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  /* ================= ACTIONS ================= */
  const handleWin = async (leadId: number) => {
    setLoadingAction(true);
    try {
      await leadService.winLead(leadId);
      await loadLeads();
      try { onUpdated && onUpdated(); } catch (_) {}
      setPopup({ visible: true, type: "won" });
    } catch (e) {
      console.error("Erreur win lead", e);
      alert("Erreur lors du passage en gagné");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLose = async (leadId: number) => {
    setLoadingAction(true);
    try {
      await leadService.loseLead(leadId);
      await loadLeads();
      try { onUpdated && onUpdated(); } catch (_) {}
      setPopup({ visible: true, type: "lost" });
    } catch (e) {
      console.error("Erreur lose lead", e);
      alert("Erreur lors du passage en perdu");
    } finally {
      setLoadingAction(false);
    }
  };

  /* ================= FILTER ================= */
  const filteredLeads = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return leads;
    return leads.filter(
      (l: any) =>
        l.leadName?.toLowerCase().includes(value) ||
        l.leadRef?.toLowerCase().includes(value) ||
        l.client?.name?.toLowerCase().includes(value)
    );
  }, [search, leads]);

  /* ================= RENDER ================= */
  return (
    <div className="evaluation-lead-container">
      {popup.visible && (
        <EvaluationPopup
          type={popup.type}
          onClose={() => setPopup((prev) => ({ ...prev, visible: false }))}
        />
      )}

      <div className="mb-3 d-flex align-items-center gap-2">
        <span className="fw-semibold text-secondary" style={{ fontSize: "0.92rem" }}>
          Leads en cours d'évaluation
        </span>
        <span className="badge bg-secondary">{leads.length}</span>
      </div>

      <FilterBar
        filters={[
          {
            type: "text",
            placeholder: "Rechercher un lead...",
            onChange: setSearch,
          },
        ]}
      />

      {loading && <p className="mt-3">Chargement...</p>}
      {!loading && filteredLeads.length === 0 && (
        <p className="mt-3 text-muted">Aucun lead en cours d'évaluation.</p>
      )}

      {!loading &&
        filteredLeads.map((lead) => (
          <div key={lead.leadId} className="mb-3">
            <LeadCard
              lead={lead}
              onWin={handleWin}
              onLose={handleLose}
              loadingAction={loadingAction}
            />
          </div>
        ))}
    </div>
  );
};

export default EvaluationLeadPage;