// src/hooks/useFullLead.ts
import { useAuth } from "../../context/AuthContext.tsx";
import { LeadService } from "../../services/lead/LeadService.tsx";
import { useLeadTechFinDetailsService } from "../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { useState, useEffect } from "react";

export const useFullLead = (leadId?: number) => {
  const { api } = useAuth();
  const techFinService = useLeadTechFinDetailsService(); 
  const [fullLead, setFullLead] = useState<any>(null);

  useEffect(() => {
    if (!leadId) return;

    const load = async () => {
      const leadService = new LeadService(api);

      const lead = await leadService.getById(leadId);
      let techFin = null;

      try {
        techFin = await techFinService.getByLeadId(leadId);
      } catch {}

      setFullLead({
        ...lead,
        ...(techFin || {}),
        technos: techFin?.technos || [],
      });
    };

    load();
  }, [leadId]);

  return fullLead;
};