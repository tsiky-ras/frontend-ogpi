import React, { useMemo } from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Diplome } from "../../../../types/profil/etude/Diplome.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { DiplomeService } from "../../../../services/profil/etude/DiplomeService.tsx";

const DiplomePage: React.FC = () => {
  
  const { api } = useAuth();
  const diplomeService = useMemo(() => new DiplomeService(api), [api]);
  
  return (
    <ConfigEntityPage<Diplome>
      title="Gestion des Diplômes"
      entityLabel="label"
      entityName="Diplôme"
      service={diplomeService}
    />
  );
};

export default DiplomePage;
