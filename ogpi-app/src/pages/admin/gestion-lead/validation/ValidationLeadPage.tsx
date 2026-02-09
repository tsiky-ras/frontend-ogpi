import React, { useEffect, useMemo, useState } from "react";
import ValidationFormPage from "./ValidationFormPage.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { LeadStatus } from "../../../../types/lead/LeadStatus.tsx";
import { LeadStatusService } from "../../../../services/lead/LeadStatusService.tsx";
import { useValidationService } from "../../../../services/lead/ValidationService.tsx";
import { RoleUser } from "../../../../types/user/RoleUser.tsx";
const ValidationLeadPage: React.FC = () => {
  const { api, user } = useAuth();

  const leadService = new LeadService(api);
  const leadStatusService = new LeadStatusService(api);
  const { create: createValidation } = useValidationService();

  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "go" | "nogo">("all");

  /* ================= LOAD DATA ================= */
  const loadLeadsToValidate = async () => {
    setLoading(true);
    try {
      const data = await leadService.getAll();
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

  /* ================= VALIDATE / REJECT ================= */
    console.log(user)
    console.log(user?.userId);
    console.log(user?.role?.roleId)

  const handleValidate = async (leadId: number, comment: string) => {
    if (!user) {
      alert("Impossible de valider : utilisateur non connecté.");
      return;
    }

    if (!user.role || !user.role.roleId) {
      alert("Impossible de valider : votre rôle n'est pas défini correctement.");
      console.error("Rôle de l'utilisateur manquant :", user);
      return;
    }

    try {
      const roleUser: RoleUser = {
        id: 0, 
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          is_active:true,
        },
        role: {
          roleId: user.role.roleId,
          roleLabel: user.role.roleLabel,
        },
      };

      console.log("Validation envoyée :", {
        leadId,
        comment,
        validatedBy: roleUser,
      });

      await createValidation(leadId, {
        decision: 1, 
        comments: comment,
        validatedBy: roleUser,
      });

      await loadLeadsToValidate();
    } catch (e) {
      console.error("Erreur validation lead", e);
    }
  };

    const handleReject = async (leadId: number, comment: string) => {
    if (!user) {
      alert("Impossible de valider : utilisateur non connecté.");
      return;
    }

    if (!user.role || !user.role.roleId) {
      alert("Impossible de valider : votre rôle n'est pas défini correctement.");
      console.error("Rôle de l'utilisateur manquant :", user);
      return;
    }

    try {
      const roleUser: RoleUser = {
        id: 0, 
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          is_active:true
        },
        role: {
          roleId: user.role.roleId,
          roleLabel: user.role.roleLabel,
        },
      };

      console.log("Validation envoyée :", {
        leadId,
        comment,
        validatedBy: roleUser,
      });

      await createValidation(leadId, {
        decision: 0, 
        comments: comment,
        validatedBy: roleUser,
      });

      await loadLeadsToValidate();
    } catch (e) {
      console.error("Erreur validation lead", e);
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

  /* ================= RENDER ================= */
  return (
    <div className="validation-form-container">
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
        filteredLeads.map((lead) => (
          <div key={lead.leadId} className="mb-4">
            <ValidationFormPage
              lead={{
                id: lead.leadId,
                businessUnit: lead.businessUnit,
                name: lead.leadName,
                reference: lead.leadRef,
                client: lead.client,
                type: lead.leadType,
                category: lead.category,
                secteur: lead.leadSecteur,
                zone: lead.leadZone,
                description: lead.leadDescription,
                internalDeadline: lead.leadInternalDeadLine,
                realDeadline: lead.leadRealDeadLine,
                driveFolder: lead.driveFolder,
                driveFile: lead.mainDriveFile,
                partenaires: lead.leadPartenaires?.map((p: any) => p.partenaire) || [],
                status: lead.currentLeadStatus?.leadStatus,
                periode: lead.leadPeriode,
                projetFinancement: lead.typeProjetFinancement,
                commentaire: lead.leadCommentaire,
                jiraProject: lead.leadGoProjetJira,
                jiraTicket: lead.leadGoTicketJira,
                typeFinancement: lead.typeProjetFinancement,
              }}
              onValidate={(comment) => handleValidate(lead.leadId, comment)}
              onReject={(comment) => handleReject(lead.leadId, comment)}
            />
          </div>
        ))}
    </div>
  );
};

export default ValidationLeadPage;
