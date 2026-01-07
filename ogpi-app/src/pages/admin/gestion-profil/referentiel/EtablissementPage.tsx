import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Etablissement } from "../../../../types/profil/etude/Etablissement.tsx";
const EtablissementPage: React.FC = () => {
  return (
    <ConfigEntityPage<Etablissement>
      title="Gestion des Établissements"
      entityLabel="label"
      entityName="Établissement"
      initialData={[]} // tu peux mettre des établissements existants ici
    />
  );
};

export default EtablissementPage;
