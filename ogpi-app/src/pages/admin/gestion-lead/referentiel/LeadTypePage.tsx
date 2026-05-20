import React from "react";
import ConfigEntityPage from "../../gestion-profil/referentiel/ConfigEntityPage.tsx";
import { LeadType } from "../../../../types/lead/LeadType.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { LeadTypeService } from "../../../../services/lead/LeadTypeService.tsx";

const LeadTypePage: React.FC = () => {
  const { api } = useAuth();
  const leadTypeService = new LeadTypeService(api);

  return (
    <ConfigEntityPage<LeadType>
      title="Gestion des types des opportunités"
      entityLabel="label"     
      entityName="Type d'opportunité"
      service={leadTypeService}
    />
  );
};

export default LeadTypePage;
