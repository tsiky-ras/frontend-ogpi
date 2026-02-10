import React, { useEffect, useMemo, useState } from "react";
import ValidationFormPage from "./ValidationFormPage.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { LeadStatus } from "../../../../types/lead/LeadStatus.tsx";
import { LeadStatusService } from "../../../../services/lead/LeadStatusService.tsx";
import { ValidationService } from "../../../../services/lead/ValidationService.tsx";
import { CreateValidationRequest } from "../../../../types/lead/Validation.tsx";
import { Lead } from "../../../../types/lead/Lead.tsx";

const ValidationLeadPage: React.FC = () => {
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

  /**
   * 🔥 Charger les détails complets d'un lead (avec partenaires et validations)
   */
  const loadLeadDetails = async (leadId: number) => {
    if (leadDetails.has(leadId)) {
      // Détails déjà chargés
      return;
    }

    setLoadingLeadDetails(prev => new Set(prev).add(leadId));
    try {
      console.log(`🔍 Chargement des détails pour le lead ${leadId}...`);
      // Appeler l'endpoint qui retourne tous les détails
      const fullLead = await leadService.getValidationById(leadId);
      console.log(`✅ Détails chargés pour le lead ${leadId}:`, fullLead);
      
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

  /**
   * 🔥 Callback appelé quand l'utilisateur déplie un lead
   */
  const handleToggleExpand = (leadId: number, isExpanded: boolean) => {
    if (isExpanded) {
      console.log(`📂 Lead ${leadId} déplié - chargement des détails...`);
      loadLeadDetails(leadId);
    }
  };

  /* ================= VALIDATE / REJECT ================= */
  const handleValidate = async (leadId: number, comment: string) => {
    if (!user) {
      alert("Impossible de valider : utilisateur non connecté.");
      return;
    }

    try {
      const request: CreateValidationRequest = {
        leadId,
        decision: 0, // 0 = Go
        commentaire: comment,
      };

      console.log("Validation envoyée :", request);

      await validationService.create(request);
      
      // Recharger les leads et les détails du lead validé
      await loadLeadsToValidate();
      
      // Forcer le rechargement des détails
      setLeadDetails(prev => {
        const newMap = new Map(prev);
        newMap.delete(leadId);
        return newMap;
      });
      
      // Recharger les détails si le lead est toujours affiché
      await loadLeadDetails(leadId);
    } catch (e) {
      console.error("Erreur validation lead", e);
      alert("Erreur lors de la validation");
    }
  };

  const handleReject = async (leadId: number, comment: string) => {
    if (!user) {
      alert("Impossible de rejeter : utilisateur non connecté.");
      return;
    }

    try {
      const request: CreateValidationRequest = {
        leadId,
        decision: 1, // 1 = No Go
        commentaire: comment,
      };

      console.log("Rejet envoyé :", request);

      await validationService.create(request);
      
      // Recharger les leads et les détails du lead rejeté
      await loadLeadsToValidate();
      
      // Forcer le rechargement des détails
      setLeadDetails(prev => {
        const newMap = new Map(prev);
        newMap.delete(leadId);
        return newMap;
      });
      
      // Recharger les détails si le lead est toujours affiché
      await loadLeadDetails(leadId);
    } catch (e) {
      console.error("Erreur rejet lead", e);
      alert("Erreur lors du rejet");
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

  /**
   * Mapper les données du lead pour le composant
   */
  const mapLeadData = (lead: any): Lead => {
    const detailedLead = leadDetails.get(lead.leadId);
    
    if (detailedLead) {
      // ✅ Utiliser les détails complets si disponibles
      console.log(`✅ Utilisation des détails complets pour le lead ${lead.leadId}`);
      return {
        ...detailedLead,
        id: detailedLead.id,
      } as Lead;
    }
    
    // ⚠️ Sinon, mapper les données basiques
    console.log(`⚠️ Utilisation des données basiques pour le lead ${lead.leadId}`);
    return {
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
      partenaires: lead.leadPartenaires?.map((p: any) => p.partenaire) || [],
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
      validations: lead.validations || [],
    };
  };

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