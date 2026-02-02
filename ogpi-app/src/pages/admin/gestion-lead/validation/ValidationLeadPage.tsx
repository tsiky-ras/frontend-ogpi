import React, { useEffect, useMemo, useState } from "react";
import ValidationFormPage from "./ValidationFormPage.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";

const ValidationLeadPage: React.FC = () => {
  const { api } = useAuth();
  const leadService = new LeadService(api);

  const [search, setSearch] = useState<string>("");
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /* ================= LOAD LEADS ================= */
  const loadLeadsToValidate = async () => {
    setLoading(true);
    try {
      const data = await leadService.getAll();
      console.log("Leads fetched for validation:", data);

      // Filtrer uniquement les leads avec statut id = 1 (No Go)
      const leadsToValidate = data.filter(
        (l: any) => l.currentLeadStatus?.leadStatus?.id === 1
      );

      setLeads(leadsToValidate);
    } catch (error) {
      console.error("Erreur chargement leads No Go", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeadsToValidate();
  }, []);

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
    <div className="validation-form-container">
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
      {!loading && filteredLeads.length === 0 && <p className="mt-3">Aucun lead à valider.</p>}

      {!loading &&
        filteredLeads.map((lead: any) => (
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
              }}
              // onValidate={async (comment: string) => {
              //   await leadService.updateStatus(lead.leadId, "Go", comment);
              //   loadLeadsToValidate();
              // }}
              // onReject={async (comment: string) => {
              //   await leadService.updateStatus(lead.leadId, "No Go", comment);
              //   loadLeadsToValidate();
              // }}
            />
          </div>
        ))}
    </div>
  );
};

export default ValidationLeadPage;
