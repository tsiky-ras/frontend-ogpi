import React from "react";
import ConfigEntityPage from "../../gestion-profil/referentiel/ConfigEntityPage.tsx";
import { LeadStatus } from "../../../../types/lead/LeadStatus.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { LeadStatusService } from "../../../../services/lead/LeadStatusService.tsx";

const LeadStatusPage: React.FC = () => {
  const { api } = useAuth();
  const leadStatusService = new LeadStatusService(api);

  return (
    <ConfigEntityPage<LeadStatus>
      title="Gestion des statuts des opportunités"
      entityLabel="label"     
      entityName="Statut d'opportunité"
      service={leadStatusService}
    />
  );
};

export default LeadStatusPage;
