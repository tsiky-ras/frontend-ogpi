import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Organisme } from "../../../../types/profil/certification/Organisme.tsx";

const OrganismePage: React.FC = () => {
  return (
    <ConfigEntityPage<Organisme>
      title="Gestion des Organismes"
      entityLabel="label"
      entityName="Organisme"
      initialData={[]} 
    />
  );
};

export default OrganismePage;
