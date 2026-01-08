import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Organisme } from "../../../../types/profil/certification/Organisme.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { OrganismeService } from "../../../../services/profil/certifications/OrganismeService.tsx";
const OrganismePage: React.FC = () => {
  const { api } = useAuth();
  const organismeService = new OrganismeService(api);
  return (
    <ConfigEntityPage<Organisme>
      title="Gestion des Organismes"
      entityLabel="label"
      entityName="Organisme"
      service={organismeService}
    />
  );
};

export default OrganismePage;
