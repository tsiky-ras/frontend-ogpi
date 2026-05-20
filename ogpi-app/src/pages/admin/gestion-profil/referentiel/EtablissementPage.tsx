import React, { useMemo } from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Etablissement } from "../../../../types/profil/etude/Etablissement.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { EtablissementService } from "../../../../services/profil/etude/EtablissementService.tsx";

const EtablissementPage: React.FC = () => {
  const { api } = useAuth();
  const etablissementService = useMemo(() => new EtablissementService(api), [api]);

  return (
    <ConfigEntityPage<Etablissement>
      title="Gestion des Établissements"
      entityLabel="label"
      entityName="Établissement"
      service={etablissementService}
    />
  );
};

export default EtablissementPage;
