import React from "react";
import ConfigEntityPage from "../../gestion-profil/referentiel/ConfigEntityPage.tsx";
import { Partenaire } from "../../../../types/lead/Partenaire.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { PartenaireService } from "../../../../services/lead/PartenaireService.tsx";

const PartenairePage: React.FC = () => {
  const { api } = useAuth();
  const partenaireService = new PartenaireService(api);

  return (
    <ConfigEntityPage<Partenaire>
      title="Gestion des types des partenaires"
      entityLabel="name"     
      entityName="Partenaire"
      service={partenaireService}
      extraInputs={[
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Téléphone", type: "tel" }, 
      ]}
      extraColumns={[
        { key: "email", label: "Email" },
        { key: "phone", label: "Téléphone" },
      ]}
    />
  );
};

export default PartenairePage;
  