import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Filiere } from "../../../../types/profil/etude/Filiere.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { FiliereService } from "../../../../services/profil/etude/FiliereService.tsx";

const FilierePage: React.FC = () => {
  const { api } = useAuth();
  const filiereService = new FiliereService(api);

  return (
    <ConfigEntityPage<Filiere>
      title="Gestion des Filières"
      entityLabel="label"
      entityName="Filière"
      service={filiereService}
    />
  );
};

export default FilierePage;
