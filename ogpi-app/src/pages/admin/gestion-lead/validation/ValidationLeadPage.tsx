import React, { useEffect, useMemo, useState } from "react";
import { apiError } from "../../../../utils/apiError.ts";
import { FaTimesCircle, FaCheckCircle, FaHourglassHalf } from "react-icons/fa";
import ValidationFormPage from "./ValidationFormPage.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { LeadStatus } from "../../../../types/lead/LeadStatus.tsx";
import { LeadStatusService } from "../../../../services/lead/LeadStatusService.tsx";
import { ValidationService } from "../../../../services/lead/ValidationService.tsx";
import { CreateValidationRequest } from "../../../../types/lead/Validation.tsx";
import { Lead } from "../../../../types/lead/Lead.tsx";

/* ================= POPUP COMPONENT ================= */
interface ValidationPopupProps {
  type: "validated" | "pending" | "rejected";
  nextRole?: string | null;
  onClose: () => void;
}

const ValidationPopup: React.FC<ValidationPopupProps> = ({ type, nextRole, onClose }) => {
  const isRejected = type === "rejected";
  const isValidated = type === "validated";

  const headerColor = isRejected ? "#C93C29" : isValidated ? "#198754" : "#EABF5B";
  const headerIcon = isRejected ? <FaTimesCircle /> : isValidated ? <FaCheckCircle /> : <FaHourglassHalf />;

  const title = isRejected
    ? "Lead rejeté (No Go)"
    : isValidated
    ? "Lead validé !"
    : "Validation en cours";

  const message = isRejected ? (
    <>
      <p>Le lead est passé au statut <strong>No Go</strong>.</p>
      <p>La validation est bloquée à votre niveau.</p>
      <p className="text-muted" style={{ fontSize: "0.9rem" }}>
        Cliquez sur le bouton <strong>Archiver</strong> si vous souhaitez archiver le lead.
      </p>
    </>
  ) : isValidated ? (
    <p>Le lead est désormais <strong>validé</strong> et prêt pour la suite du processus.</p>
  ) : (
    <>
      <p>Votre validation a bien été enregistrée.</p>
      <p>
        Le lead est en attente de la validation du prochain validateur :{" "}
        <strong>{nextRole}</strong>.
      </p>
    </>
  );

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
        {/* Header */}
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

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>{message}</div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 20px", textAlign: "right" }}>
          <button
            className="btn btn-primary"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= MAIN COMPONENT ================= */
interface ValidationLeadPageProps {
  onUpdated?: () => void;
}

const ValidationLeadPage: React.FC<ValidationLeadPageProps> = ({ onUpdated }) => {
  const { api, user } = useAuth();

  const leadService = new LeadService(api);
  const leadStatusService = new LeadStatusService(api);
  const validationService = new ValidationService(api);

  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "go" | "nogo">("all");
  const [loadingLeadDetails, setLoadingLeadDetails] = useState<Set<number>>(new Set());
  const [leadDetails, setLeadDetails] = useState<Map<number, Lead>>(new Map());

  // Popup state
  const [actionError, setActionError] = useState<string | null>(null);
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: "validated" | "pending" | "rejected";
    nextRole?: string | null;
  }>({ visible: false, type: "validated", nextRole: null });

  /* ================= LOAD DATA ================= */
  const loadLeadsToValidate = async () => {
    setLoading(true);
    try {
      const data = await leadService.getToValidate();
      setLeads(data);
    } catch (e) {
      console.error("Erreur chargement leads", e);
    } finally {
      setLoading(false);
    }
  };

  const loadLeadStatuses = async () => {
    try {
      const data = await leadStatusService.getAll();
      setLeadStatuses(data);
    } catch (e) {
      console.error("Erreur chargement lead status", e);
    }
  };

  const loadLeadDetails = async (leadId: number) => {
    if (leadDetails.has(leadId)) return;

    setLoadingLeadDetails(prev => new Set(prev).add(leadId));
    try {
      const fullLead = await leadService.getValidationById(leadId);
      setLeadDetails(prev => new Map(prev).set(leadId, fullLead));
    } catch (e) {
      console.error("Erreur chargement détails lead", e);
    } finally {
      setLoadingLeadDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const handleToggleExpand = (leadId: number, isExpanded: boolean) => {
    if (isExpanded) loadLeadDetails(leadId);
  };

  /* ================= VALIDATE / REJECT ================= */
  const handleValidate = async (leadId: number, comment: string) => {
    if (!user) {
      setActionError("Impossible de valider : session expirée. Veuillez vous reconnecter.");
      return;
    }

    try {
      const request: CreateValidationRequest = {
        leadId,
        decision: 1,
        commentaire: comment,
      };

      await validationService.create(request);
      await loadLeadsToValidate();
      // notify parent to refresh counts immediately
      try { onUpdated && onUpdated(); } catch (e) { /* ignore */ }

      // Check validation status → show appropriate popup
      const result = await validationService.isLeadValidated(leadId);

      if (result.validated) {
        setPopup({ visible: true, type: "validated", nextRole: null });
      } else {
        setPopup({ visible: true, type: "pending", nextRole: result.nextRole });
      }

      // Refresh lead details
      setLeadDetails(prev => {
        const newMap = new Map(prev);
        newMap.delete(leadId);
        return newMap;
      });
      await loadLeadDetails(leadId);
    } catch (e) {
      console.error("Erreur validation lead", e);
      setActionError(apiError(e, "Impossible de valider le lead"));
    }
  };

  const handleReject = async (leadId: number, comment: string) => {
    if (!user) {
      setActionError("Impossible de rejeter : session expirée. Veuillez vous reconnecter.");
      return;
    }

    try {
      const request: CreateValidationRequest = {
        leadId,
        decision: 0,
        commentaire: comment,
      };

      await validationService.create(request);
      await loadLeadsToValidate();
      // notify parent to refresh counts immediately
      try { onUpdated && onUpdated(); } catch (e) { /* ignore */ }

      // Show rejection popup
      setPopup({ visible: true, type: "rejected", nextRole: null });

      // Refresh lead details
      setLeadDetails(prev => {
        const newMap = new Map(prev);
        newMap.delete(leadId);
        return newMap;
      });
      await loadLeadDetails(leadId);
    } catch (e) {
      console.error("Erreur rejet lead", e);
      setActionError(apiError(e, "Impossible de rejeter le lead"));
    }
  };

  useEffect(() => {
    loadLeadsToValidate();
    loadLeadStatuses();
  }, []);

  /* ================= FILTER ================= */
  const STATUS_FILTER_BY_LABEL: Record<string, "all" | "pending" | "go" | "nogo"> = {
    "En attente de validation": "pending",
    "Go": "go",
    "No Go": "nogo",
  };

  const filterByStatus = (items: any[]) => {
    if (activeFilter === "all") return items;
    const status = leadStatuses.find(
      (s) => STATUS_FILTER_BY_LABEL[s.label] === activeFilter
    );
    if (!status) return items;
    return items.filter((l) => l.currentLeadStatus?.leadStatus?.id === status.id);
  };

  const filteredLeads = useMemo(() => {
    const value = search.toLowerCase().trim();
    let filtered = filterByStatus(leads);
    if (!value) return filtered;
    return filtered.filter(
      (l: any) =>
        l.leadName?.toLowerCase().includes(value) ||
        l.leadRef?.toLowerCase().includes(value) ||
        l.client?.name?.toLowerCase().includes(value)
    );
  }, [search, leads, activeFilter, leadStatuses]);

  const mapLeadData = (lead: any): Lead => {
    const detailedLead = leadDetails.get(lead.leadId);

    const baseData = {
      id: lead.leadId,
      businessUnit: lead.businessUnit,
      name: lead.leadName,
      reference: lead.leadRef || '',
      client: lead.client,
      type: lead.leadType,
      category: lead.category,
      secteur: lead.leadSecteur,
      zone: lead.leadZone,
      description: lead.leadDescription || '',
      internalDeadline: lead.leadInternalDeadLine || '',
      realDeadline: lead.leadRealDeadLine || '',
      driveFolder: lead.driveFolder,
      driveFile: lead.mainDriveFile,
      status: lead.currentLeadStatus?.leadStatus || { id: 0, label: 'En attente', order: 0 },
      currentLeadStatus: lead.currentLeadStatus,
      currentLeadStep: lead.currentLeadStep,
      periode: lead.leadPeriode,
      projetFinancement: lead.projetDeFinancement || '',
      commentaire: lead.leadCommentaire || '',
      jiraProject: lead.leadGoProjetJira || '',
      jiraTicket: lead.leadGoTicketJira || '',
      typeFinancement: lead.typeProjetFinancement,
      createdByUser: lead.createdByUser,
    };

    if (detailedLead) {
      const mappedPartenaires = detailedLead.leadPartenaires?.map((lp: any) => lp.partenaire) || [];
      return {
        ...baseData,
        partenaires: mappedPartenaires,
        validations: detailedLead.validations || [],
      } as Lead;
    }

    return {
      ...baseData,
      partenaires: lead.leadPartenaires?.map((p: any) => p.partenaire) || [],
      validations: lead.validations || [],
    } as Lead;
  };

  /* ================= RENDER ================= */
  return (
    <div className="validation-form-container">
      {/* Popup */}
      {popup.visible && (
        <ValidationPopup
          type={popup.type}
          nextRole={popup.nextRole}
          onClose={() => setPopup(prev => ({ ...prev, visible: false }))}
        />
      )}

      {actionError && (
        <div style={{ padding: '8px 12px', marginBottom: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#C93C29', fontSize: '0.9rem' }}>
          {actionError}
          <button onClick={() => setActionError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#C93C29', cursor: 'pointer', fontWeight: 600 }}>×</button>
        </div>
      )}

      <div className="mb-4 d-flex gap-2 flex-wrap">
        <button
          className={`btn ${activeFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActiveFilter("all")}
        >
          Tous les leads
          <span className="badge bg-light text-dark ms-2">{leads.length}</span>
        </button>

        {leadStatuses.map((status) => {
          const filterKey = STATUS_FILTER_BY_LABEL[status.label];
          if (!filterKey) return null;

          const count = leads.filter((l) => l.currentLeadStatus?.leadStatus?.id === status.id).length;
          const btnClass = filterKey === "pending" ? "warning" : filterKey === "go" ? "success" : "danger";

          return (
            <button
              key={status.id}
              className={`btn ${activeFilter === filterKey ? `btn-${btnClass}` : `btn-outline-${btnClass}`}`}
              onClick={() => setActiveFilter(filterKey)}
            >
              {status.label}
              <span className="badge bg-light text-dark ms-2">{count}</span>
            </button>
          );
        })}
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
      {!loading && filteredLeads.length === 0 && <p className="mt-3">Aucun lead trouvé.</p>}

      {!loading &&
        filteredLeads.map((lead) => {
          const isLoading = loadingLeadDetails.has(lead.leadId);
          return (
            <div key={lead.leadId} className="mb-4">
              <ValidationFormPage
                lead={mapLeadData(lead)}
                onValidate={(comment) => handleValidate(lead.leadId, comment)}
                onReject={(comment) => handleReject(lead.leadId, comment)}
                onToggleExpand={(isExpanded) => handleToggleExpand(lead.leadId, isExpanded)}
                isLoadingDetails={isLoading}
              />
            </div>
          );
        })}
    </div>
  );
};

export default ValidationLeadPage;