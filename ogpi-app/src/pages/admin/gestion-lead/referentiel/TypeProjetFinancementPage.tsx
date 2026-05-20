import React from "react";
import ConfigEntityPage from "../../gestion-profil/referentiel/ConfigEntityPage.tsx";
import { TypeProjetFinancement } from "../../../../types/lead/TypeProjetFinancement.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { TypeProjetFinancementService } from "../../../../services/lead/TypeProjetFinancementService.tsx";

const TypeProjetFinancementPage: React.FC = () => {
  const { api } = useAuth();
  const typeProjetFinancementService = new TypeProjetFinancementService(api);

  return (
    <ConfigEntityPage<TypeProjetFinancement>
      title="Gestion des types de financement"
      entityLabel="label"     
      entityName="Type de financement"
      service={typeProjetFinancementService}
    />
  );
};

export default TypeProjetFinancementPage;
  