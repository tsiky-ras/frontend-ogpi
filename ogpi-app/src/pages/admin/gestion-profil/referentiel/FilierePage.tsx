import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Filiere } from "../../../../types/profil/etude/Filiere.tsx";

const FilierePage: React.FC = () => {
  return (
    <ConfigEntityPage<Filiere>
      title="Gestion des Filières"
      entityLabel="label"
      entityName="Filière"
      initialData={[]}
    />
  );
};

export default FilierePage;
