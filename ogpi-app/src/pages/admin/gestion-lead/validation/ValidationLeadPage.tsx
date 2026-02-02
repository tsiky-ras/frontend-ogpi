import React, { useEffect, useMemo, useState } from "react";
import ValidationForm, { LeadValidation } from "./ValidationFormPage.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";

/* ================= COMPONENT ================= */

const ValidationLeadPage: React.FC = () => {
  const { api } = useAuth();
  const leadService = new LeadService(api);

  const [search, setSearch] = useState<string>("");
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  /* ================= EFFECT ================= */

  useEffect(() => {
    loadLeadsToValidate();
  }, []);

  /* ================= DATA ================= */

  const loadLeadsToValidate = async () => {
    setLoading(true);
    try {
      const data = await leadService.getAll();

      const noGoLeads = data.filter(
        (l: any) => l.currentLeadStatus?.label === "No Go"
      );

      setLeads(noGoLeads);
    } catch (error) {
      console.error("Erreur chargement leads No Go", error);
    } finally {
      setLoading(false);
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
    <>
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
        <p className="mt-3">Aucun lead à valider.</p>
      )}

      {!loading &&
        filteredLeads.map((lead: any) => {
          const leadForValidation: LeadValidation = {
            name: lead.leadName,
            reference: lead.leadRef,
            client: lead.client?.name,
            type: lead.type?.label,
            category: lead.category?.label,
            secteur: lead.secteur?.label,
            description: lead.leadDescription,
            internalDeadline: lead.leadInternalDeadLine,
            realDeadline: lead.leadRealDeadLine,
            driveLink: lead.mainDriveFile?.link,
          };

          return (
            <div key={lead.leadId} className="validation-card">
              <ValidationForm
                lead={leadForValidation}
                onValidate={async (comment: string) => {
                  //await leadService.updateStatus(
                    // lead.leadId,
                    // "Go",
                    // comment
                  //);
                  loadLeadsToValidate();
                }}
                onReject={async (comment: string) => {
                  //await leadService.updateStatus(
                    // lead.leadId,
                    // "No Go",
                    // comment
                  //);
                  loadLeadsToValidate();
                }}
              />
            </div>
          );
        })}
    </>
  );
};

export default ValidationLeadPage;
