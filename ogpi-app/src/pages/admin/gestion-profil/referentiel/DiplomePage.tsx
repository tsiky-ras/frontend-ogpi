import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Diplome } from "../../../../types/profil/etude/Diplome.tsx";
const DiplomePage: React.FC = () => {
  return (
    <ConfigEntityPage<Diplome>
      title="Gestion des Diplômes"
      entityLabel="label"
      entityName="Diplôme"
      initialData={[]} 
    />
  );
};

export default DiplomePage;
