import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Poste } from "../../../../types/profil/poste/Poste.tsx";

const PostePage: React.FC = () => {
  return (
    <ConfigEntityPage<Poste>
      title="Gestion des Postes"
      entityLabel="label"
      entityName="Poste"
      initialData={[]}
    />
  );
};

export default PostePage;


